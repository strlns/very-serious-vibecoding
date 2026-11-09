package de.xrechnung.viewer;

import java.awt.datatransfer.Clipboard;
import java.awt.datatransfer.DataFlavor;
import java.awt.event.InputEvent;
import java.nio.file.Path;
import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import javax.swing.JComponent;
import javax.swing.TransferHandler;

public final class XmlFileDrop {
  static boolean copyAllowed(int actions) {
    return (actions & TransferHandler.COPY) != 0;
  }

  public static void install(
      JComponent root,
      Consumer<List<Path>> accept,
      BooleanSupplier blocked,
      Consumer<String> errors) {
    if (!(root.getTransferHandler() instanceof FilesHandler))
      root.setTransferHandler(new FilesHandler(root.getTransferHandler(), accept, blocked, errors));
    for (var child : root.getComponents())
      if (child instanceof JComponent component) install(component, accept, blocked, errors);
  }

  private static final class FilesHandler extends TransferHandler {
    private static final long serialVersionUID = 1L;
    private final TransferHandler previous;
    private final Consumer<List<Path>> accept;
    private final BooleanSupplier blocked;
    private final Consumer<String> errors;

    FilesHandler(
        TransferHandler previous,
        Consumer<List<Path>> accept,
        BooleanSupplier blocked,
        Consumer<String> errors) {
      this.previous = previous;
      this.accept = accept;
      this.blocked = blocked;
      this.errors = errors;
    }

    @Override
    public boolean canImport(TransferSupport support) {
      if (!support.isDataFlavorSupported(DataFlavor.javaFileListFlavor))
        return previous != null && previous.canImport(support);
      if (blocked.getAsBoolean()) return false;
      if (support.isDrop()) {
        if (!copyAllowed(support.getSourceDropActions())) return false;
        support.setDropAction(TransferHandler.COPY);
      }
      return true;
    }

    @Override
    public boolean importData(TransferSupport support) {
      if (!support.isDataFlavorSupported(DataFlavor.javaFileListFlavor))
        return previous != null && previous.importData(support);
      if (!canImport(support)) return false;
      try {
        Object data = support.getTransferable().getTransferData(DataFlavor.javaFileListFlavor);
        if (!(data instanceof List<?> list)
            || list.isEmpty()
            || list.stream().anyMatch(v -> !(v instanceof java.io.File))) return false;
        accept.accept(list.stream().map(v -> ((java.io.File) v).toPath()).toList());
        return true;
      } catch (Exception ex) {
        errors.accept("Dateien konnten nicht übernommen werden: " + ex.getMessage());
        return false;
      }
    }

    @Override
    public int getSourceActions(JComponent c) {
      return previous == null ? NONE : previous.getSourceActions(c);
    }

    @Override
    public void exportToClipboard(JComponent c, Clipboard clipboard, int action) {
      if (previous != null) previous.exportToClipboard(c, clipboard, action);
    }

    @Override
    public void exportAsDrag(JComponent c, InputEvent event, int action) {
      if (previous != null) previous.exportAsDrag(c, event, action);
    }
  }

  private XmlFileDrop() {}
}
