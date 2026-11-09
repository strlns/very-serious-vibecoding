package de.xrechnung.viewer;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import javax.swing.*;

/** Recovery contracts do not repair XML, validate schemas, or calculate invoice values. */
public final class RecoveryTests {
  private static int passed, failed;

  @FunctionalInterface
  interface Checked {
    void run() throws Exception;
  }

  public static void main(String[] args) throws Exception {
    byte[] malformed = "<root>\n  <child></root>".getBytes(StandardCharsets.UTF_8);
    byte[] dtd =
        "<!DOCTYPE r [<!ENTITY x 'do not expand'>]><r>&x;</r>".getBytes(StandardCharsets.UTF_8);
    var fixture = Path.of("fixtures/kosit-01.01a-INVOICE_ubl.xml");
    byte[] good = Files.readAllBytes(fixture);
    Path dir = Files.createTempDirectory(Path.of("build"), "recovery-");
    try {
      Path bad = dir.resolve("broken.xml"),
          blocked = dir.resolve("blocked.xml"),
          valid = dir.resolve("valid.xml");
      Files.write(bad, malformed);
      Files.write(blocked, dtd);
      Files.write(valid, good);
      test(
          "malformed XML reports its source line and column without repair",
          () -> {
            try {
              InvoiceFile.parse(malformed);
              throw new AssertionError("malformed XML accepted");
            } catch (IOException ex) {
              SemanticTests.check(
                  ex.getMessage().contains("Zeile 2") && ex.getMessage().contains("Spalte "),
                  "missing structured source location: " + ex.getMessage());
              SemanticTests.check(
                  ex.getCause() instanceof org.xml.sax.SAXParseException, "parser cause lost");
            }
          });
      test(
          "malformed and blocked files do not prevent a later valid invoice or change any input",
          () -> {
            var result = DocumentBatch.load(List.of(bad, blocked, valid));
            SemanticTests.equal(1, result.loaded().size());
            SemanticTests.equal(2, result.failures().size());
            SemanticTests.equal(valid.toAbsolutePath(), result.loaded().get(0).source());
            SemanticTests.check(
                Arrays.equals(good, result.loaded().get(0).original().originalBytes()),
                "good snapshot changed");
            SemanticTests.check(
                Arrays.equals(malformed, Files.readAllBytes(bad)), "broken source changed");
            SemanticTests.check(
                Arrays.equals(dtd, Files.readAllBytes(blocked)), "blocked source changed");
          });
      test(
          "missing mandatory invoice data remains missing and inspectable",
          () -> {
            byte[] bytes =
                ("<Invoice xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:Invoice-2\"/>")
                    .getBytes(StandardCharsets.UTF_8);
            var original = InvoiceFile.parse(bytes);
            var invoice = KositMapper.map(original);
            SemanticTests.check(!invoice.gaps().isEmpty(), "missing invoice number not reported");
            SemanticTests.equal("", invoice.root().value("BT-1"));
            SemanticTests.equal("", invoice.root().value("BT-115"));
            inspect(original, invoice);
            SemanticTests.check(
                Arrays.equals(bytes, original.originalBytes()), "incomplete input changed");
          });
      test(
          "invalid field text remains in the original and never becomes an invented amount",
          () -> {
            String xml = new String(good, StandardCharsets.UTF_8);
            SemanticTests.check(
                xml.contains("2016-04-04") && xml.contains("336.9"), "unexpected pinned fixture");
            byte[] bytes =
                xml.replace("2016-04-04", "not-a-date")
                    .replace("336.9", "not-a-decimal")
                    .getBytes(StandardCharsets.UTF_8);
            var original = InvoiceFile.parse(bytes);
            var invoice = KositMapper.map(original);
            String payable = invoice.root().value("BT-115");
            SemanticTests.check(
                payable.isEmpty() || payable.equals("not-a-decimal"),
                "invented payable: " + payable);
            if (payable.isEmpty())
              SemanticTests.check(!invoice.gaps().isEmpty(), "failed mapping without diagnostic");
            inspect(original, invoice);
            SemanticTests.check(
                Arrays.equals(bytes, original.originalBytes()), "invalid values were repaired");
          });
      test(
          "asynchronous mixed-file failure preserves open tabs, stops activity and permits the next"
              + " load",
          () -> {
            var initial = DocumentBatch.load(List.of(valid)).loaded().get(0);
            var desk = new AtomicReference<InvoiceDesk>();
            var activity = new AtomicReference<BusyIndicator>();
            SwingUtilities.invokeAndWait(
                () -> {
                  desk.set(new InvoiceDesk(() -> {}));
                  desk.get().addDocument(initial);
                  activity.set(new BusyIndicator());
                });
            runLoad(List.of(bad, valid, blocked), desk.get(), activity.get(), 1, 2);
            SwingUtilities.invokeAndWait(
                () -> {
                  SemanticTests.equal(2, desk.get().documentCount());
                  desk.get().select(0);
                  SemanticTests.check(
                      desk.get().active() == initial, "old document replaced after failed import");
                });
            runLoad(List.of(valid), desk.get(), activity.get(), 1, 0);
            SwingUtilities.invokeAndWait(() -> SemanticTests.equal(3, desk.get().documentCount()));
          });
    } finally {
      try (var paths = Files.list(dir)) {
        for (var p : paths.toList()) Files.delete(p);
      }
      Files.delete(dir);
    }
    System.out.println("RESULT: " + passed + " recovery contracts passed, " + failed + " failed");
    if (failed != 0) System.exit(1);
  }

  private static void inspect(InvoiceFile original, SemanticInvoice invoice) throws Exception {
    var error = new AtomicReference<Throwable>();
    SwingUtilities.invokeAndWait(
        () -> {
          try {
            var workspace = new InvoiceWorkspace();
            workspace.display(original, invoice, "invalid.xml");
            SemanticTests.check(
                workspace.disclaimerText().contains("nicht zertifiziert"), "warning missing");
          } catch (Throwable t) {
            error.set(t);
          }
        });
    if (error.get() != null) throw new AssertionError(error.get());
  }

  private static void runLoad(
      java.util.List<Path> paths,
      InvoiceDesk desk,
      BusyIndicator activity,
      int loaded,
      int rejected)
      throws Exception {
    var done = new CountDownLatch(1);
    var error = new AtomicReference<Throwable>();
    SwingUtilities.invokeAndWait(
        () -> {
          activity.setBusy(true, "XML wird verarbeitet …");
          new DocumentLoadTask(
                  () -> DocumentBatch.load(paths),
                  result -> {
                    try {
                      SemanticTests.equal(loaded, result.loaded().size());
                      SemanticTests.equal(rejected, result.failures().size());
                      result.loaded().forEach(desk::addDocument);
                    } catch (Throwable t) {
                      error.set(t);
                    }
                  },
                  error::set,
                  () -> {
                    activity.setBusy(false, "");
                    if (activity.animating() || activity.isVisible())
                      error.set(new AssertionError("busy after completion"));
                    done.countDown();
                  })
              .execute();
        });
    SemanticTests.check(done.await(10, TimeUnit.SECONDS), "load did not finish");
    if (error.get() != null) throw new AssertionError(error.get());
  }

  private static void test(String name, Checked test) {
    try {
      test.run();
      passed++;
      System.out.println("PASS " + name);
    } catch (Throwable ex) {
      failed++;
      System.out.println("FAIL " + name + ": " + ex);
    }
  }
}
