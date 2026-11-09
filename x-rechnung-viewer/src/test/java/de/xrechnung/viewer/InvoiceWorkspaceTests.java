package de.xrechnung.viewer;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import javax.swing.SwingUtilities;

public final class InvoiceWorkspaceTests {
  public static void main(String[] args) throws Exception {
    var failure = new AtomicReference<Throwable>();
    SwingUtilities.invokeAndWait(
        () -> {
          try {
            run();
          } catch (Throwable ex) {
            failure.set(ex);
          }
        });
    if (failure.get() != null)
      throw new AssertionError("Invoice workspace contract", failure.get());
    System.out.println("RESULT: 11 invoice workspace contracts passed");
  }

  private static void run() throws Exception {
    inspectorContracts();
    var file = SemanticTests.minimal("");
    var mapped = KositMapper.map(file);
    var clean = new SemanticInvoice(mapped.root(), List.of(), mapped.status());
    var panel = new InvoiceWorkspace();
    panel.display(file, clean, "invoice.xml");
    SemanticTests.equal("Rechnung", panel.activeView());
    SemanticTests.check(panel.invoiceText().contains("R-1"), "no readable invoice number");
    SemanticTests.equal(InvoicePanel.DISCLAIMER, panel.disclaimerText());
    System.out.println("PASS paper invoice is primary and carries disclaimer");
    SemanticTests.equal(0, panel.gapCount());
    SemanticTests.check(!panel.gapsExpanded(), "empty gap inspector expanded");
    SemanticTests.check(panel.countText().contains("0"), "zero count absent");
    System.out.println("PASS no gaps means collapsed inspector and visible zero");
    var withGap =
        new SemanticInvoice(
            mapped.root(),
            List.of(new SemanticInvoice.Gap("Unzugeordnet", "/source", "KEEP")),
            mapped.status());
    panel.display(file, withGap, "invoice.xml");
    SemanticTests.equal(1, panel.gapCount());
    SemanticTests.check(panel.gapsExpanded(), "gaps not automatically expanded");
    System.out.println("PASS detected gap opens inspector automatically");
    panel.setGapsExpanded(false);
    SemanticTests.check(!panel.gapsExpanded(), "manual collapse failed");
    SemanticTests.equal(1, panel.gapCount());
    SemanticTests.check(panel.countText().contains("1"), "collapsed count absent");
    panel.setGapsExpanded(true);
    SemanticTests.check(panel.gapsExpanded(), "reopening failed");
    System.out.println("PASS collapsing preserves count and can be reversed");
    panel.display(file, clean, "next.xml");
    SemanticTests.check(!panel.gapsExpanded(), "new clean document must collapse");
    System.out.println("PASS expansion default resets per document");
    var all = new java.util.ArrayList<SemanticInvoice.Node>();
    for (var d : FieldCatalog.definitions())
      if (d.id().startsWith("BT-"))
        all.add(
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
    var root = new SemanticInvoice.Node("0", "invoice", "", "Rechnung", "", "", "", List.of(), all);
    var paper = new InvoicePaper();
    paper.display(new SemanticInvoice(root, List.of(), "Nicht validiert"));
    for (var n : all) {
      SemanticTests.check(paper.renderedKeys().contains(n.key()), "field unrendered: " + n.id());
      SemanticTests.check(
          paper.renderedValues().contains(n.value()), "field value lost: " + n.id());
      SemanticTests.check(
          paper.renderedValues().contains("SCHEME-" + n.id()), "attribute lost: " + n.id());
    }
    SemanticTests.equal(167, all.size());
    var groups = new java.util.ArrayList<SemanticInvoice.Node>();
    for (var d : FieldCatalog.definitions())
      if (d.id().startsWith("BG-"))
        groups.add(
            new SemanticInvoice.Node(
                d.id(),
                d.name(),
                d.id(),
                d.label(),
                "",
                "/source",
                "",
                List.of(),
                List.of(
                    new SemanticInvoice.Node(
                        "child-" + d.id(),
                        "Invoice_number",
                        "BT-1",
                        "Rechnungsnummer",
                        "GROUP-VALUE-" + d.id(),
                        "/source",
                        "xr:identifier",
                        List.of(),
                        List.of()))));
    paper.display(
        new SemanticInvoice(
            new SemanticInvoice.Node("0", "invoice", "", "Rechnung", "", "", "", List.of(), groups),
            List.of(),
            "Nicht validiert"));
    SemanticTests.equal(41, groups.size());
    for (var group : groups) {
      SemanticTests.check(
          paper.visibleText().contains(group.label()), "group missing: " + group.id());
      SemanticTests.check(
          paper.renderedValues().contains("GROUP-VALUE-" + group.id()), "group child missing");
    }
    System.out.println("PASS native renderer retains all 167 catalog field values and properties");
    String longValue = "<html>" + "Lange mehrzeilige Bemerkung €\n".repeat(500) + "</html>";
    var note =
        new SemanticInvoice.Node(
            "note",
            "Invoice_note",
            "BT-22",
            "Rechnungsbemerkung",
            longValue,
            "/source",
            "xr:text",
            List.of(),
            List.of());
    paper.display(
        new SemanticInvoice(
            new SemanticInvoice.Node(
                "0", "invoice", "", "Rechnung", "", "", "", List.of(), List.of(note)),
            List.of(),
            "Nicht validiert"));
    SemanticTests.check(
        paper.renderedValues().contains(longValue), "long or HTML-like text altered");
    System.out.println("PASS long and HTML-like values remain literal and complete");
    panel.setSize(1280, 900);
    for (int i = 0; i < 5; i++) layout(panel);
    SemanticTests.check(!panel.paperHasHorizontalOverflow(), "paper requires horizontal scrolling");
    System.out.println("PASS paper fits the available viewport width");
    var real = InvoiceFile.open(java.nio.file.Path.of("fixtures/kosit-01.01a-INVOICE_ubl.xml"));
    var realPaper = new InvoicePaper();
    realPaper.display(KositMapper.map(real));
    for (int width : new int[] {640, 940, 1040}) {
      for (int i = 0; i < 6; i++) {
        realPaper.setSize(width, realPaper.getPreferredSize().height);
        layout(realPaper);
      }
      var columns = realPaper.lineColumnPositions();
      SemanticTests.equal(3, columns.size());
      for (var row : columns) SemanticTests.equal(columns.get(0), row);
    }
    System.out.println("PASS header and all invoice rows align in identical columns");
  }

  private static void inspectorContracts() throws Exception {
    var file = SemanticTests.minimal("");
    var mapped = KositMapper.map(file);
    String path = "/Q{urn:test}Invoice[1]/Q{urn:test}InvoiceLine[2]/Q{urn:test}Extra[1]/@Q{}unitCode";
    String raw = "<html>" + "€😀\n".repeat(300) + "</html>";
    var panel = new InvoiceWorkspace();
    panel.display(file, new SemanticInvoice(mapped.root(), List.of(
        new SemanticInvoice.Gap("Attribut nicht nachweisbar fachlich zugeordnet", path, raw),
        new SemanticInvoice.Gap("Bedeutung des leeren Elements ungeklärt; nicht als optionaler Standard vorausgesetzt", "/Q{urn:test}Empty[1]", "")), mapped.status()), "test.xml");
    var list = (javax.swing.JList<?>) named(panel, "gap-list");
    var value = (javax.swing.JTextArea) named(panel, "gap-value");
    var source = (javax.swing.JTextArea) named(panel, "gap-source");
    SemanticTests.equal(raw, value.getText());
    SemanticTests.equal(path, source.getText());
    SemanticTests.check(!value.isEditable() && !source.isEditable(), "source details editable");
    SemanticTests.check(value.getCaretPosition() == 0, "value not reset to start");
    System.out.println("PASS inspector preserves literal full values and exact source paths");
    list.setSelectedIndex(1);
    SemanticTests.equal("", value.getText());
    SemanticTests.equal("/Q{urn:test}Empty[1]", source.getText());
    SemanticTests.check(((javax.swing.JLabel) named(panel, "gap-value-label")).getText().contains("leer"), "empty value not explained");
    panel.display(file, new SemanticInvoice(mapped.root(), List.of(), mapped.status()), "clean.xml");
    SemanticTests.equal(0, list.getModel().getSize());
    SemanticTests.equal("", source.getText());
    SemanticTests.equal("", value.getText());
    System.out.println("PASS inspector selection and reload never retain stale source details");
  }

  private static java.awt.Component named(java.awt.Component c, String name) {
    if (name.equals(c.getName())) return c;
    if (c instanceof java.awt.Container parent)
      for (var child : parent.getComponents()) {
        var found = named(child, name);
        if (found != null) return found;
      }
    return null;
  }

  private static void layout(java.awt.Component c) {
    if (c instanceof java.awt.Container p) {
      p.doLayout();
      for (var child : p.getComponents()) layout(child);
    }
  }
}
