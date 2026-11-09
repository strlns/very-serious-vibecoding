package de.xrechnung.viewer;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.xml.sax.SAXException;
import org.xml.sax.helpers.DefaultHandler;

final class XmlDocuments {
  static Document parse(byte[] bytes) throws IOException {
    try {
      var f = DocumentBuilderFactory.newDefaultInstance();
      f.setNamespaceAware(true);
      f.setXIncludeAware(false);
      f.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
      f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
      f.setFeature("http://xml.org/sax/features/external-general-entities", false);
      f.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
      f.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
      f.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
      f.setAttribute("http://www.oracle.com/xml/jaxp/properties/maxElementDepth", "132");
      var b = f.newDocumentBuilder();
      b.setErrorHandler(
          new DefaultHandler() {
            @Override
            public void fatalError(org.xml.sax.SAXParseException e) throws SAXException {
              throw e;
            }
          });
      b.setEntityResolver(
          (p, s) -> {
            throw new SAXException("External resource blocked");
          });
      return b.parse(new ByteArrayInputStream(bytes));
    } catch (Exception ex) {
      String where = ex instanceof org.xml.sax.SAXParseException parse ? location(parse) : "";
      throw new IOException("XML" + where + ": " + ex.getMessage(), ex);
    }
  }

  static String location(org.xml.sax.SAXParseException error) {
    if (error.getLineNumber() < 1) return "";
    return " (Zeile "
        + error.getLineNumber()
        + (error.getColumnNumber() > 0 ? ", Spalte " + error.getColumnNumber() : "")
        + ")";
  }

  static byte[] resource(String path) throws IOException {
    try (var stream = XmlDocuments.class.getResourceAsStream(path)) {
      if (stream == null) throw new IOException("Fehlende Programmressource: " + path);
      return stream.readAllBytes();
    }
  }

  private XmlDocuments() {}
}
