package de.xrechnung.viewer;

import java.awt.*;
import javax.swing.*;

/** Bounded two-line tab; long text cannot consume the entire tab strip. */
final class InvoiceTabHeader extends JPanel {
  private static final long serialVersionUID = 1L;
  private final FullText.Label filename;
  private final JPanel metadata;
  private final JButton close;

  InvoiceTabHeader(
      DocumentBatch.Loaded document,
      Runnable closeAction,
      Runnable activate,
      java.util.function.Consumer<String> hover) {
    super(new BorderLayout(8, 0));
    setOpaque(false);
    setBorder(BorderFactory.createEmptyBorder(3, 3, 3, 0));
    String name = document.source().getFileName().toString();
    String summary = summary(document);
    filename = new FullText.Label(name, 36);
    filename.setFont(filename.getFont().deriveFont(Font.BOLD));
    metadata = new JPanel(new GridLayout(1, 3, 3, 0));
    metadata.setOpaque(false);
    var root = document.invoice().root();
    for (String part :
        new String[] {
          "Nr. " + root.value("BT-1"),
          InvoiceFormat.money(root.value("BT-115"), root.value("BT-5")),
          InvoiceFormat.date(root.value("BT-2"))
        }) {
      var item = new FullText.Label(part, 32);
      item.setFont(item.getFont().deriveFont(Math.max(9f, filename.getFont().getSize2D() - 2)));
      metadata.add(item);
    }
    var text = new JPanel(new GridLayout(2, 1, 0, 0));
    text.setOpaque(false);
    text.add(filename);
    text.add(metadata);
    add(text, BorderLayout.CENTER);
    close = new JButton();
    // No text: Aqua can replace a tiny text button with an ellipsis despite empty margins.
    close.setUI(new javax.swing.plaf.basic.BasicButtonUI());
    close.setIcon(new CloseIcon());
    close.setFocusable(false);
    close.setBorderPainted(false);
    close.setContentAreaFilled(false);
    close.setMargin(new Insets(0, 0, 0, 0));
    close.setPreferredSize(new Dimension(22, 22));
    close.setToolTipText("Diese Rechnung schließen");
    close.getAccessibleContext().setAccessibleName("Rechnung schließen: " + name);
    close.addActionListener(e -> closeAction.run());
    var right = new JPanel(new GridBagLayout());
    right.setOpaque(false);
    right.add(close);
    add(right, BorderLayout.EAST);
    filename.setToolTipText(null);
    for (var item : metadata.getComponents()) ((JComponent) item).setToolTipText(null);
    String message = document.source().toAbsolutePath() + " · " + summary;
    installHover(
        this,
        new java.awt.event.MouseAdapter() {
          @Override
          public void mousePressed(java.awt.event.MouseEvent e) {
            if (SwingUtilities.isLeftMouseButton(e) && !e.isPopupTrigger()) activate.run();
          }

          @Override
          public void mouseEntered(java.awt.event.MouseEvent e) {
            hover.accept(message);
          }

          @Override
          public void mouseExited(java.awt.event.MouseEvent e) {
            hover.accept(null);
          }
        });
  }

  private static void installHover(Component component, java.awt.event.MouseAdapter listener) {
    if (component instanceof JButton) return;
    component.addMouseListener(listener);
    if (component instanceof Container container)
      for (var child : container.getComponents()) installHover(child, listener);
  }

  void setSelected(boolean selected) {
    filename.setForeground(selected ? LeadingTabs.BLUE : new Color(49, 61, 77));
    for (var item : metadata.getComponents())
      item.setForeground(selected ? new Color(45, 76, 112) : new Color(106, 115, 128));
    close.setForeground(selected ? LeadingTabs.BLUE : new Color(106, 115, 128));
    repaint();
  }

  private static final class CloseIcon implements Icon {
    public int getIconWidth() {
      return 12;
    }

    public int getIconHeight() {
      return 12;
    }

    public void paintIcon(Component c, Graphics g, int x, int y) {
      var g2 = (Graphics2D) g.create();
      g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
      g2.setColor(c.getForeground());
      g2.setStroke(new BasicStroke(1.7f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
      g2.drawLine(x + 2, y + 2, x + 10, y + 10);
      g2.drawLine(x + 10, y + 2, x + 2, y + 10);
      g2.dispose();
    }
  }

  static String summary(DocumentBatch.Loaded document) {
    var root = document.invoice().root();
    return "Nr. "
        + root.value("BT-1")
        + " · "
        + InvoiceFormat.money(root.value("BT-115"), root.value("BT-5"))
        + " · "
        + InvoiceFormat.date(root.value("BT-2"));
  }

  @Override
  public Dimension getPreferredSize() {
    return new Dimension(
        288,
        Math.max(38, filename.getPreferredSize().height + metadata.getPreferredSize().height + 6));
  }

  @Override
  public Dimension getMinimumSize() {
    return getPreferredSize();
  }

  @Override
  public JToolTip createToolTip() {
    return FullText.tip(this);
  }
}
