package de.xrechnung.viewer;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.Font;
import java.util.List;
import java.util.Locale;
import javax.swing.BorderFactory;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSplitPane;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.JTree;
import javax.swing.ListSelectionModel;
import javax.swing.RowFilter;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import javax.swing.table.AbstractTableModel;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.TableRowSorter;
import javax.swing.tree.DefaultMutableTreeNode;
import javax.swing.tree.DefaultTreeCellRenderer;
import javax.swing.tree.DefaultTreeModel;
import javax.swing.tree.TreePath;
import javax.swing.tree.TreeSelectionModel;

public final class InvoicePanel extends JPanel {
  private static final long serialVersionUID = 1L;
  public static final String PRODUCT_GOAL =
      "Ziel: XRechnungen gemäß EN 16931-1 in lesbare Papier- und PDF-Rechnungen nach DIN 5008 überführen.";
  public static final String DISCLAIMER =
      "Spezifikationstreue nicht zertifiziert. Keine fachliche Validierung in dieser Alpha.\n" + PRODUCT_GOAL;
  private final JTextArea disclaimer = area(false);
  private final JTextArea overview = area(true);
  private final JTextArea source = area(true);
  private final JTextArea detail = area(true);
  private final JTextArea provenance = area(true);
  private final JTabbedPane tabs = new LeadingTabs(false);
  private final EntryTable model = new EntryTable();
  private final JTable table = new FullText.Table(model);
  private final TableRowSorter<EntryTable> sorter = new TableRowSorter<>(model);
  private final JTextField search = new JTextField();
  private final JLabel count = plainLabel("");
  private final JTree tree =
      new JTree(new DefaultMutableTreeNode("Keine Datei geöffnet")) {
        private static final long serialVersionUID = 1L;

        @Override
        public javax.swing.JToolTip createToolTip() {
          return FullText.tip(this);
        }
      };

