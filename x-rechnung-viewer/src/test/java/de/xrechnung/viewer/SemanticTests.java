package de.xrechnung.viewer;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public final class SemanticTests {
  private static int passed, failed;
  private static final String XR = "urn:ce.eu:en16931:2017:xoev-de:kosit:standard:xrechnung-1";
  private static final String UBL = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";
  private static final String CBC =
      "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";

  @FunctionalInterface
  interface Checked {
    void run() throws Exception;
  }

  public static void main(String[] args) throws Exception {
    test(
        "all 167 BTs and 41 BGs of the pinned 3.0.1 model have German labels",
        SemanticTests::catalog);
    test("UBL invoice uses official mapping and keeps original", SemanticTests::ubl);
    test("CII invoice uses official mapping", SemanticTests::cii);
    test("credit note is mapped as credit note", SemanticTests::credit);
    test(
        "every catalog field can pass through the semantic model with all properties",
        SemanticTests::allFields);
    test("unknown input value is an explicit gap", SemanticTests::unknown);
    test("unambiguous empty optional element is not a gap", SemanticTests::empty);
    test("unknown nonempty attribute remains a gap", SemanticTests::attribute);
    test("repeated groups are retained individually", SemanticTests::repeats);
    test("technical status never asserts validation", SemanticTests::status);
    test(
        "VAT context is represented but a future value VAT is not hidden",
        SemanticTests::vatContext);
    test("unknown empty presence element is not assumed optional", SemanticTests::unknownEmpty);
    test("split text and CDATA are one represented source value", SemanticTests::splitText);
    test("unknown empty attribute is not assumed a default", SemanticTests::emptyAttribute);
    test(
        "currency attribute on a note is not silently treated as money",
        SemanticTests::misplacedCurrency);
    test(
        "tax currency cannot hide a conflicting payable currency",
        SemanticTests::conflictingCurrency);
    test("official embedded attachments retain full data and metadata", SemanticTests::attachments);
    test("official item attributes are human-readable fields", SemanticTests::itemAttributes);
    test(
        "a matching separate VAT accounting currency remains supported",
        SemanticTests::taxCurrency);
    test("a parent line never borrows a missing amount from its subline", SemanticTests::lineScope);
    test(
        "empty CII delivery container carries no unrepresented data",
        SemanticTests::emptyCiiDelivery);
    test(
        "allowance discriminator is represented by its mapped business group",
        SemanticTests::chargeContext);
    test("Rechnora CII price bases have exact values, units and source evidence", SemanticTests::priceBases);
    test("CII price bases keep line scope, precision and unknown attributes", SemanticTests::priceBaseVariants);
    test("UBL date mapping preserves times and offsets with explicit diagnostics", SemanticTests::extendedUblDates);
    test("CII date mapping preserves time-bearing source and flags its format", SemanticTests::extendedCiiDates);
    System.out.println("RESULT: " + passed + " semantic contracts passed, " + failed + " failed");
    if (failed > 0) System.exit(1);
  }

  private static void priceBases() throws Exception {
    for (String name : List.of("rechnung-gemischte-steuersaetze.xml",
        "rechnung-gemischte-steuersaetze2.xml", "rechnung-reverse-charge.xml")) {
      var file = InvoiceFile.open(Path.of("fixtures/Rechnora/" + name));
      var before = file.originalBytes();
      var invoice = KositMapper.map(file);
      equal(0, invoice.gaps().size());
      for (var line : invoice.root().all("BG-25")) {
        equal("1", line.value("BT-149"));
        equal("H87", line.value("BT-150"));
        var table = new InvoiceTableModel();
        table.display(invoice);
        check(table.rows().stream().anyMatch(r -> r.term().equals("BT-150") && r.raw().equals("H87")), "unit missing in compact view");
      }
      javax.swing.SwingUtilities.invokeAndWait(() -> {
        var paper = new InvoicePaper(); paper.display(invoice);
        for (var field : invoice.fields())
          if (!field.value().isBlank()) check(paper.renderedKeys().contains(field.key()), "paper missing " + field.id());
      });
      check(Arrays.equals(before, file.originalBytes()), "source changed");
    }
  }

  private static void priceBaseVariants() throws Exception {
    String source = java.nio.file.Files.readString(Path.of("fixtures/Rechnora/rechnung-gemischte-steuersaetze2.xml"));
    String changed = source.replaceFirst("<ram:BasisQuantity unitCode=\"H87\">1</ram:BasisQuantity>",
        "<ram:BasisQuantity unitCode=\"C62\" extra=\"inspect-me\">10.000</ram:BasisQuantity>");
    // Alternate prefixes must not change business meaning.
    var invoice = KositMapper.map(InvoiceFile.parse(changed.getBytes(StandardCharsets.UTF_8)));
    var lines = invoice.root().all("BG-25");
    equal("10.000", lines.get(0).value("BT-149"));
    equal("C62", lines.get(0).value("BT-150"));
    equal("1", lines.get(1).value("BT-149"));
    equal("H87", lines.get(1).value("BT-150"));
    equal(1, invoice.gaps().size());
    equal("inspect-me", invoice.gaps().get(0).value());
    var alias = KositMapper.map(InvoiceFile.parse(changed.replace("ram:", "alt:")
        .replace("xmlns:ram=", "xmlns:alt=").getBytes(StandardCharsets.UTF_8)));
    equal("10.000", alias.root().all("BG-25").get(0).value("BT-149"));
    equal("C62", alias.root().all("BG-25").get(0).value("BT-150"));
    check(alias.gaps().stream().noneMatch(g -> g.sourcePath().contains("BasisQuantity")
        && !g.value().equals("inspect-me")), "aliased price base reported as missing");
    String gross = source.replace("</ram:SpecifiedLineTradeAgreement>",
        "<ram:GrossPriceProductTradePrice><ram:BasisQuantity unitCode=\"KGM\">7</ram:BasisQuantity></ram:GrossPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>");
    var conflict = KositMapper.map(InvoiceFile.parse(gross.getBytes(StandardCharsets.UTF_8)));
    equal("1", conflict.root().all("BG-25").get(0).value("BT-149"));
    equal("H87", conflict.root().all("BG-25").get(0).value("BT-150"));
    equal(6, conflict.gaps().size()); // Three unrepresented gross bases and their units remain visible.
    String absent = source.replace("<ram:BasisQuantity unitCode=\"H87\">1</ram:BasisQuantity>", "");
    var missing = KositMapper.map(InvoiceFile.parse(absent.getBytes(StandardCharsets.UTF_8)));
    for (var line : missing.root().all("BG-25")) {
      equal("", line.value("BT-149")); equal("", line.value("BT-150"));
    }
  }

  private static void extendedUblDates() throws Exception {
    for(String value:List.of("2026-11-09T00:30:00+14:00","2026-11-09Z","2026-11-09-12:00","2026-11-09T02:30:00","2026-02-30")) {
      var source=InvoiceFile.parse(new String(minimal("").originalBytes(),StandardCharsets.UTF_8)
          .replace("2026-11-08",value).getBytes(StandardCharsets.UTF_8));
      byte[] before=source.originalBytes();var invoice=KositMapper.map(source);
      equal(value,invoice.root().value("BT-2"));
      check(invoice.gaps().stream().anyMatch(g -> g.value().equals(value) && g.reason().contains("Kalenderdatum")),"missing date-format warning");
      check(Arrays.equals(before,source.originalBytes()),"original changed");
    }
    String credit=java.nio.file.Files.readString(Path.of("fixtures/max-3.0.1-creditnote.xml"));
    var xml=XmlDocuments.parse(credit.getBytes(StandardCharsets.UTF_8));
    var issue=xml.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2","IssueDate").item(0);
    String value="2026-11-09T00:30:00+14:00";
    var modified=InvoiceFile.parse(credit.replace(issue.getTextContent(),value).getBytes(StandardCharsets.UTF_8));
    equal(value,KositMapper.map(modified).root().value("BT-2"));
  }
  private static void extendedCiiDates() throws Exception {
    String text=java.nio.file.Files.readString(Path.of("fixtures/Rechnora/rechnung-gemischte-steuersaetze2.xml"));
    String value="20260717T003000+1400";
    var file=InvoiceFile.parse(text.replace(">20260717<",">"+value+"<").getBytes(StandardCharsets.UTF_8));
    var invoice=KositMapper.map(file);
    equal(value,invoice.root().value("BT-2"));
    check(invoice.gaps().stream().anyMatch(g -> g.value().equals(value) && g.reason().contains("Kalenderdatum")),"missing CII date warning");
    // Unsupported CII date format is not guessed; its full source must remain a gap.
    var other=InvoiceFile.parse(text.replace("format=\"102\">20260717", "format=\"203\">20260717003000").getBytes(StandardCharsets.UTF_8));
    var unsupported=KositMapper.map(other);
    check(unsupported.gaps().stream().anyMatch(g -> g.value().equals("20260717003000")),"unsupported CII time lost");
  }

  private static void catalog() {
    var defs = FieldCatalog.definitions();
    equal(208, defs.size());
    equal(167L, defs.stream().filter(d -> d.id().startsWith("BT-")).count());
    equal(41L, defs.stream().filter(d -> d.id().startsWith("BG-")).count());
    for (var d : defs)
      check(!d.label().isBlank() && !d.label().contains("_"), "untranslated " + d.id());
    equal("Rechnungsnummer", FieldCatalog.find("Invoice_number").label());
    equal("Fremdforderungen", FieldCatalog.find("THIRD_PARTY_PAYMENT").label());
  }

  private static void ubl() throws Exception {
    var f = InvoiceFile.open(Path.of("fixtures/kosit-01.01a-INVOICE_ubl.xml"));
    byte[] before = f.originalBytes();
    var s = KositMapper.map(f);
    equal("123456XX", s.root().value("BT-1"));
    equal("2016-04-04", s.root().value("BT-2"));
    equal("288.79", s.root().all("BG-25").get(0).value("BT-146"));
    equal("[Seller name]", s.root().value("BT-27"));
    equal("[Buyer name]", s.root().value("BT-44"));
    equal("EUR", s.root().value("BT-5"));
    equal("336.9", s.root().value("BT-115"));
    check(Arrays.equals(before, f.originalBytes()), "original modified");
    check(s.fields().size() > 35, "too few semantic fields");
  }

  private static void cii() throws Exception {
    var s =
        KositMapper.map(InvoiceFile.open(Path.of("fixtures/kosit-01.01a-INVOICE_uncefact.xml")));
    equal("123456XX", s.root().value("BT-1"));
    equal("2016-04-04", s.root().value("BT-2"));
    equal("[Seller name]", s.root().value("BT-27"));
    equal("[Buyer name]", s.root().value("BT-44"));
    equal("EUR", s.root().value("BT-5"));
    equal("336.9", s.root().value("BT-115"));
  }

  private static void credit() throws Exception {
    var s = KositMapper.map(InvoiceFile.open(Path.of("fixtures/max-3.0.1-creditnote.xml")));
    equal("381", s.root().value("BT-3"));
    check(!s.root().all("BG-25").isEmpty(), "credit lines absent");
  }

  private static void allFields() {
    var defs = FieldCatalog.definitions().stream().filter(d -> d.id().startsWith("BT-")).toList();
    check(defs.size() == 167, "catalog unavailable");
    StringBuilder xml = new StringBuilder("<xr:invoice xmlns:xr='" + XR + "'>");
    for (var d : defs)
      xml.append("<xr:")
          .append(d.name())
          .append(" xr:id='")
          .append(d.id())
          .append(
              "' xr:src='/source' scheme_identifier='S' filename='a.pdf'"
                  + " mime_code='application/pdf'>")
          .append("VALUE-")
          .append(d.id())
          .append("</xr:")
          .append(d.name())
          .append('>');
    xml.append("</xr:invoice>");
    var model = KositMapper.readModel(xml.toString().getBytes(StandardCharsets.UTF_8));
    for (var d : defs) {
      var n = model.all(d.id()).get(0);
      equal("VALUE-" + d.id(), n.value());
      equal(3, n.properties().size());
      equal(d.label(), n.label());
    }
  }

  private static void unknown() {
    var s =
        KositMapper.map(
            minimal("<extra:Future xmlns:extra='urn:future'>DO-NOT-DROP</extra:Future>"));
    check(
        s.gaps().stream().anyMatch(g -> g.value().equals("DO-NOT-DROP")),
        "unknown value silently omitted");
  }

  private static void empty() {
    var s = KositMapper.map(minimal("<cbc:Note>  </cbc:Note>"));
    check(
        s.gaps().stream().noneMatch(g -> g.value().isBlank() && g.sourcePath().contains("Note")),
        "empty optional note counted");
  }

  private static void attribute() {
    var s = KositMapper.map(minimal("<cbc:Note future='KEEP-ATTRIBUTE'>Note</cbc:Note>"));
    check(
        s.gaps().stream().anyMatch(g -> g.value().equals("KEEP-ATTRIBUTE")),
        "unknown attribute dropped");
  }

  private static void repeats() throws Exception {
    var s = KositMapper.map(InvoiceFile.open(Path.of("fixtures/kosit-01.01a-INVOICE_ubl.xml")));
    check(s.root().all("BG-25").size() >= 2, "line groups collapsed");
    Set<String> keys =
        s.root().walk().stream().map(SemanticInvoice.Node::key).collect(Collectors.toSet());
    equal(s.root().walk().size(), keys.size());
  }

  private static void status() {
    var s = KositMapper.map(minimal(""));
    check(s.status().contains("Nicht validiert"), "validation overclaim");
  }

  private static void vatContext() throws Exception {
    var normal =
        KositMapper.map(InvoiceFile.open(Path.of("fixtures/kosit-01.01a-INVOICE_ubl.xml")));
    check(
        normal.gaps().stream().noneMatch(g -> g.value().equals("VAT")),
        "VAT context not represented");
    var future =
        KositMapper.map(minimal("<future:Value xmlns:future='urn:future'>VAT</future:Value>"));
    check(
        future.gaps().stream().anyMatch(g -> g.value().equals("VAT")), "unknown VAT value hidden");
  }

  private static void unknownEmpty() {
    var s = KositMapper.map(minimal("<future:PresenceFlag xmlns:future='urn:future'/>"));
    check(
        s.gaps().stream().anyMatch(g -> g.sourcePath().contains("PresenceFlag")),
        "unknown presence semantics ignored");
  }

  private static void splitText() {
    var s = KositMapper.map(minimal("<cbc:Note>eins<![CDATA[ zwei]]> drei</cbc:Note>"));
    equal("eins zwei drei", s.root().value("BT-22"));
    check(
        s.gaps().stream().noneMatch(g -> g.sourcePath().contains("Note")),
        "one represented note counted as multiple gaps");
  }

  private static void emptyAttribute() {
    var s = KositMapper.map(minimal("<cbc:Note future=''>Note</cbc:Note>"));
    check(
        s.gaps().stream().anyMatch(g -> g.sourcePath().contains("future")),
        "unknown empty attribute hidden");
  }

  private static void misplacedCurrency() {
    var s = KositMapper.map(minimal("<cbc:Note currencyID='EUR'>Note</cbc:Note>"));
    check(
        s.gaps().stream().anyMatch(g -> g.sourcePath().contains("currencyID")),
        "unsupported annotation hidden");
  }

  private static void conflictingCurrency() {
    var s =
        KositMapper.map(
            minimal(
                "<cbc:TaxCurrencyCode>USD</cbc:TaxCurrencyCode><cac:LegalMonetaryTotal"
                    + " xmlns:cac='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'><cbc:PayableAmount"
                    + " currencyID='USD'>12.00</cbc:PayableAmount></cac:LegalMonetaryTotal>"));
    check(
        s.gaps().stream()
            .anyMatch(g -> g.value().equals("USD") && g.sourcePath().contains("currencyID")),
        "conflicting invoice currency silently hidden by tax currency");
  }

  private static void attachments() throws Exception {
    var s = KositMapper.map(InvoiceFile.open(Path.of("fixtures/embedded-3.0.1-ubl.xml")));
    var data = s.root().all("BT-125");
    equal(2, data.size());
    equal(17980, data.get(0).value().length());
    equal(17976, data.get(1).value().length());
    equal(
        "48dd1332013a544ea5d38520d4180bf3aa03a7a746c52a211bd6c08030034327",
        java.util.HexFormat.of()
            .formatHex(
                java.security.MessageDigest.getInstance("SHA-256")
                    .digest(data.get(0).value().getBytes(StandardCharsets.UTF_8))));
    equal(
        "839738e4f6495f8dba37586171179a93511377eb146392a7a10ac39344d7cf9f",
        java.util.HexFormat.of()
            .formatHex(
                java.security.MessageDigest.getInstance("SHA-256")
                    .digest(data.get(1).value().getBytes(StandardCharsets.UTF_8))));
    check(
        data.get(0).properties().stream()
            .anyMatch(p -> p.name().equals("filename") && p.value().equals("01_15_Anhang_01.pdf")),
        "filename missing");
    check(
        data.get(0).properties().stream()
            .anyMatch(p -> p.name().equals("mime_code") && p.value().equals("application/pdf")),
        "mime missing");
  }

  private static void itemAttributes() throws Exception {
    var s = KositMapper.map(InvoiceFile.open(Path.of("fixtures/item-attributes-3.0.1-ubl.xml")));
    equal(1, s.root().all("BT-160").size());
    equal(1, s.root().all("BT-161").size());
    equal("Property Name", s.root().value("BT-160"));
    equal("Property value", s.root().value("BT-161"));
  }

  private static void taxCurrency() {
    var s =
        KositMapper.map(
            minimal(
                "<cbc:TaxCurrencyCode>USD</cbc:TaxCurrencyCode><cac:TaxTotal"
                    + " xmlns:cac='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'><cbc:TaxAmount"
                    + " currencyID='EUR'>10.00</cbc:TaxAmount></cac:TaxTotal><cac:TaxTotal"
                    + " xmlns:cac='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'><cbc:TaxAmount"
                    + " currencyID='USD'>11.00</cbc:TaxAmount></cac:TaxTotal><cac:LegalMonetaryTotal"
                    + " xmlns:cac='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'><cbc:PayableAmount"
                    + " currencyID='EUR'>12.00</cbc:PayableAmount></cac:LegalMonetaryTotal>"));
    equal("11.00", s.root().value("BT-111"));
    check(
        s.gaps().stream().noneMatch(g -> g.sourcePath().contains("currencyID")),
        "matching tax currency falsely reported");
  }

  private static void lineScope() {
    var amount =
        new SemanticInvoice.Node(
            "a",
            "Invoice_line_net_amount",
            "BT-131",
            "Positionsbetrag",
            "999.00",
            "/source",
            "xr:amount",
            List.of(),
            List.of());
    var child =
        new SemanticInvoice.Node(
            "c",
            "SUB_INVOICE_LINE",
            "BG-DEX-01",
            "Unterposition",
            "",
            "/source",
            "",
            List.of(),
            List.of(amount));
    var parent =
        new SemanticInvoice.Node(
            "p",
            "INVOICE_LINE",
            "BG-25",
            "Rechnungsposition",
            "",
            "/source",
            "",
            List.of(),
            List.of(child));
    equal("", parent.value("BT-131"));
    equal("999.00", child.value("BT-131"));
    equal(1, parent.all("BT-131").size());
  }

  private static void emptyCiiDelivery() throws Exception {
    var invoice =
        KositMapper.map(InvoiceFile.open(Path.of("fixtures/kosit-01.01a-INVOICE_uncefact.xml")));
    check(
        invoice.gaps().stream()
            .noneMatch(g -> g.sourcePath().contains("ApplicableHeaderTradeDelivery")),
        "meaningless empty delivery container counted");
  }

  private static void chargeContext() {
    var invoice =
        KositMapper.map(
            minimal(
                "<cac:AllowanceCharge"
                    + " xmlns:cac='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:AllowanceChargeReason>Rabatt</cbc:AllowanceChargeReason><cbc:Amount"
                    + " currencyID='EUR'>1.00</cbc:Amount></cac:AllowanceCharge>"));
    equal(1, invoice.root().all("BG-20").size());
    check(
        invoice.gaps().stream().noneMatch(g -> g.value().equals("false")),
        "mapped allowance discriminator counted");
    var unknown =
        KositMapper.map(minimal("<future:Flag xmlns:future='urn:future'>false</future:Flag>"));
    check(
        unknown.gaps().stream().anyMatch(g -> g.value().equals("false")),
        "unknown boolean text hidden");
  }

  static InvoiceFile minimal(String more) {
    try {
      return InvoiceFile.parse(
          ("<Invoice xmlns='"
                  + UBL
                  + "' xmlns:cbc='"
                  + CBC
                  + "'><cbc:ID>R-1</cbc:ID><cbc:IssueDate>2026-11-08</cbc:IssueDate><cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode><cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>"
                  + more
                  + "</Invoice>")
              .getBytes(StandardCharsets.UTF_8));
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
  }

  private static void test(String label, Checked body) {
    try {
      body.run();
      passed++;
      System.out.println("PASS " + label);
    } catch (Throwable ex) {
      failed++;
      System.out.println("FAIL " + label + ": " + ex);
    }
  }

  static void check(boolean value, String msg) {
    if (!value) throw new AssertionError(msg);
  }

  static void equal(Object expected, Object actual) {
    check(expected.equals(actual), "expected " + expected + ", got " + actual);
  }
}
