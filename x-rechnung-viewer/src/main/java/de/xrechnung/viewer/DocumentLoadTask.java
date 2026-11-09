package de.xrechnung.viewer;

import java.util.concurrent.Callable;
import java.util.function.Consumer;
import javax.swing.SwingWorker;

/** XML work runs off the EDT; completion and guaranteed cleanup run on the EDT. */
final class DocumentLoadTask extends SwingWorker<DocumentBatch.Result, Void> {
  private final Callable<DocumentBatch.Result> operation;
  private final Consumer<DocumentBatch.Result> success;
  private final Consumer<Exception> failure;
  private final Runnable finish;

  DocumentLoadTask(
      Callable<DocumentBatch.Result> operation,
      Consumer<DocumentBatch.Result> success,
      Consumer<Exception> failure,
      Runnable finish) {
    this.operation = operation;
    this.success = success;
    this.failure = failure;
    this.finish = finish;
  }

  @Override
  protected DocumentBatch.Result doInBackground() throws Exception {
    return operation.call();
  }

  @Override
  protected void done() {
    try {
      success.accept(get());
    } catch (Exception ex) {
      failure.accept(ex);
    } finally {
      finish.run();
    }
  }
}
