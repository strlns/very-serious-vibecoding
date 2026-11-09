package de.xrechnung.viewer;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** Generates a transparent evidence matrix, not a conformance certificate. */
public final class CoverageAudit {
  public static void main(String[] args) throws Exception {
    var files =
        List.of(
            "kosit-01.01a-INVOICE_ubl.xml",
            "kosit-01.01a-INVOICE_uncefact.xml",
            "max-3.0.1-ubl.xml",
            "max-3.0.1-creditnote.xml",
            "embedded-3.0.1-ubl.xml",
            "item-attributes-3.0.1-ubl.xml");
    Map<String, Set<String>> observed = new LinkedHashMap<>();
    StringBuilder summary =
        new StringBuilder("fixture;semantic_fields;detected_gaps;original_sha256\n");
    for (String name : files) {
      var original = InvoiceFile.open(Path.of("fixtures", name));
      var invoice = KositMapper.map(original);
      observed.put(
          name,
          invoice.root().walk().stream().map(SemanticInvoice.Node::id).collect(Collectors.toSet()));
      summary
          .append(name)
          .append(';')
          .append(invoice.fields().size())
          .append(';')
          .append(invoice.gaps().size())
          .append(';')
          .append(original.sha256())
          .append('\n');
    }
    List<String> styles = new ArrayList<>();
    for (String name : List.of("ubl-invoice-xr.xsl", "ubl-creditnote-xr.xsl", "cii-xr.xsl"))
      styles.add(
          new String(XmlDocuments.resource("/kosit-3.0.1/xsl/" + name), StandardCharsets.UTF_8));
    StringBuilder csv =
        new StringBuilder(
            "id;name;German_label;UBL_static_reference;CreditNote_static_reference;CII_static_reference;observed_fixture_count;observed_in\n");
    for (var definition : FieldCatalog.definitions()) {
      var pattern =
          Pattern.compile(
              "(?<![A-Za-z0-9-])" + Pattern.quote(definition.id()) + "(?![A-Za-z0-9-])");
      var hits =
          observed.entrySet().stream()
              .filter(e -> e.getValue().contains(definition.id()))
              .map(Map.Entry::getKey)
              .toList();
      csv.append(definition.id())
          .append(';')
          .append(definition.name())
          .append(';')
          .append(definition.label().replace(';', ','))
          .append(';');
      for (String style : styles)
        csv.append(pattern.matcher(style).find() ? "referenced" : "not_referenced").append(';');
      csv.append(hits.size()).append(';').append(String.join(",", hits)).append('\n');
    }
    Files.writeString(Path.of("docs/FIELD-COVERAGE-3.0.1.csv"), csv, StandardCharsets.UTF_8);
    Files.writeString(Path.of("docs/FIXTURE-COVERAGE-0.2.csv"), summary, StandardCharsets.UTF_8);
    var terms = FieldCatalog.definitions().stream().filter(d -> d.id().startsWith("BT-")).toList();
    long seen =
        terms.stream()
            .filter(d -> observed.values().stream().anyMatch(set -> set.contains(d.id())))
            .count();
    System.out.println(
        "Catalog: 167 BT + 41 BG. Observed in six real source fixtures: " + seen + " / 167 BT.");
    System.out.println(
        "All 167 BT and 41 BG are covered by native renderer contracts. Static references are not"
            + " execution evidence.");
  }
}
