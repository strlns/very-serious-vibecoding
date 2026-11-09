package de.xrechnung.viewer;

import java.awt.BorderLayout;
import java.awt.CardLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.util.List;
import javax.swing.*;

public final class InvoiceWorkspace extends JPanel {
  private static final long serialVersionUID = 1L;
  private final InvoicePaper paper = new InvoicePaper();
  private final InvoicePanel diagnostics = new InvoicePanel();
  private final JTabbedPane views = new LeadingTabs(false);
  private final JTextArea disclaimer = new JTextArea(InvoicePanel.DISCLAIMER);
  private final JTextArea status = new JTextArea("Datei öffnen, um eine Rechnung darzustellen.");
  private final JToggleButton toggle = new JToggleButton("Darstellungslücken: 0");
  private final GapInspector inspector = new GapInspector();
  private final JPanel content = new JPanel(new BorderLayout(10, 0));
  private List<SemanticInvoice.Gap> gaps = List.of();
  private final JScrollPane paperScroll;
  private final CardLayout invoiceCards = new CardLayout();
  private final JPanel invoiceViews = new JPanel(invoiceCards);
  private final InvoiceTable compact = new InvoiceTable();
  private InvoiceMode mode = InvoiceMode.PAPER;

  public InvoiceWorkspace() {
    super(new BorderLayout(8, 8));
    setBorder(BorderFactory.createEmptyBorder(8, 10, 8, 10));
    for (var a : List.of(disclaimer, status)) {
      a.setEditable(false);
      a.setOpaque(false);
      a.setLineWrap(true);
      a.setWrapStyleWord(true);
    }
    disclaimer.setFont(disclaimer.getFont().deriveFont(10f));
    var footer = new JPanel(new BorderLayout(8, 0));
    var alpha = new JLabel("Alpha 0.8");
    alpha.setFont(alpha.getFont().deriveFont(10f));
    footer.add(alpha, BorderLayout.WEST);
    footer.add(disclaimer, BorderLayout.CENTER);
    add(footer, BorderLayout.SOUTH);
    footer.add(toggle, BorderLayout.EAST);
    toggle.setFont(toggle.getFont().deriveFont(10f));
    toggle.addActionListener(e -> setGapsExpanded(toggle.isSelected()));
    JPanel surround = new PaperCanvas(paper);
    paperScroll = new JScrollPane(surround);
    paperScroll.getVerticalScrollBar().setUnitIncrement(24);
    invoiceViews.add(paperScroll, InvoiceMode.PAPER.name());
    invoiceViews.add(compact, InvoiceMode.TABLE.name());
    views.addTab("Rechnung", invoiceViews);
    views.addTab("Quelldaten", diagnostics);
    content.add(views, BorderLayout.CENTER);
    content.add(inspector, BorderLayout.EAST);
    add(content, BorderLayout.CENTER);
    diagnostics.embedded();
    setGapsExpanded(false);
  }

  public void display(InvoiceFile file, SemanticInvoice invoice, String name) {
    paper.display(invoice);
    compact.display(invoice);
    diagnostics.display(file, name);
    gaps = invoice.gaps();
    status.setText(invoice.status());

    inspector.display(gaps);
    toggle.setText("Darstellungslücken: " + gaps.size());
    setGapsExpanded(!gaps.isEmpty());
    views.setSelectedIndex(0);
    SwingUtilities.invokeLater(() -> paperScroll.getVerticalScrollBar().setValue(0));
  }

  int gapCount() {
    return gaps.size();
  }

  boolean gapsExpanded() {
    return inspector.isVisible();
  }

  void setGapsExpanded(boolean value) {
    toggle.setSelected(value);
    inspector.setVisible(value);
    revalidate();
    repaint();
  }

  String countText() {
    return toggle.getText();
  }

  String activeView() {
    return views.getTitleAt(views.getSelectedIndex());
  }

  String disclaimerText() {
    return disclaimer.getText();
  }

  String invoiceText() {
    return paper.visibleText();
  }

  public void setMode(InvoiceMode mode) {
    this.mode = java.util.Objects.requireNonNull(mode);
    invoiceCards.show(invoiceViews, mode.name());
  }

  InvoiceMode mode() {
    return mode;
  }

  boolean paperHasHorizontalOverflow() {
    return paperScroll.getViewport().getViewSize().width
        > paperScroll.getViewport().getExtentSize().width;
  }

  private static final class PaperCanvas extends JPanel implements Scrollable {
    private static final long serialVersionUID = 1L;
    private final InvoicePaper paper;

    PaperCanvas(InvoicePaper paper) {
      this.paper = paper;
      setLayout(null);
      setBackground(new Color(232, 236, 241));
      add(paper);
    }

    @Override
    public void doLayout() {
      int width = Math.max(200, Math.min(1040, getWidth() - 28));
      paper.setBounds(
          Math.max(10, (getWidth() - width) / 2), 12, width, paper.getPreferredSize().height);
    }

    @Override
    public Dimension getPreferredSize() {
      return new Dimension(1000, paper.getPreferredSize().height + 24);
    }

    public Dimension getPreferredScrollableViewportSize() {
      return new Dimension(1000, 800);
    }

    public int getScrollableUnitIncrement(
        java.awt.Rectangle visible, int orientation, int direction) {
      return 24;
    }

    public int getScrollableBlockIncrement(
        java.awt.Rectangle visible, int orientation, int direction) {
      return Math.max(24, visible.height - 48);
    }

    public boolean getScrollableTracksViewportWidth() {
      return true;
    }

    public boolean getScrollableTracksViewportHeight() {
      return false;
    }
  }
}
