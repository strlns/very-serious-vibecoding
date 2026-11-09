package de.xrechnung.viewer;

import java.awt.*;
import javax.swing.*;

/** A small activity wheel with no running timer when idle. All calls belong on the EDT. */
final class BusyIndicator extends JPanel {
  private static final long serialVersionUID = 1L;
  private final JLabel label = new JLabel();
  private int phase;
  private final JComponent wheel =
      new JComponent() {
        private static final long serialVersionUID = 1L;

        @Override
        protected void paintComponent(Graphics graphics) {
          var g = (Graphics2D) graphics.create();
          g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
          g.translate(getWidth() / 2.0, getHeight() / 2.0);
          g.setStroke(new BasicStroke(1.8f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
          for (int i = 0; i < 12; i++) {
            g.setColor(new Color(41, 97, 164, 45 + ((i + phase) % 12) * 18));
            double angle = i * Math.PI / 6;
            g.draw(
                new java.awt.geom.Line2D.Double(
                    4 * Math.cos(angle),
                    4 * Math.sin(angle),
                    7 * Math.cos(angle),
                    7 * Math.sin(angle)));
          }
          g.dispose();
        }
      };
  private final Timer timer =
      new Timer(
          90,
          e -> {
            phase = (phase + 1) % 12;
            wheel.repaint();
          });

  BusyIndicator() {
    super(new FlowLayout(FlowLayout.RIGHT, 7, 0));
    setOpaque(false);
    wheel.setPreferredSize(new Dimension(18, 18));
    label.setFont(label.getFont().deriveFont(11f));
    label.putClientProperty("html.disable", Boolean.TRUE);
    add(wheel);
    add(label);
    timer.setCoalesce(true);
    setVisible(false);
  }

  void setBusy(boolean value, String message) {
    if (!SwingUtilities.isEventDispatchThread()) throw new IllegalStateException("EDT required");
    label.setText(value ? message : "");
    getAccessibleContext().setAccessibleName(value ? message : "Keine Verarbeitung aktiv");
    setVisible(value);
    if (value) {
      if (!timer.isRunning()) timer.start();
    } else {
      timer.stop();
      phase = 0;
    }
  }

  boolean animating() {
    return timer.isRunning();
  }

  @Override
  public void removeNotify() {
    timer.stop();
    super.removeNotify();
  }
}
