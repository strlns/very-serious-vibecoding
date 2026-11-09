package de.xrechnung.viewer;

import java.awt.*;
import java.util.List;
import javax.swing.*;

/** Read-only presentation of existing evidence; never infers invoice validity. */
final class GapInspector extends JPanel {
  private static final long serialVersionUID = 1L;
  private static final Color MUTED = new Color(89, 102, 117);
  private final DefaultListModel<SemanticInvoice.Gap> model = new DefaultListModel<>();
  private final JList<SemanticInvoice.Gap> list = new JList<>(model);
  private final JLabel count = label("Keine offenen Hinweise", Font.PLAIN, 11);
  private final JLabel heading = label("Hinweis auswählen", Font.BOLD, 13);
  private final JLabel valueLabel = label("Vollständiger Quellwert", Font.BOLD, 12);
  private final JTextArea reason = area("gap-reason");
  private final JTextArea value = area("gap-value");
  private final JTextArea source = area("gap-source");
  private final JTextArea readableSource = area("gap-readable-source");

  GapInspector() {
    super(new BorderLayout(0, 12));
    setPreferredSize(new Dimension(380, 500));
    setBorder(BorderFactory.createCompoundBorder(
        BorderFactory.createLineBorder(new Color(218, 224, 231)),
        BorderFactory.createEmptyBorder(14, 14, 14, 14)));
    var top = new JPanel(new BorderLayout(0, 6));
    top.add(label("Hinweise zur Darstellung", Font.BOLD, 16), BorderLayout.NORTH);
    var intro = area(null);
    intro.setOpaque(false);
    intro.setText("Diese Inhalte sind nicht vollständig zugeordnet oder darstellbar. "
        + "Die Hinweise sind keine fachliche Gültigkeitsprüfung.");
    top.add(intro, BorderLayout.CENTER);
    top.add(count, BorderLayout.SOUTH);
    add(top, BorderLayout.NORTH);

    list.setName("gap-list");
    list.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
    list.setCellRenderer(new Renderer());
    list.addListSelectionListener(e -> { if (!e.getValueIsAdjusting()) select(list.getSelectedValue()); });
    var rows = new JScrollPane(list);
    rows.setMinimumSize(new Dimension(100, 100));
    var detail = new JPanel(new BorderLayout(0, 8));
    detail.setMinimumSize(new Dimension(100, 180));
    detail.add(heading, BorderLayout.NORTH);
    var tabs = new JTabbedPane();
    var content = new JPanel(new BorderLayout(0, 8));
    reason.setOpaque(false);
    reason.setRows(3);
    content.add(new JScrollPane(reason), BorderLayout.NORTH);
    var values = new JPanel(new BorderLayout(0, 6));
    valueLabel.setName("gap-value-label");
    values.add(valueLabel, BorderLayout.NORTH);
    values.add(new JScrollPane(value), BorderLayout.CENTER);
    content.add(values, BorderLayout.CENTER);
    tabs.addTab("Inhalt", content);
    var origins = new JPanel(new BorderLayout(0, 8));
    readableSource.setOpaque(false);
    readableSource.setRows(3);
    origins.add(new JScrollPane(readableSource), BorderLayout.NORTH);
    var exact = new JPanel(new BorderLayout(0, 6));
    exact.add(label("Vollständiger Quellenverweis", Font.BOLD, 12), BorderLayout.NORTH);
    exact.add(new JScrollPane(source), BorderLayout.CENTER);
    origins.add(exact, BorderLayout.CENTER);
    tabs.addTab("Quelle", origins);
    detail.add(tabs, BorderLayout.CENTER);
    var split = new JSplitPane(JSplitPane.VERTICAL_SPLIT, rows, detail);
    split.setResizeWeight(.48);
    split.setBorder(BorderFactory.createEmptyBorder());
    add(split, BorderLayout.CENTER);
    var foot = label("Quelldetails sind markierbar und kopierbar.", Font.PLAIN, 11);
    foot.setForeground(MUTED);
    add(foot, BorderLayout.SOUTH);
  }

  void display(List<SemanticInvoice.Gap> gaps) {
    model.clear();
    select(null);
    for (var gap : gaps) model.addElement(gap);
    long attrs = gaps.stream().filter(g -> g.sourcePath().contains("/@")).count();
    count.setText(gaps.size() + " Hinweise · " + attrs + " Attribute · keine Fehlerquote");
    if (!gaps.isEmpty()) list.setSelectedIndex(0);
  }

