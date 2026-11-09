package de.xrechnung.viewer;

import java.awt.*;
import java.awt.event.MouseEvent;
import java.nio.file.*;
import java.util.*;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import javax.swing.*;

/** Interaction and quiescence contracts, not pixel/layout design tests. */
public final class InteractionTests {
  public static void main(String[] args) throws Exception {
    Path dir = Files.createTempDirectory(Path.of("build"), "identical-");
    Path first = dir.resolve("eins.xml"), second = dir.resolve("kopie.xml");
    Files.copy(Path.of("fixtures/kosit-01.01a-INVOICE_ubl.xml"), first);
    Files.copy(first, second);
    var loaded = DocumentBatch.load(List.of(first, second));
    SemanticTests.equal(2, loaded.loaded().size());
    SemanticTests.equal(
        loaded.loaded().get(0).original().sha256(), loaded.loaded().get(1).original().sha256());
    var error = new AtomicReference<Throwable>();
    SwingUtilities.invokeAndWait(
        () -> {
          try {
            var desk = new InvoiceDesk(() -> {});
            loaded.loaded().forEach(desk::addDocument);
            desk.setSize(1200, 850);
            layout(desk);
            var tabs = (JTabbedPane) desk.getComponent(1);
            for (int round = 0; round < 12; round++) {
              int index = round % 2;
              var header = tabs.getTabComponentAt(index);
              var filename = findLabel(header);
              filename.dispatchEvent(
                  new MouseEvent(
                      filename,
                      MouseEvent.MOUSE_PRESSED,
                      System.currentTimeMillis(),
                      0,
                      2,
                      2,
                      1,
                      false,
                      MouseEvent.BUTTON1));
              SemanticTests.check(
                  desk.active() == loaded.loaded().get(index),
                  "header click did not select independent snapshot " + index);
              layout(desk);
            }
            System.out.println(
                "PASS actual header presses switch byte-identical copies independently");
          } catch (Throwable ex) {
            error.set(ex);
            System.out.println("FAIL header input: " + ex.getMessage());
          }
          try {
            var paper = new InvoicePaper();
            paper.display(loaded.loaded().get(0).invoice());
            paper.setSize(1040, 3000);
            layout(paper);
            var before = bounds(paper);
            var manager = new CountingRepaints();
            var original = RepaintManager.currentManager(paper);
            RepaintManager.setCurrentManager(manager);
            try {
              for (int n = 0; n < 30; n++) measure(paper);
              System.out.println(
                  "TRACE preferred queries=30 invalidations=" + manager.invalidations);
              SemanticTests.check(
                  before.equals(bounds(paper)), "size queries changed component bounds");
              SemanticTests.equal(0, manager.invalidations);
            } finally {
              RepaintManager.setCurrentManager(original);
            }
            System.out.println(
                "PASS idle preferred-size queries do not resize or invalidate descendants");
          } catch (Throwable ex) {
            if (error.get() == null) error.set(ex);
            System.out.println("FAIL measurement purity: " + ex.getMessage());
          }
        });
    Files.delete(second);
    Files.delete(first);
    Files.delete(dir);
    if (error.get() != null) throw new AssertionError(error.get());
    System.out.println("RESULT: 2 interaction contracts passed");
  }

  static class CountingRepaints extends RepaintManager {
    int invalidations;

    @Override
    public void addInvalidComponent(JComponent c) {
      invalidations++;
      super.addInvalidComponent(c);
    }
  }

  static Component findLabel(Component c) {
    if (c instanceof FullText.Label) return c;
    if (c instanceof Container parent)
      for (var child : parent.getComponents()) {
        var found = findLabel(child);
        if (found != null) return found;
      }
    return null;
  }

  static Map<Component, Rectangle> bounds(Component c) {
    var result = new HashMap<Component, Rectangle>();
    collect(c, result);
    return result;
  }

  private static void collect(Component c, Map<Component, Rectangle> out) {
    out.put(c, c.getBounds());
    if (c instanceof Container p) for (var child : p.getComponents()) collect(child, out);
  }

  static void measure(Component c) {
    c.getPreferredSize();
    if (c instanceof Container p) for (var child : p.getComponents()) measure(child);
  }

  static void layout(Component c) {
    if (c instanceof Container p) {
      p.doLayout();
      for (var child : p.getComponents()) layout(child);
    }
  }
}
