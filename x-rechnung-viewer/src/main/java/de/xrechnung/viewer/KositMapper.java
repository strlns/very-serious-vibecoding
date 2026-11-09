package de.xrechnung.viewer;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import javax.xml.XMLConstants;
import javax.xml.transform.ErrorListener;
import javax.xml.transform.Templates;
import javax.xml.transform.TransformerException;
import javax.xml.transform.dom.DOMResult;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamSource;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

public final class KositMapper {
  static final String XR = "urn:ce.eu:en16931:2017:xoev-de:kosit:standard:xrechnung-1";
  private static final EnumMap<InvoiceFile.Syntax, Templates> CACHE =
      new EnumMap<>(InvoiceFile.Syntax.class);

  public static SemanticInvoice map(InvoiceFile file) {
    String status = "Ziel: XRechnung 3.0.1 · KoSIT-Visualisierung 2023-11-15 · Nicht validiert";
    try {
      if (file.syntax() == InvoiceFile.Syntax.UNKNOWN)
        throw new IOException(
            "Keine unterstützte Rechnungssyntax (UBL-Rechnung, UBL-Gutschrift oder CII).");
      var transformer = templates(file.syntax()).newTransformer();
      transformer.setURIResolver(KositMapper::resolve);
      var result = new DOMResult();
      transformer.transform(new DOMSource(XmlDocuments.parse(file.originalBytes())), result);
      Element element = ((Document) result.getNode()).getDocumentElement();
      if (element == null
          || !XR.equals(element.getNamespaceURI())
          || !element.getLocalName().equals("invoice"))
        throw new IOException("KoSIT hat kein Rechnungsmodell erzeugt.");
      var root = read(element, "0");
      var gaps = new ArrayList<>(SourceCoverage.gaps(file, root));
      for (var n : root.walk())
        if (!n.name().equals("invoice") && FieldCatalog.find(n.name()) == null)
          gaps.add(
              new SemanticInvoice.Gap(
                  "Unbekanntes Feld im Zwischenmodell", n.sourcePath(), n.value()));
      for (var field : root.walk())
        if (field.type().equals("xr:date") && !field.value().isBlank()
            && !InvoiceFormat.isCalendarDate(field.value()))
          gaps.add(new SemanticInvoice.Gap(
              "Kein gültiges reines Kalenderdatum; Quellangabe unverändert, keine Zeit-/Zeitzonenumrechnung",
              field.sourcePath(), field.value()));
      if (root.value("BT-1").isBlank())
        gaps.add(
            new SemanticInvoice.Gap("Rechnungsnummer im Modell fehlt oder ist leer", "BT-1", ""));
      return new SemanticInvoice(root, gaps, status);
    } catch (Exception ex) {
      var root =
          new SemanticInvoice.Node(
              "0", "invoice", "", "Rechnung", "", "", "", List.of(), List.of());
      var gaps = new ArrayList<>(SourceCoverage.gaps(file, root));
      gaps.add(
          0,
          new SemanticInvoice.Gap(
              "Rechnungsdarstellung fehlgeschlagen: " + ex.getMessage(), "Transformation", ""));
      return new SemanticInvoice(root, gaps, status);
    }
  }

  private static synchronized Templates templates(InvoiceFile.Syntax syntax) throws Exception {
    var existing = CACHE.get(syntax);
    if (existing != null) return existing;
    String name =
        switch (syntax) {
          case UBL_INVOICE -> "../../viewer/ubl-invoice.xsl";
          case UBL_CREDIT_NOTE -> "../../viewer/ubl-creditnote.xsl";
          case CII -> "../../viewer/cii-price-base.xsl";
          default -> throw new IOException("Unsupported syntax");
        };
    var factory = new net.sf.saxon.TransformerFactoryImpl();
    factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
    factory.setURIResolver(KositMapper::resolve);
    factory.setErrorListener(
        new ErrorListener() {
          public void warning(TransformerException e) throws TransformerException {
            throw e;
          }

          public void error(TransformerException e) throws TransformerException {
            throw e;
          }

          public void fatalError(TransformerException e) throws TransformerException {
            throw e;
          }
        });
    var source = resolve(name, "app:/kosit-3.0.1/xsl/");
    var compiled = factory.newTemplates(source);
    CACHE.put(syntax, compiled);
    return compiled;
  }

  private static StreamSource resolve(String href, String base) throws TransformerException {
    try {
      URI uri = URI.create(base == null ? "app:/kosit-3.0.1/xsl/" : base).resolve(href).normalize();
      String path = uri.getPath();
      if (!"app".equals(uri.getScheme())
          || uri.getAuthority() != null
          || !(List.of("/viewer/cii-price-base.xsl", "/viewer/ubl-invoice.xsl", "/viewer/ubl-creditnote.xsl", "/viewer/date-preserving.xsl").contains(path) || List.of(
                  "ubl-invoice-xr.xsl",
                  "ubl-creditnote-xr.xsl",
                  "cii-xr.xsl",
                  "common-xr.xsl",
                  "functions.xsl")
              .stream()
              .anyMatch(n -> path.equals("/kosit-3.0.1/xsl/" + n))))
        throw new IOException("Externe XSLT-Ressource gesperrt: " + href);
      var source = new StreamSource(new ByteArrayInputStream(XmlDocuments.resource(path)));
      source.setSystemId(uri.toString());
      return source;
    } catch (Exception ex) {
      throw new TransformerException(ex);
    }
  }

  static SemanticInvoice.Node readModel(byte[] model) {
    try {
      return read(XmlDocuments.parse(model).getDocumentElement(), "0");
    } catch (IOException ex) {
      throw new IllegalArgumentException(ex);
    }
  }

  private static SemanticInvoice.Node read(Element element, String key) {
    String name = element.getLocalName();
    var definition = FieldCatalog.find(name);
    String id = element.getAttributeNS(XR, "id");
    if (id.isBlank() && definition != null) id = definition.id();
    String label =
        name.equals("invoice") ? "Rechnung" : definition == null ? name : definition.label();
    var properties = new ArrayList<SemanticInvoice.Property>();
    var attrs = element.getAttributes();
    for (int i = 0; i < attrs.getLength(); i++) {
      var a = attrs.item(i);
      if (XR.equals(a.getNamespaceURI())
          || XMLConstants.XMLNS_ATTRIBUTE_NS_URI.equals(a.getNamespaceURI())) continue;
      properties.add(
          new SemanticInvoice.Property(
              a.getNodeName(), FieldCatalog.propertyLabel(a.getNodeName()), a.getNodeValue()));
    }
    var children = new ArrayList<SemanticInvoice.Node>();
    StringBuilder value = new StringBuilder();
    int index = 0;
    for (var child = element.getFirstChild(); child != null; child = child.getNextSibling()) {
      if (child instanceof Element e) children.add(read(e, key + "/" + (index++)));
      else if (child.getNodeType() == org.w3c.dom.Node.TEXT_NODE
          || child.getNodeType() == org.w3c.dom.Node.CDATA_SECTION_NODE)
        value.append(child.getNodeValue());
    }
    return new SemanticInvoice.Node(
        key,
        name,
        id,
        label,
        children.isEmpty() ? value.toString() : "",
        element.getAttributeNS(XR, "src"),
        definition == null ? "" : definition.type(),
        properties,
        children);
  }
}
