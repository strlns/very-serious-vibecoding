package de.xrechnung.viewer;

import java.awt.*;
import javax.swing.*;
import javax.swing.plaf.basic.BasicTabbedPaneUI;

/** Deterministic tab chrome; platform delegates must not stretch or center tabs. */
public final class LeadingTabs extends JTabbedPane {
  private static final long serialVersionUID = 1L;
  static final Color ACTIVE = new Color(232, 241, 252);
  static final Color BLUE = new Color(41, 97, 164);
  private final boolean documents;
  private boolean revealSelection;

  public LeadingTabs(boolean documents) {
    super(TOP, SCROLL_TAB_LAYOUT);
    this.documents = documents;
    setComponentOrientation(ComponentOrientation.LEFT_TO_RIGHT);
    updateUI();
    addChangeListener(e -> refreshHeaders());
  }

  private void refreshHeaders() {
    revealSelection = true;
    for (int i = 0; i < getTabCount(); i++) {
      if (getTabComponentAt(i) instanceof InvoiceTabHeader header)
        header.setSelected(i == getSelectedIndex());
    }
    repaint();
  }

  @Override
  public void setTabComponentAt(int index, Component component) {
    super.setTabComponentAt(index, component);
    refreshHeaders();
  }

  @Override
  public void doLayout() {
    super.doLayout();
    if (!revealSelection || getSelectedIndex() < 0) return;
    revealSelection = false;
    Rectangle selected = getBoundsAt(getSelectedIndex());
    for (var child : getComponents()) {
      if (child instanceof JViewport viewport) {
        int shift =
            selected.x < viewport.getX()
                ? selected.x - viewport.getX()
                : Math.max(0, selected.x + selected.width - viewport.getX() - viewport.getWidth());
        if (shift != 0) {
          Point point = viewport.getViewPosition();
          viewport.setViewPosition(new Point(Math.max(0, point.x + shift), point.y));
        }
      }
    }
  }

  @Override
  public void updateUI() {
    setUI(
        new BasicTabbedPaneUI() {
          @Override
          protected void installDefaults() {
            super.installDefaults();
            tabInsets = new Insets(6, 10, 6, 10);
            selectedTabPadInsets = new Insets(0, 0, 0, 0);
            tabAreaInsets = new Insets(4, 4, 4, 4);
            contentBorderInsets = new Insets(1, 0, 0, 0);
            tabRunOverlay = 0;
          }

          @Override
          protected int calculateTabWidth(int placement, int index, FontMetrics metrics) {
            return documents ? 310 : super.calculateTabWidth(placement, index, metrics) + 8;
          }

          @Override
          protected void paintTabBackground(
              Graphics g, int p, int index, int x, int y, int w, int h, boolean selected) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setColor(selected ? ACTIVE : new Color(241, 243, 246));
            g2.fillRoundRect(x + 2, y + 1, w - 5, h - 2, 10, 10);
            g2.dispose();
          }

          @Override
          protected void paintTabBorder(
              Graphics g, int p, int index, int x, int y, int w, int h, boolean selected) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setColor(selected ? BLUE : new Color(208, 214, 222));
            g2.drawRoundRect(x + 2, y + 1, w - 5, h - 3, 10, 10);
            if (selected) g2.fillRoundRect(x + 10, y + h - 4, w - 21, 3, 3, 3);
            g2.dispose();
          }

          @Override
          protected void paintText(
              Graphics g,
              int placement,
              Font font,
              FontMetrics fm,
              int index,
              String title,
              Rectangle textRect,
              boolean selected) {
            g.setFont(font.deriveFont(selected ? Font.BOLD : Font.PLAIN));
            g.setColor(selected ? BLUE : new Color(64, 76, 92));
            g.drawString(title, textRect.x, textRect.y + fm.getAscent());
          }

          @Override
          protected void paintFocusIndicator(
              Graphics g,
              int p,
              Rectangle[] rects,
              int index,
              Rectangle iconRect,
              Rectangle textRect,
              boolean selected) {
            // Selected border remains visible; keyboard focus adds a compact inset outline.
            if (selected && tabPane.hasFocus()) {
              Rectangle r = rects[index];
              g.setColor(BLUE);
              g.drawRect(r.x + 6, r.y + 5, r.width - 13, r.height - 11);
            }
          }

          @Override
          protected void paintContentBorder(Graphics g, int p, int selected) {
            g.setColor(new Color(211, 218, 226));
            int y = calculateTabAreaHeight(p, runCount, maxTabHeight);
            g.drawLine(0, y, tabPane.getWidth(), y);
          }
        });
  }

  @Override
  public JToolTip createToolTip() {
    return FullText.tip(this);
  }
}
