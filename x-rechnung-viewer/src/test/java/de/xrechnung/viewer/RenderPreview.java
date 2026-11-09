package de.xrechnung.viewer;

import java.awt.Component;
import java.awt.Container;
import java.awt.image.BufferedImage;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import javax.swing.SwingUtilities;

/** Optional headless layout aid; not a substitute for target-platform GUI acceptance. */
public final class RenderPreview {
    public static void main(String[] args) throws Exception {
        var file = InvoiceFile.open(Path.of("fixtures/kosit-01.01a-INVOICE_ubl.xml"));
        SwingUtilities.invokeAndWait(() -> {
            try {
                var panel = new InvoicePanel(); panel.setSize(1280, 760); panel.display(file, "KoSIT-Beispielrechnung (nicht validiert)");
                var image = new BufferedImage(1280, 760 * 4, BufferedImage.TYPE_INT_RGB);
                var graphics = image.createGraphics();
                for (int i = 0; i < 4; i++) {
                    panel.selectView(i); layout(panel);
                    var page = graphics.create(0, 760 * i, 1280, 760);
                    panel.printAll(page); page.dispose();
                }
                graphics.dispose(); ImageIO.write(image, "png", Path.of(args.length == 0 ? "build/preview.png" : args[0]).toFile());
            } catch (Exception ex) { throw new RuntimeException(ex); }
        });
    }
    private static void layout(Component component) {
        if (component instanceof Container container) {
            container.doLayout();
            for (Component child : container.getComponents()) layout(child);
        }
    }
}
