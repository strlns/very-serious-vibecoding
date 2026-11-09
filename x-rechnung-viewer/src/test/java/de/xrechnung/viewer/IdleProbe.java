package de.xrechnung.viewer;

import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import java.lang.management.ManagementFactory;
import java.nio.file.*;
import java.util.List;
import java.util.concurrent.atomic.*;
import javax.swing.*;

/** Optional runtime trace. --window also runs real Robot clicks on a local desktop. */
public final class IdleProbe {
  private static final class Trace extends RepaintManager {
    final AtomicLong invalid = new AtomicLong(), dirty = new AtomicLong();

    @Override
    public void addInvalidComponent(JComponent c) {
      invalid.incrementAndGet();
      super.addInvalidComponent(c);
    }

    @Override
    public void addDirtyRegion(JComponent c, int x, int y, int w, int h) {
      dirty.incrementAndGet();
      super.addDirtyRegion(c, x, y, w, h);
    }
  }

  public static void main(String[] args) throws Exception {
    boolean window = args.length > 0 && args[0].equals("--window");
    if (window && GraphicsEnvironment.isHeadless())
      throw new IllegalStateException("--window requires a desktop");
    Path temp = Files.createTempDirectory(Path.of("build"), "idle-probe-");
    Path first = temp.resolve("rechnung.xml"), second = temp.resolve("rechnung-kopie.xml");
    Files.copy(Path.of("fixtures/kosit-01.01a-INVOICE_ubl.xml"), first);
    Files.copy(first, second);
    long started = System.nanoTime();
    var batch = DocumentBatch.load(List.of(first, second));
    SemanticTests.equal(2, batch.loaded().size());
    System.out.printf(
        "LOAD two byte-identical files: %.3f s; independent original snapshots=%s%n",
        (System.nanoTime() - started) / 1e9,
        batch.loaded().get(0).original() != batch.loaded().get(1).original());
    var trace = new Trace();
    var deskRef = new AtomicReference<InvoiceDesk>();
    var frameRef = new AtomicReference<JFrame>();
    var edt = new AtomicLong();
    var heartbeat = new AtomicReference<javax.swing.Timer>();
    try {
      SwingUtilities.invokeAndWait(
          () -> {
            edt.set(Thread.currentThread().getId());
            if (!window) {
              // Without a Window, AWT otherwise terminates the EDT after one second of inactivity.
              // This probe-only empty heartbeat keeps the measured thread alive; it is not app
              // code.
              var pulse = new javax.swing.Timer(250, e -> {});
              heartbeat.set(pulse);
              pulse.start();
            }
            if (window) {
              try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
              } catch (Exception ex) {
                throw new RuntimeException(ex);
              }
            }
            RepaintManager.setCurrentManager(trace);
            var desk = new InvoiceDesk(() -> {});
            deskRef.set(desk);
            batch.loaded().forEach(desk::addDocument);
            desk.setSize(1200, 850);
            if (window) {
              var frame = new JFrame("XRechnung · Idle trace");
              frameRef.set(frame);
              frame.setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
              frame.add(desk);
              frame.setSize(1200, 850);
              frame.setVisible(true);
            }
            InteractionTests.layout(desk);
          });
      Robot robot = window ? new Robot() : null;
      for (int n = 0; n < 30; n++) {
        final int index = n % 2;
        var target = new AtomicReference<Component>();
        var point = new AtomicReference<Point>();
        SwingUtilities.invokeAndWait(
            () -> {
              var tabs = (JTabbedPane) deskRef.get().getComponent(1);
              var label = InteractionTests.findLabel(tabs.getTabComponentAt(index));
              target.set(label);
              if (window) {
                Point p = label.getLocationOnScreen();
                p.translate(4, label.getHeight() / 2);
                point.set(p);
              }
            });
        if (window) {
          robot.mouseMove(point.get().x, point.get().y);
          robot.mousePress(InputEvent.BUTTON1_DOWN_MASK);
          robot.mouseRelease(InputEvent.BUTTON1_DOWN_MASK);
          robot.waitForIdle();
        }
        SwingUtilities.invokeAndWait(
            () -> {
              if (!window)
                target
                    .get()
                    .dispatchEvent(
                        new MouseEvent(
                            target.get(),
                            MouseEvent.MOUSE_PRESSED,
                            System.currentTimeMillis(),
                            0,
                            2,
                            2,
                            1,
                            false,
                            MouseEvent.BUTTON1));
              var desk = deskRef.get();
              SemanticTests.check(
                  desk.active() == batch.loaded().get(index), "incorrect selected original");
              if (!window) {
                InteractionTests.layout(desk);
                var image = new BufferedImage(1200, 850, BufferedImage.TYPE_INT_RGB);
                var graphics = image.createGraphics();
                desk.printAll(graphics);
                graphics.dispose();
              }
            });
      }
      System.out.println(
          "SWITCH 30 header clicks: correct original selected every time; mode="
              + (window ? "native window/Robot" : "headless Swing dispatch/render"));
      Thread.sleep(1200); // Drain startup/component events; outside the EDT.
      var bean = ManagementFactory.getThreadMXBean();
      if (bean.isThreadCpuTimeSupported() && !bean.isThreadCpuTimeEnabled())
        bean.setThreadCpuTimeEnabled(true);
      long cpu = bean.getThreadCpuTime(edt.get()),
          dirty = trace.dirty.get(),
          invalid = trace.invalid.get();
      Thread.sleep(3000);
      long elapsedCpu = bean.getThreadCpuTime(edt.get()) - cpu;
      System.out.printf(
          "IDLE 3 s: EDT CPU %.3f ms; dirty requests=%d; invalidation requests=%d%n",
          elapsedCpu / 1e6, trace.dirty.get() - dirty, trace.invalid.get() - invalid);
      var info = bean.getThreadInfo(edt.get(), 12);
      if (info == null || cpu < 0) throw new IllegalStateException("EDT CPU sample unavailable");
      System.out.println("EDT state=" + info.getThreadState());
      for (var element : info.getStackTrace()) System.out.println("  at " + element);
      if (!window)
        System.out.println(
            "Probe-only empty EDT heartbeat: 250 ms; no production animation active.");
      System.out.println(
          "Scope: a headless trace does not reproduce Aqua, native window validation or Intel-Mac"
              + " thermals.");
    } finally {
      SwingUtilities.invokeAndWait(
          () -> {
            if (heartbeat.get() != null) heartbeat.get().stop();
            if (frameRef.get() != null) frameRef.get().dispose();
          });
      Files.deleteIfExists(second);
      Files.deleteIfExists(first);
      Files.deleteIfExists(temp);
    }
  }
}
