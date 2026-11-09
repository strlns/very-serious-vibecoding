package de.xrechnung.viewer;

import java.awt.*;
import java.awt.event.MouseEvent;
import javax.swing.*;
import javax.swing.table.TableModel;

/** Shared shortening/tooltip pattern: previews never replace the underlying full value. */
public final class FullText {
  public static String preview(String text, int limit) {
    String line = text.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ');
    int count = line.codePointCount(0, line.length());
    if (count <= limit) return line;
    if (limit < 4) throw new IllegalArgumentException("limit must be at least 4");
    return line.substring(0, line.offsetByCodePoints(0, limit - 3)) + "...";
  }

  public static String hint(String full, boolean clipped) {
    return clipped && full != null && !full.isBlank() ? preview(full, 240) : null;
  }

  public static JToolTip tip(JComponent owner) {
    var tip = new PlainTip();
    tip.setComponent(owner);
    return tip;
  }

  public static class Label extends JLabel {
    private static final long serialVersionUID = 1L;
    private final int limit;

    public Label(String text, int limit) {
      super();
      this.limit = limit;
      putClientProperty("html.disable", Boolean.TRUE);
      setHorizontalAlignment(LEFT);
      setVerticalAlignment(CENTER);
      setMinimumSize(new Dimension(0, 16));
      setFullText(text);
    }

    public void setFullText(String text) {
      setText(preview(text, limit));
      setToolTipText(text);
    }

    @Override
    public String getToolTipText(MouseEvent event) {
      String full = getToolTipText();
      return hint(
          full,
          full != null
              && (!preview(full, Integer.MAX_VALUE).equals(getText())
                  || getFontMetrics(getFont()).stringWidth(getText()) > getWidth()));
    }

    @Override
    public JToolTip createToolTip() {
      return tip(this);
    }
  }

  public static class Table extends JTable {
    private static final long serialVersionUID = 1L;

    public Table(TableModel model) {
      super(model);
      setToolTipText("");
    }

    @Override
    public String getToolTipText(MouseEvent event) {
      int row = rowAtPoint(event.getPoint()), column = columnAtPoint(event.getPoint());
      if (row < 0 || column < 0) return null;
      String value = String.valueOf(getValueAt(row, column));
      var renderer = prepareRenderer(getCellRenderer(row, column), row, column);
      boolean clipped = renderer.getPreferredSize().width > getCellRect(row, column, false).width;
      if (renderer instanceof JLabel label)
        clipped |= !preview(value, Integer.MAX_VALUE).equals(label.getText());
      return hint(value, clipped);
    }

    @Override
    public JToolTip createToolTip() {
      return tip(this);
    }
  }

  /** Passive, small popup: no text controls, scroll panes or focusable children. */
  private static final class PlainTip extends JToolTip {
    private static final long serialVersionUID = 1L;

    PlainTip() {
      putClientProperty("html.disable", Boolean.TRUE);
      setFocusable(false);
      setFont(UIManager.getFont("ToolTip.font"));
    }

    private java.util.List<String> lines() {
      String value = preview(getTipText() == null ? "" : getTipText(), 240);
      var result = new java.util.ArrayList<String>();
      var line = new StringBuilder();
      FontMetrics fm = getFontMetrics(getFont());
      for (int cp : value.codePoints().toArray()) {
        String part = new String(Character.toChars(cp));
        if (fm.stringWidth(line + part) > 360 && !line.isEmpty()) {
          result.add(line.toString());
          line.setLength(0);
        }
        line.append(part);
      }
      result.add(line.toString());
      return result;
    }

    @Override
    public Dimension getPreferredSize() {
      var fm = getFontMetrics(getFont());
      var lines = lines();
      int width = lines.stream().mapToInt(fm::stringWidth).max().orElse(0);
      return new Dimension(width + 16, lines.size() * fm.getHeight() + 10);
    }

    @Override
    protected void paintComponent(Graphics g) {
      g.setColor(new Color(250, 251, 253));
      g.fillRect(0, 0, getWidth(), getHeight());
      g.setColor(new Color(66, 77, 91));
      g.setFont(getFont());
      var fm = g.getFontMetrics();
      int y = 5 + fm.getAscent();
      for (var line : lines()) {
        g.drawString(line, 8, y);
        y += fm.getHeight();
      }
    }
  }

  private FullText() {}
}
