package de.xrechnung.viewer;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.w3c.dom.Element;

public final class FieldCatalog {
  public record Definition(
      String name, String id, String label, String type, String documentation) {}

  private static final String XS = "http://www.w3.org/2001/XMLSchema";
  private static final Map<String, String> GROUPS =
      Map.ofEntries(
          Map.entry("BG-1", "Rechnungsbemerkungen"),
          Map.entry("BG-2", "Prozess und Spezifikation"),
          Map.entry("BG-3", "Vorausgegangene Rechnungen"),
          Map.entry("BG-4", "Verkäufer"),
          Map.entry("BG-5", "Anschrift des Verkäufers"),
          Map.entry("BG-6", "Kontakt des Verkäufers"),
          Map.entry("BG-7", "Käufer"),
          Map.entry("BG-8", "Anschrift des Käufers"),
          Map.entry("BG-9", "Kontakt des Käufers"),
          Map.entry("BG-10", "Zahlungsempfänger"),
          Map.entry("BG-11", "Steuervertreter des Verkäufers"),
          Map.entry("BG-12", "Anschrift des Steuervertreters"),
          Map.entry("BG-13", "Lieferung"),
          Map.entry("BG-14", "Abrechnungszeitraum"),
          Map.entry("BG-15", "Lieferanschrift"),
          Map.entry("BG-16", "Zahlung"),
          Map.entry("BG-17", "Überweisung"),
          Map.entry("BG-18", "Kartenzahlung"),
          Map.entry("BG-19", "Lastschrift"),
          Map.entry("BG-20", "Nachlässe auf Rechnungsebene"),
          Map.entry("BG-21", "Zuschläge auf Rechnungsebene"),
          Map.entry("BG-22", "Rechnungssummen"),
          Map.entry("BG-23", "Umsatzsteueraufschlüsselung"),
          Map.entry("BG-24", "Rechnungsbegründende Unterlagen"),
          Map.entry("BG-25", "Rechnungsposition"),
          Map.entry("BG-26", "Leistungszeitraum der Position"),
          Map.entry("BG-27", "Nachlässe der Position"),
          Map.entry("BG-28", "Zuschläge der Position"),
          Map.entry("BG-29", "Preisangaben"),
          Map.entry("BG-30", "Umsatzsteuer der Position"),
          Map.entry("BG-31", "Artikelbeschreibung"),
          Map.entry("BG-32", "Artikeleigenschaften"),
          Map.entry("BG-DEX-01", "Unterposition"),
          Map.entry("BG-DEX-02", "Artikel der Unterposition"),
          Map.entry("BG-DEX-03", "Nachlässe der Unterposition"),
          Map.entry("BG-DEX-04", "Zuschläge der Unterposition"),
          Map.entry("BG-DEX-05", "Zeitraum der Unterposition"),
          Map.entry("BG-DEX-06", "Umsatzsteuer der Unterposition"),
          Map.entry("BG-DEX-07", "Preise der Unterposition"),
          Map.entry("BG-DEX-08", "Eigenschaften der Unterposition"),
          Map.entry("BG-DEX-09", "Fremdforderungen"));
  private static final Map<String, Definition> ALL = load();

  public static List<Definition> definitions() {
    return List.copyOf(ALL.values());
  }

  public static Definition find(String name) {
    return ALL.get(name);
  }

  static String propertyLabel(String name) {
    return switch (name) {
      case "scheme_identifier" -> "Kennungsschema";
      case "scheme_version_identifier" -> "Schemaversion";
      case "mime_code" -> "MIME-Typ";
      case "filename" -> "Dateiname";
      default -> name;
    };
  }

  private static Map<String, Definition> load() {
    try {
      var translations = XmlDocuments.parse(XmlDocuments.resource("/kosit-3.0.1/xsl/l10n/de.xml"));
      var labels = new LinkedHashMap<String, String>();
      var list = translations.getElementsByTagName("entry");
      for (int i = 0; i < list.getLength(); i++) {
        var e = (Element) list.item(i);
        labels.put(e.getAttribute("key"), e.getTextContent());
      }
      var schema =
          XmlDocuments.parse(
              XmlDocuments.resource("/kosit-3.0.1/xsd/xrechnung-semantic-model.xsd"));
      var elements = schema.getElementsByTagNameNS(XS, "element");
      var definitions = new LinkedHashMap<String, Definition>();
      for (int i = 0; i < elements.getLength(); i++) {
        var element = (Element) elements.item(i);
        Element annotation = null;
        for (var child = element.getFirstChild(); child != null; child = child.getNextSibling())
          if (child instanceof Element e && e.getLocalName().equals("annotation")) {
            annotation = e;
            break;
          }
        if (annotation == null) continue;
        var ids = annotation.getElementsByTagNameNS(XS, "appinfo");
        if (ids.getLength() == 0) continue;
        String id = ids.item(0).getTextContent().strip(), name = element.getAttribute("name");
        if (!id.startsWith("BT-") && !id.startsWith("BG-")) continue;
        String label = labels.get("xr:" + name);
        if (id.startsWith("BG-")) label = GROUPS.get(id);
        if (id.equals("BT-160")) label = "Name der Artikeleigenschaft";
        if (id.equals("BT-161")) label = "Wert der Artikeleigenschaft";
        if (label == null || label.isBlank())
          throw new IllegalStateException("Fehlende Übersetzung: " + id + " / " + name);
        var docs = annotation.getElementsByTagNameNS(XS, "documentation");
        String doc = docs.getLength() == 0 ? "" : docs.item(0).getTextContent();
        definitions.putIfAbsent(
            name, new Definition(name, id, label, element.getAttribute("type"), doc));
      }
      return java.util.Collections.unmodifiableMap(definitions);
    } catch (Exception ex) {
      throw new ExceptionInInitializerError(ex);
    }
  }
}
