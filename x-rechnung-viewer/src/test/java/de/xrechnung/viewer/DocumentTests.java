package de.xrechnung.viewer;

import java.awt.datatransfer.*;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import javax.swing.*;

public final class DocumentTests {
  private static int passed, failed;

  @FunctionalInterface
  interface Checked {
    void run() throws Exception;
  }

  public static void main(String[] args) throws Exception {
    test(
        "batch keeps file order and separate snapshots",
        () -> {
          var r = DocumentBatch.load(paths());
          SemanticTests.equal(2, r.loaded().size());
          SemanticTests.equal(0, r.failures().size());
          SemanticTests.equal(
              paths().get(0).toAbsolutePath().normalize(), r.loaded().get(0).source());
          SemanticTests.check(
              r.loaded().get(0).original() != r.loaded().get(1).original(), "shared originals");
        });
    test(
        "one failed file does not discard successful files",
        () -> {
          var r =
              DocumentBatch.load(
                  List.of(paths().get(0), Path.of("fixtures/missing.xml"), paths().get(1)));
          SemanticTests.equal(2, r.loaded().size());
          SemanticTests.equal(1, r.failures().size());
        });
    test(
        "non XML paths and folders are explicit failures",
        () -> {
          var r = DocumentBatch.load(List.of(Path.of("README.md"), Path.of("fixtures")));
          SemanticTests.equal(0, r.loaded().size());
          SemanticTests.equal(2, r.failures().size());
        });
    var error = new AtomicReference<Throwable>();
    SwingUtilities.invokeAndWait(
        () -> {
          try {
            onEdt();
          } catch (Throwable t) {
            error.set(t);
          }
        });
    if (error.get() != null) throw new AssertionError("document UI contracts", error.get());
    System.out.println("RESULT: " + passed + " document contracts passed, " + failed + " failed");
    if (failed > 0) System.exit(1);
  }

  private static void onEdt() throws Exception {
    test(
        "XML drop accepts copy actions and refuses move-only",
        () -> {
          SemanticTests.check(XmlFileDrop.copyAllowed(TransferHandler.COPY), "copy refused");
          SemanticTests.check(
              XmlFileDrop.copyAllowed(TransferHandler.COPY_OR_MOVE), "copy-or-move refused");
          SemanticTests.check(!XmlFileDrop.copyAllowed(TransferHandler.MOVE), "move-only accepted");
        });
    var f = InvoiceFile.open(paths().get(0));
    var invoice = KositMapper.map(f);
    var a = new DocumentBatch.Loaded(paths().get(0), f, invoice);
    var b = new DocumentBatch.Loaded(paths().get(1), InvoiceFile.open(paths().get(1)), invoice);
    test(
        "tabs retain selection-specific original",
        () -> {
          var d = new InvoiceDesk(() -> {});
          d.addDocument(a);
          d.addDocument(b);
          SemanticTests.equal(2, d.documentCount());
          d.select(0);
          SemanticTests.check(d.active() == a, "wrong active snapshot A");
          d.select(1);
          SemanticTests.check(d.active() == b, "wrong active snapshot B");
          d.closeSelected();
          SemanticTests.check(d.active() == a, "wrong remaining snapshot");
          d.closeSelected();
          SemanticTests.check(d.active() == null, "active document after closing all");
        });
    test(
        "display mode is global for existing and new tabs",
        () -> {
          var d = new InvoiceDesk(() -> {});
          d.addDocument(a);
          SemanticTests.equal(InvoiceMode.PAPER, d.mode());
          d.setMode(InvoiceMode.TABLE);
          d.addDocument(b);
          SemanticTests.equal(InvoiceMode.TABLE, d.mode());
          SemanticTests.equal(InvoiceMode.TABLE, d.workspace(0).mode());
          SemanticTests.equal(InvoiceMode.TABLE, d.workspace(1).mode());
          d.select(0);
          SemanticTests.equal(InvoiceMode.TABLE, d.mode());
          d.setMode(InvoiceMode.PAPER);
          SemanticTests.equal(InvoiceMode.PAPER, d.workspace(1).mode());
          d.setMode(InvoiceMode.TABLE);
          d.closeSelected();
          d.closeSelected();
          d.addDocument(a);
          SemanticTests.equal(InvoiceMode.TABLE, d.mode());
          SemanticTests.equal(InvoiceMode.TABLE, d.workspace(0).mode());
        });
    test(
        "file drop delivers every local file in order",
        () -> {
          var root = new JPanel();
          var child = new JTextArea("original text");
          root.add(child);
          var received = new AtomicReference<List<Path>>();
          XmlFileDrop.install(
              root,
              received::set,
              () -> false,
              msg -> {
                throw new AssertionError(msg);
              });
          var transfer = fileList(paths());
          SemanticTests.check(
              child
                  .getTransferHandler()
                  .importData(new TransferHandler.TransferSupport(child, transfer)),
              "drop rejected");
          SemanticTests.equal(paths(), received.get());
        });
    test(
        "busy state refuses drop without importing",
        () -> {
          var panel = new JPanel();
          var received = new AtomicReference<List<Path>>();
          XmlFileDrop.install(panel, received::set, () -> true, msg -> {});
          SemanticTests.check(
              !panel
                  .getTransferHandler()
                  .importData(new TransferHandler.TransferSupport(panel, fileList(paths()))),
              "busy drop accepted");
          SemanticTests.check(received.get() == null, "busy import delivered files");
        });
    test(
        "drop integration preserves plain-text copy",
        () -> {
          var area = new JTextArea("Grüße <html>original</html>");
          area.selectAll();
          XmlFileDrop.install(area, p -> {}, () -> false, msg -> {});
          var clipboard = new Clipboard("private-test");
          area.getTransferHandler().exportToClipboard(area, clipboard, TransferHandler.COPY);
          SemanticTests.equal(area.getText(), clipboard.getData(DataFlavor.stringFlavor));
        });
  }

  private static List<Path> paths() {
    return List.of(
        Path.of("fixtures/kosit-01.01a-INVOICE_ubl.xml"),
        Path.of("fixtures/kosit-01.01a-INVOICE_uncefact.xml"));
  }

  private static Transferable fileList(List<Path> paths) {
    return new Transferable() {
      public DataFlavor[] getTransferDataFlavors() {
        return new DataFlavor[] {DataFlavor.javaFileListFlavor};
      }

      public boolean isDataFlavorSupported(DataFlavor f) {
        return f.equals(DataFlavor.javaFileListFlavor);
      }

      public Object getTransferData(DataFlavor f) throws UnsupportedFlavorException {
        if (!isDataFlavorSupported(f)) throw new UnsupportedFlavorException(f);
        return paths.stream().map(Path::toFile).toList();
      }
    };
  }

  private static void test(String name, Checked body) {
    try {
      body.run();
      passed++;
      System.out.println("PASS " + name);
    } catch (Throwable t) {
      failed++;
      System.out.println("FAIL " + name + ": " + t);
    }
  }
}
