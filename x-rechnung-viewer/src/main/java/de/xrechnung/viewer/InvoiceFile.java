package de.xrechnung.viewer;

import java.io.IOException;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.xml.sax.ErrorHandler;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;

/** M1: technical XML inventory, deliberately not a semantic invoice mapping. */
public final class InvoiceFile {
    public static final int MAX_BYTES = 8 * 1024 * 1024;
    public static final int MAX_DEPTH = 128;
    public static final int MAX_ENTRIES = 50_000;
    public enum Syntax { UBL_INVOICE, UBL_CREDIT_NOTE, CII, UNKNOWN }
    public record Entry(int id, int parentId, String path, String kind,
                        String name, String namespace, String value) {}
    private final byte[] original;
    private final String digest;
    private final String text;
    private final Syntax syntax;
    private final List<Entry> entries;

    private InvoiceFile(byte[] original, String text, Syntax syntax, List<Entry> entries) {
        this.original = original;
        this.text = text;
        this.syntax = syntax;
        this.entries = List.copyOf(entries);
        try { this.digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(original)); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException("SHA-256 unavailable", ex); }
    }

    public static InvoiceFile open(Path source) throws IOException {
        // Bound the stream as well as the initial size: source files can grow while being read.
        if (Files.size(source) > MAX_BYTES) throw new IOException("Datei überschreitet 8 MiB; nichts wurde geladen.");
        try (InputStream stream = Files.newInputStream(source)) {
            return parse(stream.readNBytes(MAX_BYTES + 1));
        }
    }

    public static InvoiceFile parse(byte[] input) throws IOException {
        if (input.length > MAX_BYTES) throw new IOException("Datei überschreitet 8 MiB; nichts wurde geladen.");
        byte[] original = input.clone();
        try {
            var factory = DocumentBuilderFactory.newDefaultInstance();
            factory.setNamespaceAware(true);
            factory.setCoalescing(false);
            factory.setIgnoringComments(false);
            factory.setIgnoringElementContentWhitespace(false);
            factory.setXIncludeAware(false);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setAttribute("http://www.oracle.com/xml/jaxp/properties/maxElementDepth", Integer.toString(MAX_DEPTH));
            var builder = factory.newDocumentBuilder();
            builder.setEntityResolver((publicId, systemId) -> { throw new SAXException("Externe XML-Ressourcen sind gesperrt."); });
            builder.setErrorHandler(new ErrorHandler() {
                public void warning(SAXParseException ex) throws SAXException { throw ex; }
                public void error(SAXParseException ex) throws SAXException { throw ex; }
                public void fatalError(SAXParseException ex) throws SAXException { throw ex; }
            });
            Document document = builder.parse(new ByteArrayInputStream(original));
            var entries = new ArrayList<Entry>();
            inventory(document, -1, "/", 0, entries);
            String encoding = document.getXmlEncoding();
            if (encoding == null) encoding = document.getInputEncoding();
            Charset charset = encoding == null ? StandardCharsets.UTF_8 : Charset.forName(encoding);
            return new InvoiceFile(original, new String(original, charset), detect(document), entries);
        } catch (SAXParseException ex) {
            throw new IOException("XML konnte nicht sicher und vollständig geladen werden"
                    + XmlDocuments.location(ex) + ": " + ex.getMessage(), ex);
        } catch (ParserConfigurationException | SAXException | IllegalArgumentException ex) {
            throw new IOException("XML konnte nicht sicher und vollständig geladen werden: " + ex.getMessage(), ex);
        }
    }

    private static Syntax detect(Document document) {
        Node root = document.getDocumentElement();
        String name = expanded(root);
        return switch (name) {
            case "Q{urn:oasis:names:specification:ubl:schema:xsd:Invoice-2}Invoice" -> Syntax.UBL_INVOICE;
            case "Q{urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2}CreditNote" -> Syntax.UBL_CREDIT_NOTE;
            case "Q{urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100}CrossIndustryInvoice" -> Syntax.CII;
            default -> Syntax.UNKNOWN;
        };
    }

    private static String expanded(Node node) {
        return "Q{" + (node.getNamespaceURI() == null ? "" : node.getNamespaceURI()) + "}"
            + (node.getLocalName() == null ? node.getNodeName() : node.getLocalName());
    }

    private static String segment(Node node) {
        return switch (node.getNodeType()) {
            case Node.ELEMENT_NODE -> expanded(node);
            case Node.ATTRIBUTE_NODE -> "@" + expanded(node);
            case Node.TEXT_NODE -> "text()";
            case Node.CDATA_SECTION_NODE -> "cdata()";
            case Node.COMMENT_NODE -> "comment()";
            case Node.PROCESSING_INSTRUCTION_NODE -> "processing-instruction(" + node.getNodeName() + ")";
            default -> node.getNodeName();
        };
    }

    private static String kind(Node node) throws IOException {
        return switch (node.getNodeType()) {
            case Node.DOCUMENT_NODE -> "DOCUMENT";
            case Node.ELEMENT_NODE -> "ELEMENT";
            case Node.ATTRIBUTE_NODE -> "ATTRIBUTE";
            case Node.TEXT_NODE -> "TEXT";
            case Node.CDATA_SECTION_NODE -> "CDATA";
            case Node.COMMENT_NODE -> "COMMENT";
            case Node.PROCESSING_INSTRUCTION_NODE -> "PROCESSING_INSTRUCTION";
            default -> throw new IOException("Nicht unterstützter XML-Knotentyp: " + node.getNodeType());
        };
    }

    private static void inventory(Node node, int parentId, String path, int depth, List<Entry> entries) throws IOException {
        if (depth > MAX_DEPTH + 1) throw new IOException("XML-Struktur zu tief; nichts wurde geladen.");
        if (entries.size() >= MAX_ENTRIES) throw new IOException("Mehr als 50.000 XML-Einträge; nichts wurde geladen.");
        int id = entries.size();
        entries.add(new Entry(id, parentId, path, kind(node), node.getNodeName(),
            node.getNamespaceURI() == null ? "" : node.getNamespaceURI(),
            node.getNodeValue() == null ? "" : node.getNodeValue()));
        String base = path.equals("/") ? "" : path;
        if (node.hasAttributes()) {
            var attributes = node.getAttributes();
            for (int i = 0; i < attributes.getLength(); i++) {
                Node attribute = attributes.item(i);
                inventory(attribute, id, base + "/" + segment(attribute), depth + 1, entries);
            }
        }
        // DOM exposes synthetic text children of Attr; the source value is already inventoried once.
        if (node.getNodeType() == Node.ATTRIBUTE_NODE) return;
        Map<String, Integer> counts = new HashMap<>();
        var children = node.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            String segment = segment(child);
            int index = counts.merge(segment, 1, Integer::sum);
            inventory(child, id, base + "/" + segment + "[" + index + "]", depth + 1, entries);
        }
    }

    public byte[] originalBytes() { return original.clone(); }
    public String sha256() { return digest; }
    /** Original decoded for display, not a serialization of the normalized DOM. */
    public String rawText() { return text; }
    public Syntax syntax() { return syntax; }
    public List<Entry> entries() { return entries; }

    public void copyOriginal(Path destination) throws IOException {
        // CREATE_NEW also refuses existing symlinks and the source path. Never reserialize XML.
        try (OutputStream stream = Files.newOutputStream(destination, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
            stream.write(original);
        }
        try (InputStream stream = Files.newInputStream(destination)) {
            if (!Arrays.equals(original, stream.readNBytes(MAX_BYTES + 1)))
                throw new IOException("Originalkopie konnte nicht bytegenau bestätigt werden.");
        }
    }
}