  private void select(SemanticInvoice.Gap gap) {
    heading.setText(gap == null ? "Keine offenen Hinweise" : category(gap));
    reason.setText(gap == null ? "Keine Zuordnungslücken festgestellt. Das ersetzt keine Validierung." : gap.reason());
    value.setText(gap == null ? "" : gap.value());
    source.setText(gap == null ? "" : gap.sourcePath());
    readableSource.setText(gap == null ? "" : readable(gap.sourcePath()));
    valueLabel.setText(gap != null && gap.value().isEmpty()
        ? "Quellwert: leer (kein Textinhalt)" : "Vollständiger Quellwert");
    for (var a : List.of(reason, value, source, readableSource)) a.setCaretPosition(0);
  }

  private static String category(SemanticInvoice.Gap gap) {
    if (gap.reason().startsWith("Kein gültiges reines Kalenderdatum")) return "Datum · Format prüfen";
    if (gap.reason().startsWith("Rechnungsdarstellung fehlgeschlagen")) return "Darstellung fehlgeschlagen";
    if (gap.reason().startsWith("Bedeutung des leeren Elements")) return "Leeres Element · Bedeutung offen";
    if (gap.reason().startsWith("Unbekanntes Feld im Zwischenmodell")) return "Unbekanntes Modellfeld";
    if (gap.reason().startsWith("Rechnungsnummer im Modell fehlt")) return "Rechnungsnummer fehlt im Modell";
    return gap.sourcePath().contains("/@") ? "Attribut · Zuordnung offen" : "Inhalt · Zuordnung offen";
  }

  private static String readable(String path) {
    // Display alias only. The unmodified namespace-qualified source stays available separately.
    return path.replaceAll("Q\\{[^}]*\\}", "");
  }

  private static String preview(String text, int limit) {
    String flat = text.replace('\n', ' ').replace('\r', ' ');
    int length = flat.codePointCount(0, flat.length());
    return length > limit ? flat.substring(0, flat.offsetByCodePoints(0, limit)) + " …" : flat;
  }

  private static JLabel label(String text, int style, int size) {
    var label = new JLabel(text);
    label.putClientProperty("html.disable", Boolean.TRUE);
    label.setFont(label.getFont().deriveFont(style, (float) size));
    return label;
  }

  private static JTextArea area(String name) {
    var area = new JTextArea();
    area.setName(name);
    area.setEditable(false);
    area.setLineWrap(true);
    area.setWrapStyleWord(true);
    area.setFont(UIManager.getFont("Label.font").deriveFont(Font.PLAIN));
    area.setMargin(new Insets(6, 6, 6, 6));
    return area;
  }

  private static final class Renderer extends JPanel implements ListCellRenderer<SemanticInvoice.Gap> {
    private static final long serialVersionUID = 1L;
    private final JLabel title = label("", Font.BOLD, 12);
    private final JLabel location = label("", Font.PLAIN, 11);
    private final JLabel snippet = label("", Font.PLAIN, 12);
    Renderer() {
      super(new GridLayout(3, 1, 0, 3));
      setBorder(BorderFactory.createCompoundBorder(
          BorderFactory.createMatteBorder(0, 0, 1, 0, new Color(225, 230, 235)),
          BorderFactory.createEmptyBorder(9, 10, 9, 10)));
      add(title); add(location); add(snippet);
    }
    public Component getListCellRendererComponent(JList<? extends SemanticInvoice.Gap> list,
        SemanticInvoice.Gap gap, int index, boolean selected, boolean focus) {
      title.setText((index + 1) + " · " + category(gap));
      String path = readable(gap.sourcePath());
      String[] parts = path.split("/");
      int start = Math.max(0, parts.length - 3);
      location.setText(String.join(" › ", java.util.Arrays.copyOfRange(parts, start, parts.length)));
      snippet.setText(gap.value().isEmpty() ? "Kein Textinhalt" : preview(gap.value(), 100));
      setBackground(selected ? list.getSelectionBackground() : list.getBackground());
      for (var l : List.of(title, location, snippet))
        l.setForeground(selected ? list.getSelectionForeground() : list.getForeground());
      if (!selected) location.setForeground(MUTED);
      // Fixed renderer width prevents long source values from stretching the inspector.
      setPreferredSize(new Dimension(280, 84));
      setBorder(BorderFactory.createCompoundBorder(
          BorderFactory.createLineBorder(focus ? list.getSelectionBackground() : new Color(225, 230, 235)),
          BorderFactory.createEmptyBorder(8, 9, 8, 9)));
      setSize(Math.max(100, list.getWidth() - 2), 84);
      doLayout();
      return this;
    }
  }
}
