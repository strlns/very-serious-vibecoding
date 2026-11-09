package de.xrechnung.viewer;

import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import javax.swing.*;

public final class AsyncLoadTests {
  public static void main(String[] args) throws Exception {
    for (boolean fail : new boolean[] {false, true}) verify(fail);
    System.out.println("RESULT: 2 asynchronous activity contracts passed");
  }

  private static void verify(boolean fail) throws Exception {
    var entered = new CountDownLatch(1);
    var release = new CountDownLatch(1);
    var complete = new CountDownLatch(1);
    var error = new AtomicReference<Throwable>();
    var indicator = new AtomicReference<BusyIndicator>();
    var callbacks = new AtomicInteger();
    SwingUtilities.invokeAndWait(
        () -> {
          var busy = new BusyIndicator();
          indicator.set(busy);
          SemanticTests.check(!busy.animating(), "idle animation running");
          busy.setBusy(true, "XML wird verarbeitet …");
          new DocumentLoadTask(
                  () -> {
                    if (SwingUtilities.isEventDispatchThread())
                      throw new AssertionError("XML work on EDT");
                    entered.countDown();
                    if (!release.await(5, TimeUnit.SECONDS))
                      throw new AssertionError("worker not released");
                    if (fail) throw new java.io.IOException("expected test failure");
                    return new DocumentBatch.Result(List.of(), List.of());
                  },
                  result -> {
                    if (fail || !SwingUtilities.isEventDispatchThread())
                      error.set(new AssertionError("wrong success callback"));
                    callbacks.incrementAndGet();
                  },
                  failure -> {
                    if (!fail || !SwingUtilities.isEventDispatchThread())
                      error.set(new AssertionError("wrong failure callback"));
                    callbacks.incrementAndGet();
                  },
                  () -> {
                    try {
                      SemanticTests.check(
                          SwingUtilities.isEventDispatchThread(), "cleanup off EDT");
                      busy.setBusy(false, "");
                      SemanticTests.check(
                          !busy.animating() && !busy.isVisible(),
                          "idle indicator/timer remains active");
                    } catch (Throwable t) {
                      error.set(t);
                    }
                    complete.countDown();
                  })
              .execute();
        });
    try {
      SemanticTests.check(entered.await(3, TimeUnit.SECONDS), "worker never started");
      SwingUtilities.invokeAndWait(
          () -> {
            // This heartbeat must run while the XML worker remains blocked.
            SemanticTests.check(
                indicator.get().animating() && indicator.get().isVisible(),
                "missing asynchronous activity");
          });
      release.countDown();
      SemanticTests.check(complete.await(3, TimeUnit.SECONDS), "completion/cleanup missing");
      if (error.get() != null) throw new AssertionError(error.get());
      SemanticTests.equal(1, callbacks.get());
    } finally {
      release.countDown();
      SwingUtilities.invokeAndWait(() -> indicator.get().setBusy(false, ""));
    }
    System.out.println(
        "PASS background work keeps EDT responsive; activity cleans up on "
            + (fail ? "failure" : "success"));
  }
}
