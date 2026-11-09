package de.xrechnung.viewer;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.nio.file.Path;
import java.util.List;
import javax.imageio.ImageIO;
import javax.swing.*;

public final class RenderDesktopPreview {
  public static void main(String[] args) throws Exception {
    var loaded =
        DocumentBatch.load(
            List.of(
                Path.of("fixtures/kosit-01.01a-INVOICE_ubl.xml"),
                Path.of("fixtures/max-3.0.1-creditnote.xml")));
    SwingUtilities.invokeAndWait(
        () -> {
          try {
            var desk = new InvoiceDesk(() -> {});
            for (var d : loaded.loaded()) desk.addDocument(d);
            // Presentation-only path aliases exercise long tab labels and overflow; source bytes
            // are unchanged.
            for (int i = 0; i < 5; i++) {
              var d = loaded.loaded().get(0);
              desk.addDocument(
                  new DocumentBatch.Loaded(
                      Path.of(
                          "sehr_langer_Dateiname_mit_vielen_Informationen_zur_Rechnung_"
                              + i
                              + ".xml"),
                      d.original(),
                      d.invoice()));
            }
            desk.select(2);
            var root = new JPanel(new BorderLayout());
            root.setSize(1460, 1000);
            var toolbar = new JToolBar();
            toolbar.setFloatable(false);
            toolbar.add(new JButton("XML öffnen …"));
            toolbar.add(new JButton("Originalkopie speichern …"));
            var validate = new JButton("Validieren");
            validate.setEnabled(false);
            toolbar.add(validate);
            toolbar.addSeparator();
            toolbar.add(new JLabel("Ansicht: "));
            var modes = new JComboBox<>(InvoiceMode.values());
            modes.setMaximumSize(new Dimension(140, modes.getPreferredSize().height));
            modes.addActionListener(e -> desk.setMode((InvoiceMode) modes.getSelectedItem()));
            toolbar.add(modes);
            root.add(toolbar, BorderLayout.NORTH);
            root.add(desk, BorderLayout.CENTER);
            var status = new JLabel("7 Rechnungen · 01.01a-INVOICE_ubl.xml · Nicht validiert");
            status.setBorder(BorderFactory.createEmptyBorder(3, 10, 5, 10));
            status.setFont(status.getFont().deriveFont(11f));
            var footer = new JPanel(new BorderLayout());
            var activity = new BusyIndicator();
            footer.add(status, BorderLayout.CENTER);
            footer.add(activity, BorderLayout.EAST);
            root.add(footer, BorderLayout.SOUTH);
            for (var mode : InvoiceMode.values()) {
              modes.setSelectedItem(mode);
              for (int i = 0; i < 7; i++) layout(root);
              var image = new BufferedImage(1460, 1000, BufferedImage.TYPE_INT_RGB);
              var g = image.createGraphics();
              root.printAll(g);
              g.dispose();
              ImageIO.write(
                  image,
                  "png",
                  Path.of("build/preview-0.6-" + mode.name().toLowerCase() + ".png").toFile());
            }
            modes.setSelectedItem(InvoiceMode.PAPER);
            activity.setBusy(true, "XML wird verarbeitet …");
            for (int i = 0; i < 7; i++) layout(root);
            var busyImage = new BufferedImage(1460, 1000, BufferedImage.TYPE_INT_RGB);
            var busyGraphics = busyImage.createGraphics();
            root.printAll(busyGraphics);
            busyGraphics.dispose();
            activity.setBusy(false, "");
            ImageIO.write(busyImage, "png", Path.of("build/preview-0.6-loading.png").toFile());
            expandDetails(root);
            for (int i = 0; i < 7; i++) layout(root);
            scrollPaper(root);
            var expanded = new BufferedImage(1460, 1000, BufferedImage.TYPE_INT_RGB);
            var expandedGraphics = expanded.createGraphics();
            root.printAll(expandedGraphics);
            expandedGraphics.dispose();
            ImageIO.write(expanded, "png", Path.of("build/preview-0.6-details.png").toFile());
          } catch (Exception ex) {
            throw new RuntimeException(ex);
          }
        });
  }

  private static void expandDetails(Component c) {
    if (c instanceof JToggleButton button
        && button.getText().equals("Alle Rechnungsangaben anzeigen")) button.doClick();
    if (c instanceof Container p) for (var child : p.getComponents()) expandDetails(child);
  }

  private static void scrollPaper(Component c) {
    if (c instanceof InvoicePaper paper) {
      var scroll = (JScrollPane) SwingUtilities.getAncestorOfClass(JScrollPane.class, paper);
      if (scroll != null) scroll.getVerticalScrollBar().setValue(1250);
    }
    if (c instanceof Container p) for (var child : p.getComponents()) scrollPaper(child);
  }

  private static void layout(Component c) {
    if (c instanceof Container p) {
      p.doLayout();
      for (var child : p.getComponents()) layout(child);
    }
  }
}
