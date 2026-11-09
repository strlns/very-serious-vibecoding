package de.xrechnung.viewer;

import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Insets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JTextArea;

public final class InvoicePaper extends JPanel {
  private static final long serialVersionUID = 1L;
  private static final Color INK = new Color(35, 48, 65),
      MUTED = new Color(95, 108, 122),
      LINE = new Color(222, 227, 232),
      ACCENT = new Color(38, 72, 107);
  private final Set<String> keys = new LinkedHashSet<>();
  private final List<String> values = new ArrayList<>();
  private final StringBuilder text = new StringBuilder();
  private String currency = "";
  private JPanel renderTarget;
  private SemanticInvoice.Node invoiceRoot;
  private final List<JPanel> lineRows = new ArrayList<>();

  public InvoicePaper() {
    setLayout(new BoxLayout(this, BoxLayout.Y_AXIS));
    setBackground(Color.WHITE);
    setBorder(
        BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(LINE), BorderFactory.createEmptyBorder(24, 32, 24, 32)));
  }

  void display(SemanticInvoice invoice) {
    removeAll();
    keys.clear();
    values.clear();
    lineRows.clear();
    text.setLength(0);
    var root = invoice.root();
    invoiceRoot = root;
    currency = root.value("BT-5");
    addText("XRECHNUNG · LESEANSICHT", 12, Font.BOLD, ACCENT);
    space(14);
    addText(root.value("BT-3").equals("381") ? "Gutschrift" : "Rechnung", 27, Font.BOLD, INK);
    space(6);
    addText(
        root.value("BT-1").isBlank() ? "Keine Rechnungsnummer darstellbar" : root.value("BT-1"),
        18,
        Font.PLAIN,
        MUTED);
    space(24);
    JPanel addresses = new PaperBlock(new java.awt.GridLayout(1, 3, 18, 0));
    addresses.setOpaque(false);
    JPanel parties = column();
    parties.add(textArea("VERKÄUFER", 11, Font.BOLD, MUTED, 32));
    parties.add(
        textArea(
            party(root, "BG-4", "BT-27", "BT-35", "BT-36", "BT-162", "BT-38", "BT-37", "BT-40"),
            14,
            Font.PLAIN,
            INK,
            32));
    addresses.add(parties);
    JPanel buyer = column();
    buyer.add(textArea("RECHNUNGSEMPFÄNGER", 11, Font.BOLD, MUTED, 24));
    buyer.add(
        textArea(
            party(root, "BG-7", "BT-44", "BT-50", "BT-51", "BT-163", "BT-53", "BT-52", "BT-55"),
            14,
            Font.PLAIN,
            INK,
            24));
    addresses.add(buyer);
    JPanel metadata = column();
    metadata.add(textArea("RECHNUNGSDATEN", 11, Font.BOLD, MUTED, 32));
    metadata.add(pairRow("Rechnungsnummer", root.value("BT-1"), false, false));
    metadata.add(pairRow("Rechnungsdatum", date(root.value("BT-2")), false, false));
    if (!root.value("BT-9").isBlank())
      metadata.add(pairRow("Zahlbar bis", date(root.value("BT-9")), false, false));
    if (!root.value("BT-10").isBlank())
      metadata.add(pairRow("Käuferreferenz", root.value("BT-10"), false, false));
    metadata.add(pairRow("Währung", currency, false, false));
    addresses.add(metadata);
    addBlock(addresses);
    space(22);
    rule();
    space(16);
    for (var note : root.all("BG-1"))
      if (!note.value("BT-22").isBlank()) {
        addText(note.value("BT-22"), 13, Font.PLAIN, INK);
        space(12);
      }
    var lines = root.all("BG-25");
    if (!lines.isEmpty()) {
      addText("Positionen", 17, Font.BOLD, INK);
      space(10);
      addBlock(
          lineRow(
              List.of("Pos.-ID", "Beschreibung", "Menge / Einheit", "Einzelpreis", "Betrag"), true));
      for (var line : lines) {
        String description = line.value("BT-153");
        if (!line.value("BT-154").isBlank()) description += "\n" + line.value("BT-154");
        String taxInfo = InvoicePresentation.lineTax(line);
        if (!taxInfo.isBlank()) description += "\n" + taxInfo;
        addBlock(
            lineRow(
                List.of(
                    line.value("BT-126"),
                    description,
                    InvoiceFormat.decimal(line.value("BT-129")) + " " + InvoicePresentation.unit(line.value("BT-130")),
                    InvoicePresentation.price(line, currency),
                    amount(line.value("BT-131"))),
                false));
      }
      space(18);
    }
    var totals = root.all("BG-22");
    if (!totals.isEmpty()) {
      var total = totals.get(0);
      JPanel sum = column();
      for (var pair :
          List.of(
              new String[] {"Nettobetrag", "BT-109"},
              new String[] {"Umsatzsteuer", "BT-110"},
              new String[] {"Bruttobetrag", "BT-112"},
              new String[] {"Bereits gezahlt", "BT-113"},
              new String[] {"Rundungsbetrag", "BT-114"}))
        if (!total.value(pair[1]).isBlank())
          sum.add(pairRow(pair[0], amount(total.value(pair[1])), true, false));
      if (!total.value("BT-115").isBlank()) {
        sum.add(Box.createVerticalStrut(4));
        sum.add(pairRow("Zahlbetrag", amount(total.value("BT-115")), true, true));
      }
      var totalBlock = new PaperBlock(new java.awt.BorderLayout());
      // Keep the amounts under the right edge of the position amounts.
      sum.setPreferredSize(null);
      sum.setBorder(BorderFactory.createEmptyBorder(2, 0, 2, 0));
      var right = new PaperBlock(new java.awt.BorderLayout());
      right.setOpaque(false);
      right.setPreferredSize(new Dimension(380, sum.getPreferredSize().height));
      right.add(sum);
      totalBlock.setOpaque(false);
      totalBlock.add(right, java.awt.BorderLayout.EAST);
      addBlock(totalBlock);
      space(18);
    }
    for (var tax : root.all("BG-23"))
      addText(
          InvoicePresentation.tax(tax, currency),
          12,
          Font.PLAIN,
          MUTED);
    space(18);
    if (!root.value("BT-20").isBlank()) {
      addText("Zahlungsbedingungen", 15, Font.BOLD, INK);
      addText(root.value("BT-20"), 13, Font.PLAIN, INK);
      space(12);
    }
    for (var payment : root.all("BG-17")) {
      addText("Überweisung", 15, Font.BOLD, INK);
      addText(
          "Zahlungskonto: "
              + payment.value("BT-84")
              + (payment.value("BT-85").isBlank()
                  ? ""
                  : "\nKontoinhaber: " + payment.value("BT-85"))
              + (payment.value("BT-86").isBlank()
                  ? ""
                  : "\nZahlungsdienstleister: " + payment.value("BT-86")),
          13,
          Font.PLAIN,
          INK);
      space(10);
    }
    if (!root.value("BT-83").isBlank())
      addText("Verwendungszweck: " + root.value("BT-83"), 13, Font.PLAIN, INK);
    space(22);
    rule();
    space(20);
    var detailsToggle = new javax.swing.JToggleButton("Alle Rechnungsangaben anzeigen");
    detailsToggle.setHorizontalAlignment(javax.swing.SwingConstants.LEFT);
    detailsToggle.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 12));
    detailsToggle.setForeground(ACCENT);
    detailsToggle.setBackground(new Color(244, 247, 251));
    detailsToggle.setUI(new javax.swing.plaf.basic.BasicButtonUI());
    detailsToggle.setBorder(
        BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(LINE), BorderFactory.createEmptyBorder(9, 12, 9, 12)));
    detailsToggle.setMaximumSize(new Dimension(Integer.MAX_VALUE, 38));
    var details = column();
    renderTarget = details;
    renderChildren(root, 0);
    renderTarget = null;
    details.setVisible(false);
    detailsToggle.addActionListener(
        e -> {
          details.setVisible(detailsToggle.isSelected());
          detailsToggle.setText(
              detailsToggle.isSelected()
                  ? "Alle Rechnungsangaben ausblenden"
                  : "Alle Rechnungsangaben anzeigen");
          revalidate();
          repaint();
        });
    addBlock(detailsToggle);
    addBlock(details);
    space(24);
    rule();
    space(14);
    addText(
        "Spezifikationstreue nicht zertifiziert · Nicht validiert\n"
            + InvoicePanel.PRODUCT_GOAL + "\n"
            + "Die XML-Datei bleibt das Rechnungsoriginal. Diese Ansicht ist kein PDF-Export.",
        11,
        Font.PLAIN,
        MUTED);
    revalidate();
    repaint();
  }

  private void renderChildren(SemanticInvoice.Node parent, int depth) {
    for (var node : parent.children()) {
      if (node.group()) {
        if (node.walk().stream()
            .noneMatch(
                n ->
                    !n.group()
                        && (!n.value().isBlank()
                            || n.properties().stream().anyMatch(p -> !p.value().isBlank()))))
          continue;
        space(depth == 0 ? 18 : 8);
        addText(
            node.label() + "  ·  " + node.id(),
            depth == 0 ? 13 : 12,
            Font.BOLD,
            depth == 0 ? ACCENT : MUTED);
        space(6);
        renderChildren(node, depth + 1);
      } else {
        keys.add(node.key());
        values.add(node.value());
        for (var p : node.properties()) values.add(p.value());
        if (node.value().isBlank() && node.properties().stream().allMatch(p -> p.value().isBlank()))
          continue;
        JPanel row = new PaperBlock(new InvoiceRowLayout(new double[] {0, .38, 1}));
        row.setOpaque(false);
        row.setBorder(BorderFactory.createMatteBorder(0, 0, 1, 0, new Color(240, 242, 245)));
        row.add(textArea(node.label() + "  ·  " + node.id(), 11, Font.PLAIN, MUTED, 34));
        JPanel valueColumn = column();
        valueColumn.add(textArea(InvoiceFormat.field(node, invoiceRoot), 12, Font.PLAIN, INK, 55));
        for (var property : node.properties())
          if (!property.value().isBlank())
            valueColumn.add(
                textArea(property.label() + ": " + property.value(), 11, Font.PLAIN, MUTED, 55));
        row.add(valueColumn);
        addBlock(row);
      }
    }
  }

  private static String party(
      SemanticInvoice.Node root,
      String bg,
      String name,
      String line1,
      String line2,
      String line3,
      String post,
      String city,
      String country) {
    var groups = root.all(bg);
    if (groups.isEmpty()) return "Nicht angegeben / nicht zugeordnet";
    var node = groups.get(0);
    var lines = new ArrayList<String>();
    for (String bt : List.of(name, line1, line2, line3))
      if (!node.value(bt).isBlank()) lines.add(node.value(bt));
    String place = (node.value(post) + " " + node.value(city)).strip();
    if (!place.isBlank()) lines.add(place);
    if (!node.value(country).isBlank()) lines.add(node.value(country));
    return String.join("\n", lines);
  }

  private JPanel lineRow(List<String> cells, boolean header) {
    JPanel row = new PaperBlock(new InvoiceRowLayout());
    row.setBackground(header ? new Color(238, 242, 246) : Color.WHITE);
    row.setBorder(BorderFactory.createMatteBorder(0, 0, 1, 0, LINE));
    int[] columns = {5, 30, 13, 13, 13};
    for (int i = 0; i < cells.size(); i++) {
      if (i >= 3) {
        var number =
            new javax.swing.JTextField(cells.get(i)) {
              private static final long serialVersionUID = 1L;

              @Override
              public String getToolTipText(java.awt.event.MouseEvent event) {
                return FullText.hint(
                    getText(), getFontMetrics(getFont()).stringWidth(getText()) > getWidth());
              }

              @Override
              public javax.swing.JToolTip createToolTip() {
                return FullText.tip(this);
              }
            };
        number.setToolTipText(cells.get(i));
        text.append(cells.get(i)).append('\n');
        number.setEditable(false);
        number.setOpaque(false);
        number.setBorder(BorderFactory.createEmptyBorder());
        number.setHorizontalAlignment(javax.swing.SwingConstants.RIGHT);
        number.setFont(new Font(Font.SANS_SERIF, header ? Font.BOLD : Font.PLAIN, 12));
        number.setForeground(INK);
        row.add(number);
      } else row.add(textArea(cells.get(i), 12, header ? Font.BOLD : Font.PLAIN, INK, columns[i]));
    }
    lineRows.add(row);
    return row;
  }

  private JPanel pairRow(String label, String value, boolean money, boolean emphasis) {
    var row = new PaperBlock(new InvoiceRowLayout(new double[] {0, .52, 1}));
    row.setOpaque(false);
    row.setAlignmentX(Component.LEFT_ALIGNMENT);
    int size = emphasis ? 17 : 12;
    int style = emphasis ? Font.BOLD : Font.PLAIN;
    Color color = emphasis ? ACCENT : INK;
    row.add(textArea(label, size, style, color, 18));
    if (money) {
      var field =
          new javax.swing.JTextField(value) {
            private static final long serialVersionUID = 1L;

            @Override
            public String getToolTipText(java.awt.event.MouseEvent event) {
              return FullText.hint(
                  getText(), getFontMetrics(getFont()).stringWidth(getText()) > getWidth());
            }

            @Override
            public javax.swing.JToolTip createToolTip() {
              return FullText.tip(this);
            }
          };
      field.setEditable(false);
      field.setOpaque(false);
      field.setBorder(BorderFactory.createEmptyBorder());
      field.setFont(new Font(Font.SANS_SERIF, style, size));
      field.setForeground(color);
      field.setHorizontalAlignment(javax.swing.SwingConstants.RIGHT);
      field.setToolTipText(value);
      text.append(value).append('\n');
      row.add(field);
    } else row.add(textArea(value, size, style, color, 22));
    return row;
  }

  private String amount(String value) {
    return InvoiceFormat.money(value, currency);
  }

  private static String date(String value) {
    return InvoiceFormat.date(value);
  }

  private static JPanel column() {
    var p = new PaperBlock();
    p.setLayout(new BoxLayout(p, BoxLayout.Y_AXIS));
    p.setOpaque(false);
    return p;
  }

  private void addText(String value, int size, int style, Color color) {
    addBlock(textArea(value, size, style, color, 86));
  }

  private Component textArea(String value, int size, int style, Color color, int columns) {
    text.append(value).append('\n');
    var area = new PaperText(value);
    area.setEditable(false);
    area.setOpaque(false);
    area.setLineWrap(true);
    area.setWrapStyleWord(true);
    area.setFont(new Font(Font.SANS_SERIF, style, size));
    area.setForeground(color);
    area.setMargin(new Insets(0, 0, 0, 0));
    area.setColumns(columns);
    area.setAlignmentX(Component.LEFT_ALIGNMENT);
    area.setSize(Math.max(40, columns * size * 6 / 10), Integer.MAX_VALUE / 100);
    var preferred = area.getPreferredSize();
    if (value.length() > 4000) {
      var scroll = new JScrollPane(area);
      scroll.setPreferredSize(new Dimension(preferred.width, 160));
      scroll.setMaximumSize(new Dimension(Integer.MAX_VALUE, 160));
      scroll.setAlignmentX(Component.LEFT_ALIGNMENT);
      return scroll;
    }
    return area;
  }

  private void addBlock(Component component) {
    if (component instanceof javax.swing.JComponent jc) jc.setAlignmentX(Component.LEFT_ALIGNMENT);
    (renderTarget == null ? this : renderTarget).add(component);
  }

  private void space(int amount) {
    addBlock(Box.createVerticalStrut(Math.max(2, amount / 2)));
  }

  private void rule() {
    var line = new JSeparator();
    line.setForeground(LINE);
    line.setMaximumSize(new Dimension(Integer.MAX_VALUE, 1));
    addBlock(line);
  }

  Set<String> renderedKeys() {
    return Set.copyOf(keys);
  }

  List<String> renderedValues() {
    return List.copyOf(values);
  }

  String visibleText() {
    return text.toString();
  }

  List<List<Integer>> lineColumnPositions() {
    return lineRows.stream()
        .map(row -> java.util.Arrays.stream(row.getComponents()).map(Component::getX).toList())
        .toList();
  }

  private static final class PaperBlock extends JPanel {
    private static final long serialVersionUID = 1L;

    PaperBlock() {
      super();
    }

    PaperBlock(java.awt.LayoutManager layout) {
      super(layout);
    }

    @Override
    public Dimension getMaximumSize() {
      return new Dimension(Integer.MAX_VALUE, getPreferredSize().height);
    }

    @Override
    public Dimension getMinimumSize() {
      return new Dimension(30, getPreferredSize().height);
    }
  }

  private static final class PaperText extends JTextArea {
    private static final long serialVersionUID = 1L;

    PaperText(String value) {
      super(value);
    }

    @Override
    public Dimension getPreferredSize() {
      if (getUI() == null || getFont() == null) return super.getPreferredSize();
      int hint = Math.max(40, getColumns() * getFontMetrics(getFont()).charWidth('m'));
      int width = getWidth() > 0 ? getWidth() : hint;
      return preferredAtWidth(width);
    }

    Dimension preferredAtWidth(int width) {
      int hint = Math.max(40, getColumns() * getFontMetrics(getFont()).charWidth('m'));
      var insets = getInsets();
      int contentWidth = Math.max(20, width - insets.left - insets.right);
      int height = measuredHeight(contentWidth) + insets.top + insets.bottom + 2;
      return new Dimension(hint, Math.max(getFont().getSize() + 4, height));
    }

    private int measuredWidth = -1, measuredHeight;
    private Font measuredFont;

    private int measuredHeight(int width) {
      if (width == measuredWidth && getFont().equals(measuredFont)) return measuredHeight;
      int lines = 0;
      var context = new java.awt.font.FontRenderContext(null, true, true);
      for (String paragraph : getText().split("\n", -1)) {
        if (paragraph.isEmpty()) {
          lines++;
          continue;
        }
        var attributed = new java.text.AttributedString(paragraph);
        attributed.addAttribute(java.awt.font.TextAttribute.FONT, getFont());
        var measurer = new java.awt.font.LineBreakMeasurer(attributed.getIterator(), context);
        while (measurer.getPosition() < paragraph.length()) {
          measurer.nextLayout(width);
          lines++;
        }
      }
      measuredWidth = width;
      measuredFont = getFont();
      measuredHeight = Math.max(1, lines) * getFontMetrics(getFont()).getHeight();
      return measuredHeight;
    }

    @Override
    public Dimension getMaximumSize() {
      return new Dimension(Integer.MAX_VALUE, getPreferredSize().height);
    }

    @Override
    public Dimension getMinimumSize() {
      return new Dimension(20, getPreferredSize().height);
    }
  }

  private static final class InvoiceRowLayout implements java.awt.LayoutManager {
    private final double[] boundaries;

    InvoiceRowLayout() {
      this(new double[] {0, .14, .48, .65, .825, 1});
    }

    InvoiceRowLayout(double[] boundaries) {
      this.boundaries = boundaries;
    }

    public void addLayoutComponent(String name, Component component) {}

    public void removeLayoutComponent(Component component) {}

    public Dimension minimumLayoutSize(java.awt.Container parent) {
      return preferredLayoutSize(parent);
    }

    public Dimension preferredLayoutSize(java.awt.Container parent) {
      int width = parent.getWidth() > 0 ? parent.getWidth() : 850;
      int height = 14;
      for (int i = 0; i < parent.getComponentCount(); i++) {
        var child = parent.getComponent(i);
        int cell = Math.max(20, (int) Math.round(width * (boundaries[i + 1] - boundaries[i])) - 12);
        height = Math.max(height, preferredAtWidth(child, cell).height + 8);
      }
      return new Dimension(850, height);
    }

    private Dimension preferredAtWidth(Component component, int width) {
      if (component instanceof PaperText area) return area.preferredAtWidth(width);
      if (component instanceof PaperBlock block && block.getLayout() instanceof BoxLayout) {
        var insets = block.getInsets();
        int height = insets.top + insets.bottom;
        for (var child : block.getComponents())
          if (child.isVisible())
            height +=
                preferredAtWidth(child, Math.max(20, width - insets.left - insets.right)).height;
        return new Dimension(width, height);
      }
      return component.getPreferredSize();
    }

    public void layoutContainer(java.awt.Container parent) {
      int width = parent.getWidth();
      for (int i = 0; i < parent.getComponentCount(); i++) {
        int left = (int) Math.round(width * boundaries[i]),
            right = (int) Math.round(width * boundaries[i + 1]);
        var child = parent.getComponent(i);
        child.setBounds(
            left + 6,
            3,
            Math.max(20, right - left - 12),
            child instanceof javax.swing.JTextField
                ? child.getPreferredSize().height
                : Math.max(1, parent.getHeight() - 6));
      }
    }
  }
}