  public InvoicePanel() {
    super(new BorderLayout(8, 8));
    setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
    disclaimer.setText(DISCLAIMER);
    disclaimer.setLineWrap(true);
    disclaimer.setWrapStyleWord(true);
    disclaimer.setFont(disclaimer.getFont().deriveFont(10f));
    disclaimer.setBorder(
        BorderFactory.createCompoundBorder(
            BorderFactory.createEtchedBorder(), BorderFactory.createEmptyBorder(8, 8, 8, 8)));
    disclaimer.setBackground(javax.swing.UIManager.getColor("Panel.background"));
    add(disclaimer, BorderLayout.SOUTH);
    overview.setText(
        "Quelldaten · Alpha 0.8\n\n"
            + "Datei öffnen über Datei → Öffnen oder Strg/⌘+O.\n\n"
            + "Meilenstein 1: technische Datenanzeige.\n"
            + "UBL-Rechnung, UBL-Gutschrift und CII werden anhand des Wurzelelements erkannt.\n"
            + "Die Syntaxerkennung bestätigt weder XRechnung-Profil noch Gültigkeit.\n\n"
            + "Es werden keine Beträge berechnet, keine Felder fachlich umgedeutet und keine"
            + " Anlagen ausgeführt.\n"
            + "Unbekannte XML-Strukturen bleiben sichtbar. Originalkopien enthalten die"
            + " ursprünglichen Bytes.\n\n"
            + "Die menschenlesbare Darstellung steht im Reiter Rechnung. PDF-Export und fachliche"
            + " Regelprüfung folgen später.");

    tree.getSelectionModel().setSelectionMode(TreeSelectionModel.SINGLE_TREE_SELECTION);
    tree.setCellRenderer(
        new DefaultTreeCellRenderer() {
          private static final long serialVersionUID = 1L;

          @Override
          public Component getTreeCellRendererComponent(
              JTree target,
              Object value,
              boolean selected,
              boolean expanded,
              boolean leaf,
              int row,
              boolean focus) {
            putClientProperty("html.disable", Boolean.TRUE);
            super.getTreeCellRendererComponent(target, value, selected, expanded, leaf, row, focus);
            Object item = ((DefaultMutableTreeNode) value).getUserObject();
            if (item instanceof InvoiceFile.Entry entry)
              setText(
                  entry.name()
                      + "  ["
                      + entry.kind()
                      + "]"
                      + (entry.value().isEmpty() ? "" : "  " + preview(entry.value())));
            return this;
          }
        });
    tree.addTreeSelectionListener(
        event -> {
          var selected = (DefaultMutableTreeNode) tree.getLastSelectedPathComponent();
          if (selected != null && selected.getUserObject() instanceof InvoiceFile.Entry entry)
            showEntry(entry);
        });
    table.setRowSorter(sorter);
    table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
    table.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
    int[] widths = {180, 110, 300, 230, 500};
    for (int i = 0; i < widths.length; i++)
      table.getColumnModel().getColumn(i).setPreferredWidth(widths[i]);
    table.setDefaultRenderer(
        Object.class,
        new DefaultTableCellRenderer() {
          private static final long serialVersionUID = 1L;

          @Override
          public Component getTableCellRendererComponent(
              JTable target, Object value, boolean selected, boolean focus, int row, int column) {
            putClientProperty("html.disable", Boolean.TRUE);
            return super.getTableCellRendererComponent(
                target, preview(String.valueOf(value)), selected, focus, row, column);
          }
        });
    table
        .getSelectionModel()
        .addListSelectionListener(
            event -> {
              if (!event.getValueIsAdjusting() && table.getSelectedRow() >= 0)
                showEntry(model.entries.get(table.convertRowIndexToModel(table.getSelectedRow())));
            });
    JPanel inventory = new JPanel(new BorderLayout(6, 6));
    JPanel find = new JPanel(new BorderLayout(6, 6));
    find.add(plainLabel("Suchen (wörtlich):"), BorderLayout.WEST);
    search.getAccessibleContext().setAccessibleName("XML-Einträge wörtlich durchsuchen");
    find.add(search, BorderLayout.CENTER);
    find.add(count, BorderLayout.EAST);
    inventory.add(find, BorderLayout.NORTH);
    inventory.add(new JScrollPane(table), BorderLayout.CENTER);
    inventory.add(
        plainLabel(
            "Tabellenvorschau gekürzt · vollständiger Einzelwert rechts · Suchfilter gilt nur für"
                + " diese Tabelle"),
        BorderLayout.SOUTH);
    search
        .getDocument()
        .addDocumentListener(
            new DocumentListener() {
              public void insertUpdate(DocumentEvent event) {
                applyFilter();
              }

              public void removeUpdate(DocumentEvent event) {
                applyFilter();
              }

              public void changedUpdate(DocumentEvent event) {
                applyFilter();
              }
            });
    tabs.addTab("Überblick", new JScrollPane(overview));
    tabs.addTab("XML-Baum", new JScrollPane(tree));
    tabs.addTab("Alle Einträge", inventory);
    tabs.addTab("Original-XML", new JScrollPane(source));
    JPanel details = new JPanel(new BorderLayout(6, 6));
    provenance.setRows(6);
    details.add(new JScrollPane(provenance), BorderLayout.NORTH);
    details.add(new JScrollPane(detail), BorderLayout.CENTER);
    details.add(
        plainLabel("Einzelwert vollständig · Markieren und Kopieren möglich"), BorderLayout.SOUTH);
    details.setBorder(BorderFactory.createTitledBorder("Ausgewählter XML-Eintrag"));
    details.setMinimumSize(new Dimension(280, 100));
    var split = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, tabs, details);
    split.setResizeWeight(0.65);
    add(split, BorderLayout.CENTER);
  }

  private static JTextArea area(boolean monospace) {
    var area = new JTextArea();
    area.setEditable(false);
    area.setMargin(new java.awt.Insets(8, 8, 8, 8));
    if (monospace) area.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
    return area;
  }

  private static JLabel plainLabel(String text) {
    var label = new JLabel();
    label.putClientProperty("html.disable", Boolean.TRUE);
    label.setText(text);
    return label;
  }

  private static String preview(String value) {
    String escaped = value.replace("\r", "\\r").replace("\n", "\\n").replace("\t", "\\t");
    return escaped.length() > 160 ? escaped.substring(0, 160) + " …" : escaped;
  }

  void display(InvoiceFile file, String name) {
    search.setText("");
    sorter.setRowFilter(null);
    model.entries = file.entries();
    model.fireTableDataChanged();
    updateCount();
    var nodes = new DefaultMutableTreeNode[file.entries().size()];
    for (var entry : file.entries()) {
      var node = new DefaultMutableTreeNode(entry);
      nodes[entry.id()] = node;
      if (entry.parentId() >= 0) nodes[entry.parentId()].add(node);
    }
    tree.setModel(new DefaultTreeModel(nodes[0]));
    tree.expandRow(0);
    file.entries().stream()
        .filter(entry -> entry.kind().equals("ELEMENT"))
        .findFirst()
        .ifPresent(entry -> tree.expandPath(new TreePath(nodes[entry.id()].getPath())));
    source.setText(file.rawText());
    source.setCaretPosition(0);
    detail.setText("");
    provenance.setText("");
    overview.setText(
        "Datei: "
            + name
            + "\n\n"
            + "Technische Syntax: "
            + file.syntax()
            + "\n"
            + "Prüfstatus: NICHT VALIDIERT\n"
            + "Profil/Version: nicht geprüft\n\n"
            + "Original: "
            + file.originalBytes().length
            + " Bytes\n"
            + "SHA-256 des geladenen Originals:\n"
            + file.sha256()
            + "\n\n"
            + "XML-Inventar: "
            + file.entries().size()
            + " Einträge\n\n"
            + "XML-Baum und Tabelle enthalten Elemente, Attribute, Namespace-Deklarationen,\n"
            + "Text einschließlich Leerraum, CDATA, Kommentare und Verarbeitungsanweisungen.\n"
            + "Eingebettete Anlagen erscheinen als ursprüngliche XML-Werte (z. B. Base64).\n\n"
            + "XML-Parser normalisieren u. a. Zeilenenden und Zeichenreferenzen.\n"
            + "Die technische Ansicht ist deshalb keine bytegenaue Repräsentation des Originals.\n"
            + "Original-XML zeigt den decodierten Quelltext; Originalkopie bewahrt die Bytes.\n\n"
            + "Bei überschrittenen Grenzen (8 MiB / 128 Ebenen / 50.000 Einträge) wird die Datei"
            + " abgelehnt.\n"
            + "Dies sind die Quelldaten; die Rechnungsansicht steht im Reiter Rechnung. Kein"
            + " PDF-Export.\n\n"
            + DISCLAIMER);
    overview.setCaretPosition(0);
    file.entries().stream()
        .filter(entry -> entry.kind().equals("TEXT") && !entry.value().isBlank())
        .findFirst()
        .ifPresent(
            entry -> {
              tree.setSelectionPath(new TreePath(nodes[entry.id()].getPath()));
              showEntry(entry);
            });
    tabs.setSelectedIndex(1);
  }

  private void showEntry(InvoiceFile.Entry entry) {
    provenance.setText(
        "Typ: "
            + entry.kind()
            + "\nName: "
            + entry.name()
            + "\nNamespace: "
            + entry.namespace()
            + "\nPfad (EQName-basiert, kein XPath-Ausdruck):\n"
            + entry.path());
    provenance.setCaretPosition(0);
    detail.setText(entry.value());
    detail.setCaretPosition(0);
  }

  private void applyFilter() {
    String query = search.getText().toLowerCase(Locale.ROOT);
    sorter.setRowFilter(
        query.isEmpty()
            ? null
            : new RowFilter<EntryTable, Integer>() {
              @Override
              public boolean include(RowFilter.Entry<? extends EntryTable, ? extends Integer> row) {
                var entry = model.entries.get(row.getIdentifier());
                return List.of(
                        entry.path(), entry.kind(), entry.name(), entry.namespace(), entry.value())
                    .stream()
                    .anyMatch(value -> value.toLowerCase(Locale.ROOT).contains(query));
              }
            });
    updateCount();
  }

  private void updateCount() {
    count.setText(table.getRowCount() + " / " + model.entries.size());
  }

  int displayedEntries() {
    return table.getRowCount();
  }

  String disclaimerText() {
    return disclaimer.getText();
  }

  void embedded() {
    disclaimer.setVisible(false);
  }

  void filter(String text) {
    search.setText(text);
  }

  void selectEntry(int modelIndex) {
    int row = table.convertRowIndexToView(modelIndex);
    if (row >= 0) table.setRowSelectionInterval(row, row);
  }

  String selectedValue() {
    return detail.getText();
  }

  String sourceText() {
    return source.getText();
  }

  int viewCount() {
    return tabs.getTabCount();
  }

  void selectView(int index) {
    tabs.setSelectedIndex(index);
  }

  String renderedValue(int modelIndex) {
    int row = table.convertRowIndexToView(modelIndex);
    Component component = table.prepareRenderer(table.getCellRenderer(row, 2), row, 2);
    if (!Boolean.TRUE.equals(((JLabel) component).getClientProperty("html.disable")))
      throw new IllegalStateException("HTML rendering enabled");
    return ((JLabel) component).getText();
  }

  private static final class EntryTable extends AbstractTableModel {
    private static final long serialVersionUID = 1L;
    private List<InvoiceFile.Entry> entries = List.of();
    private final String[] columns = {
      "XML-Name", "Knotentyp", "Wert (Kurzvorschau)", "Namespace", "Herkunftspfad"
    };

    public int getRowCount() {
      return entries.size();
    }

    public int getColumnCount() {
      return columns.length;
    }

    public String getColumnName(int column) {
      return columns[column];
    }

    public Object getValueAt(int row, int column) {
      var entry = entries.get(row);
      return switch (column) {
        case 0 -> entry.name();
        case 1 -> entry.kind();
        case 2 -> entry.value();
        case 3 -> entry.namespace();
        default -> entry.path();
      };
    }
  }
}
