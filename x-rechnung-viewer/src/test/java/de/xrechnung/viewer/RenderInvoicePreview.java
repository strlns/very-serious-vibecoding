package de.xrechnung.viewer;

import java.awt.Component;
import java.awt.Container;
import java.awt.image.BufferedImage;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import javax.swing.SwingUtilities;

public final class RenderInvoicePreview {
  public static void main(String[] args) throws Exception {
    var file =
        InvoiceFile.open(
            Path.of(args.length > 0 ? args[0] : "fixtures/kosit-01.01a-INVOICE_ubl.xml"));
    var invoice = KositMapper.map(file);
    SwingUtilities.invokeAndWait(
        () -> {
          try {
            var workspace = new InvoiceWorkspace();
            workspace.setSize(1400, 1000);
            workspace.display(file, invoice, "Beispielrechnung");
            for (int i = 0; i < 6; i++) layout(workspace);
            var image = new BufferedImage(1400, 1000, BufferedImage.TYPE_INT_RGB);
            var g = image.createGraphics();
            workspace.printAll(g);
            g.dispose();
            ImageIO.write(
                image,
                "png",
                Path.of(args.length > 1 ? args[1] : "build/preview-invoice.png").toFile());
            var paper = new InvoicePaper();
            paper.display(invoice);
            for (int i = 0; i < 6; i++) {
              paper.setSize(940, paper.getPreferredSize().height);
              layout(paper);
            }
            int height = Math.min(paper.getHeight(), 20000);
            var full = new BufferedImage(940, height, BufferedImage.TYPE_INT_RGB);
            var pg = full.createGraphics();
            paper.printAll(pg);
            pg.dispose();
            ImageIO.write(full, "png", Path.of("build/preview-paper-full.png").toFile());
          } catch (Exception ex) {
            throw new RuntimeException(ex);
          }
        });
  }

  private static void layout(Component c) {
    if (c instanceof Container p) {
      p.doLayout();
      for (var child : p.getComponents()) layout(child);
    }
  }
}
