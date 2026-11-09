package de.xrechnung.viewer;

import java.awt.BorderLayout;
import javax.swing.*;
import javax.swing.table.DefaultTableCellRenderer;

public final class InvoiceTable extends JPanel {
  private static final long serialVersionUID = 1L;
  private final InvoiceTableModel model = new InvoiceTableModel();
  private final JTable table = new FullText.Table(model);
  private final JTextArea detail = new JTextArea(5, 60);
  private final JTextArea summary = new JTextArea();

  public InvoiceTable() {
    super(new BorderLayout(6, 6));
    setBorder(BorderFactory.createEmptyBorder(8, 10, 6, 10));
    summary.setEditable(false);
    summary.setOpaque(false);
    summary.setLineWrap(true);
    summary.setWrapStyleWord(true);
    add(summary, BorderLayout.NORTH);
    table.setAutoCreateRowSorter(true);
    table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
    table.setRowHeight(24);
    table.getColumnModel().getColumn(0).setPreferredWidth(200);
    table.getColumnModel().getColumn(1).setPreferredWidth(350);
    table.getColumnModel().getColumn(2).setPreferredWidth(350);
    table.setDefaultRenderer(
        Object.class,
        new DefaultTableCellRenderer() {
          private static final long serialVersionUID = 1L;

          @Override
          public java.awt.Component getTableCellRendererComponent(
              JTable t, Object value, boolean selected, boolean focus, int r, int c) {
            putClientProperty("html.disable", Boolean.TRUE);
            String full = String.valueOf(value);
            String shown = FullText.preview(full, 200);
            return super.getTableCellRendererComponent(t, shown, selected, focus, r, c);
          }
        });
    detail.setEditable(false);
    detail.setLineWrap(true);
    detail.setWrapStyleWord(true);
    table
        .getSelectionModel()
        .addListSelectionListener(
            e -> {
              int selected = table.getSelectedRow();
              if (selected >= 0) {
                var row = model.rows().get(table.convertRowIndexToModel(selected));
                detail.setText(
                    row.group()
                        + " · "
                        + row.label()
                        + " · "
                        + row.term()
                        + "\nAnzeige: "
                        + row.displayed()
                        + "\nUnformatierter Modellwert:\n"
                        + row.raw()
                        + "\nQuellenverweis: "
                        + row.source());
                detail.setCaretPosition(0);
              }
            });
    var tableScroll = new JScrollPane(table);
    tableScroll.setColumnHeaderView(table.getTableHeader());
    var split = new JSplitPane(JSplitPane.VERTICAL_SPLIT, tableScroll, new JScrollPane(detail));
    split.setResizeWeight(.8);
    add(split, BorderLayout.CENTER);
  }

  void display(SemanticInvoice invoice) {
    model.display(invoice);
    var r = invoice.root();
    summary.setText(
        (r.value("BT-3").equals("381") ? "Gutschrift " : "Rechnung ")
            + r.value("BT-1")
            + "  ·  "
            + InvoiceFormat.date(r.value("BT-2"))
            + "\n"
            + r.value("BT-27")
            + " → "
            + r.value("BT-44")
            + "   ·   Zahlbetrag: "
            + InvoiceFormat.money(r.value("BT-115"), r.value("BT-5")));
    if (model.getRowCount() > 0) table.setRowSelectionInterval(0, 0);
    else detail.setText("");
  }
}
