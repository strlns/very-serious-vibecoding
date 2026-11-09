package de.xrechnung.viewer;

import java.util.ArrayList;
import java.util.List;

public final class CompactDataTests {
  public static void main(String[] args) {
    var fields = new ArrayList<SemanticInvoice.Node>();
    for (var d : FieldCatalog.definitions())
      if (d.id().startsWith("BT-"))
        fields.add(
            new SemanticInvoice.Node(
                d.id(),
                d.name(),
                d.id(),
                d.label(),
                "VALUE-" + d.id(),
                "/source",
                d.type(),
                List.of(
                    new SemanticInvoice.Property(
                        "scheme_identifier", "Kennungsschema", "SCHEME-" + d.id())),
                List.of()));
    var model = new InvoiceTableModel();
    model.display(invoice(fields));
    SemanticTests.equal(334, model.rows().size());
    for (var node : fields) {
      SemanticTests.check(
          model.rows().stream()
              .anyMatch(r -> r.key().equals(node.key()) && r.raw().equals(node.value())),
          "missing model value " + node.id());
      SemanticTests.check(
          model.rows().stream().anyMatch(r -> r.raw().equals("SCHEME-" + node.id())),
          "missing metadata " + node.id());
    }
    SemanticTests.check(!model.isCellEditable(0, 2), "editable data model");
    try {
      model.rows().clear();
      throw new AssertionError("mutable rows");
    } catch (UnsupportedOperationException expected) {
    }
    System.out.println(
        "PASS compact rows retain all 167 BT values, properties and read-only ownership");
    String raw = "<html>" + "Mehrzeilig €\n".repeat(1000) + "</html>";
    var note1 =
        new SemanticInvoice.Node(
            "note1",
            "Invoice_note",
            "BT-22",
            "Bemerkung",
            raw,
            "/source/one",
            "xr:text",
            List.of(),
            List.of());
    var note2 =
        new SemanticInvoice.Node(
            "note2",
            "Invoice_note",
            "BT-22",
            "Bemerkung",
            "other",
            "/source/two",
            "xr:text",
            List.of(),
            List.of());
    model.display(invoice(List.of(group("one", note1), group("two", note2))));
    SemanticTests.equal(2, model.rows().size());
    SemanticTests.check(
        !model.rows().get(0).group().equals(model.rows().get(1).group()), "repeated groups merged");
    SemanticTests.equal(raw, model.rows().get(0).raw());
    SemanticTests.equal(raw, model.rows().get(0).displayed());
    System.out.println(
        "PASS repeated groups and long HTML-like values remain distinct and complete");
    System.out.println("RESULT: 2 compact-data contracts passed");
  }

  private static SemanticInvoice.Node group(String key, SemanticInvoice.Node value) {
    return new SemanticInvoice.Node(
        key,
        "INVOICE_NOTE",
        "BG-1",
        "Rechnungsbemerkungen",
        "",
        "/source",
        "",
        List.of(),
        List.of(value));
  }

  private static SemanticInvoice invoice(List<SemanticInvoice.Node> children) {
    return new SemanticInvoice(
        new SemanticInvoice.Node(
            "root", "invoice", "", "Rechnung", "", "", "", List.of(), children),
        List.of(),
        "Nicht validiert");
  }
}
