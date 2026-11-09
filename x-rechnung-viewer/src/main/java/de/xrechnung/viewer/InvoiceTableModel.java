package de.xrechnung.viewer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import javax.swing.table.AbstractTableModel;

/** Semantic rows, not XML nodes. Raw values remain separate from their display strings. */
public final class InvoiceTableModel extends AbstractTableModel {
  private static final long serialVersionUID = 1L;

  public record Row(
      String group,
      String label,
      String term,
      String displayed,
      String raw,
      String source,
      String key) {}

  private List<Row> rows = List.of();

  public void display(SemanticInvoice invoice) {
    var next = new ArrayList<Row>();
    flatten(invoice.root(), "Rechnungsdaten", invoice.root(), next);
    rows = List.copyOf(next);
    fireTableDataChanged();
  }

  private static void flatten(
      SemanticInvoice.Node parent, String scope, SemanticInvoice.Node root, List<Row> rows) {
    var totals = new HashMap<String, Integer>();
    for (var child : parent.children())
      if (child.group()) totals.merge(child.id(), 1, Integer::sum);
    var indices = new HashMap<String, Integer>();
    for (var child : parent.children()) {
      if (child.group()) {
        int index = indices.merge(child.id(), 1, Integer::sum);
        String group = child.label() + (totals.get(child.id()) > 1 ? " " + index : "");
        flatten(child, parent.name().equals("invoice") ? group : scope + " › " + group, root, rows);
      } else {
        if (!child.value().isBlank())
          rows.add(
              new Row(
                  scope,
                  child.label(),
                  child.id(),
                  InvoiceFormat.field(child, root),
                  child.value(),
                  child.sourcePath(),
                  child.key()));
        for (var p : child.properties())
          if (!p.value().isBlank())
            rows.add(
                new Row(
                    scope,
                    child.label() + " · " + p.label(),
                    child.id(),
                    p.value(),
                    p.value(),
                    child.sourcePath(),
                    child.key() + "/@" + p.name()));
      }
    }
  }

  public List<Row> rows() {
    return rows;
  }

  @Override
  public int getRowCount() {
    return rows.size();
  }

  @Override
  public int getColumnCount() {
    return 3;
  }

  @Override
  public String getColumnName(int c) {
    return switch (c) {
      case 0 -> "Bereich";
      case 1 -> "Rechnungsangabe";
      default -> "Wert";
    };
  }

  @Override
  public Object getValueAt(int r, int c) {
    var row = rows.get(r);
    return switch (c) {
      case 0 -> row.group();
      case 1 -> row.label() + " · " + row.term();
      default -> row.displayed();
    };
  }
}
