package de.xrechnung.viewer;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.xml.XMLConstants;

/**
 * Conservative value-level evidence. A group source path NEVER covers an entire subtree by itself.
 */
final class SourceCoverage {
  private record Value(
      int id, String path, String owner, String name, String value, boolean attribute) {}

  static List<SemanticInvoice.Gap> gaps(InvoiceFile file, SemanticInvoice.Node model) {
    var entries = file.entries();
    var childElements = new HashMap<Integer, List<InvoiceFile.Entry>>();
    for (var e : entries)
      if (e.kind().equals("ELEMENT"))
        childElements.computeIfAbsent(e.parentId(), x -> new ArrayList<>()).add(e);
    var paths = new HashMap<Integer, String>();
    for (var e : entries)
      if (e.kind().equals("ELEMENT")) {
        var siblings =
            childElements.get(e.parentId()).stream()
                .filter(s -> s.name().equals(e.name()))
                .toList();
        int index = siblings.indexOf(e) + 1;
        paths.put(
            e.id(),
            paths.getOrDefault(e.parentId(), "")
                + "/"
                + e.name()
                + (siblings.size() > 1 ? "[" + index + "]" : ""));
      }
    var values = new ArrayList<Value>();
    var textByOwner = new HashMap<Integer, List<InvoiceFile.Entry>>();
    for (var e : entries)
      if ((e.kind().equals("TEXT") || e.kind().equals("CDATA")) && paths.containsKey(e.parentId()))
        textByOwner.computeIfAbsent(e.parentId(), x -> new ArrayList<>()).add(e);
    Set<Integer> visitedText = new HashSet<>();
    for (var e : entries) {
      if ((e.kind().equals("TEXT") || e.kind().equals("CDATA"))
          && paths.containsKey(e.parentId())
          && visitedText.add(e.parentId())) {
        String value =
            textByOwner.get(e.parentId()).stream()
                .map(InvoiceFile.Entry::value)
                .collect(java.util.stream.Collectors.joining());
        if (!value.isBlank())
          values.add(
              new Value(
                  e.id(),
                  entries.get(e.parentId()).path(),
                  paths.get(e.parentId()),
                  "",
                  value,
                  false));
      }
      if (e.kind().equals("ATTRIBUTE")
          && !e.namespace().equals(XMLConstants.XMLNS_ATTRIBUTE_NS_URI))
        values.add(
            new Value(
                e.id(), e.path(), paths.getOrDefault(e.parentId(), ""), e.name(), e.value(), true));
    }
    Map<String, List<Value>> bySource = new HashMap<>();
    for (var v : values)
      bySource
          .computeIfAbsent(
              v.attribute() ? v.owner() + "/@" + v.name() : v.owner(), x -> new ArrayList<>())
          .add(v);
    Set<Integer> covered = new HashSet<>();
    Set<String> coveredOwners = new HashSet<>();
    Map<String, List<SemanticInvoice.Node>> represented = new HashMap<>();
    for (var field : model.walk()) {
      if (field.group() || field.value().isBlank() || field.sourcePath().isBlank()) continue;
      List<Value> direct =
          bySource.getOrDefault(field.sourcePath(), List.of()).stream()
              .filter(v -> equivalent(v.value(), field.value(), field.type()))
              .toList();
      List<Value> selected = direct;
      if (selected.isEmpty()) {
        // Some official BT references point to a containing group. Only an unambiguous value is
        // evidence.
        var candidates =
            values.stream()
                .filter(
                    v ->
                        !v.attribute()
                            && (v.owner().equals(field.sourcePath())
                                || v.owner().startsWith(field.sourcePath() + "/"))
                            && equivalent(v.value(), field.value(), field.type()))
                .toList();
        if (candidates.size() == 1) selected = candidates;
      }
      for (var value : selected) {
        covered.add(value.id());
        coveredOwners.add(value.owner());
        represented.computeIfAbsent(value.owner(), x -> new ArrayList<>()).add(field);
      }
      for (var value : selected)
        for (var property : field.properties()) {
          String original =
              switch (property.name()) {
                case "scheme_identifier" -> "schemeID|listID";
                case "scheme_version_identifier" -> "schemeVersionID|listVersionID";
                case "mime_code" -> "mimeCode";
                default -> property.name();
              };
          for (var attr : values)
            if (attr.attribute()
                && attr.owner().equals(value.owner())
                && List.of(original.split("\\|")).contains(attr.name())
                && attr.value().equals(property.value())) covered.add(attr.id());
        }
    }
    for (var value : values)
      if (value.attribute() && coveredOwners.contains(value.owner())) {
        var monetary =
            represented.getOrDefault(value.owner(), List.of()).stream()
                .filter(
                    n -> n.type().equals("xr:amount") || n.type().equals("xr:unit_price_amount"))
                .toList();
        if (value.name().equals("currencyID")
            && !value.value().isBlank()
            && !monetary.isEmpty()
            && monetary.stream()
                .allMatch(
                    n ->
                        value
                            .value()
                            .equals(model.value(n.id().equals("BT-111") ? "BT-6" : "BT-5"))))
          covered.add(value.id());
        if (value.name().equals("format")
            && value.value().equals("102")
            && represented.getOrDefault(value.owner(), List.of()).stream()
                .anyMatch(n -> n.type().equals("xr:date"))) covered.add(value.id());
        if (value.name().equals("xml:space") && value.value().equals("preserve"))
          covered.add(value.id());
      }
    // Explicit syntax discriminators: VAT is represented by the named VAT business terms,
    // only in its exact UBL/CII tax context and only if that context has mapped data.
    String cbc = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
    String cac = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";
    String ram =
        "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100";
    for (var value : values)
      if (!value.attribute() && value.value().equals("VAT")) {
        var leaf = entries.get(entries.get(value.id()).parentId());
        var parent = leaf.parentId() < 0 ? null : entries.get(leaf.parentId());
        String context = null;
        if (parent != null
            && leaf.namespace().equals(cbc)
            && local(leaf.name()).equals("ID")
            && parent.namespace().equals(cac)
            && local(parent.name()).equals("TaxScheme")) context = paths.get(parent.parentId());
        if (parent != null
            && leaf.namespace().equals(ram)
            && local(leaf.name()).equals("TypeCode")
            && parent.namespace().equals(ram)
            && local(parent.name()).equals("ApplicableTradeTax")) context = paths.get(parent.id());
        if (context != null) {
          String prefix = context + "/";
          if (coveredOwners.stream().anyMatch(p -> p.startsWith(prefix))) covered.add(value.id());
        }
      }
    // The boolean selects allowance versus charge; the mapped BG heading represents it.
    for (var value : values) {
      if (value.attribute() || !(value.value().equals("true") || value.value().equals("false")))
        continue;
      var leaf = entries.get(entries.get(value.id()).parentId());
      var parent = leaf.parentId() < 0 ? null : entries.get(leaf.parentId());
      if (parent == null
          || !leaf.namespace().equals(cbc)
          || !local(leaf.name()).equals("ChargeIndicator")
          || !parent.namespace().equals(cac)
          || !local(parent.name()).equals("AllowanceCharge")) continue;
      var groups =
          value.value().equals("true")
              ? List.of("BG-21", "BG-28", "BG-DEX-04")
              : List.of("BG-20", "BG-27", "BG-DEX-03");
      String groupPath = paths.get(parent.id());
      if (groups.stream()
          .flatMap(id -> model.all(id).stream())
          .anyMatch(n -> n.sourcePath().equals(groupPath))) covered.add(value.id());
    }
    var gaps = new ArrayList<SemanticInvoice.Gap>();
    for (var value : values)
      if (!covered.contains(value.id()))
        gaps.add(
            new SemanticInvoice.Gap(
                value.attribute()
                    ? "Attribut nicht nachweisbar fachlich zugeordnet"
                    : "Quelldaten nicht nachweisbar fachlich zugeordnet",
                value.path(),
                value.value()));
    Set<String> knownEmpty = new HashSet<>();
    for (var field : model.walk())
      if (!field.group() && field.value().isBlank()) knownEmpty.add(field.sourcePath());
    Set<Integer> dataOwners = new HashSet<>();
    for (var value : values) dataOwners.add(entries.get(value.id()).parentId());
    for (var entry : entries)
      if (entry.kind().equals("ELEMENT")
          && !childElements.containsKey(entry.id())
          && !dataOwners.contains(entry.id())
          && !emptyCiiDelivery(entry, entries)
          && !knownEmpty.contains(paths.get(entry.id())))
        gaps.add(
            new SemanticInvoice.Gap(
                "Bedeutung des leeren Elements ungeklärt; nicht als optionaler Standard"
                    + " vorausgesetzt",
                entry.path(),
                ""));
    return List.copyOf(gaps);
  }

  private static boolean emptyCiiDelivery(
      InvoiceFile.Entry entry, List<InvoiceFile.Entry> entries) {
    if (!entry
            .namespace()
            .equals(
                "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100")
        || !local(entry.name()).equals("ApplicableHeaderTradeDelivery")
        || entry.parentId() < 0) return false;
    var parent = entries.get(entry.parentId());
    return parent.namespace().equals("urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100")
        && local(parent.name()).equals("SupplyChainTradeTransaction");
  }

  private static String local(String name) {
    int colon = name.indexOf(':');
    return colon < 0 ? name : name.substring(colon + 1);
  }

  private static boolean equivalent(String source, String result, String type) {
    if (source.equals(result)) return true;
    if (type.equals("xr:date"))
      try {
        return LocalDate.parse(source, DateTimeFormatter.BASIC_ISO_DATE).toString().equals(result);
      } catch (Exception ignored) {
      }
    return false;
  }

  private SourceCoverage() {}
}
