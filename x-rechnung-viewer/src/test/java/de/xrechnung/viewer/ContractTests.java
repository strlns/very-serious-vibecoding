package de.xrechnung.viewer;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Random;

/** Dependency-free executable contracts: failures work without -ea. Synthetic XML is NOT a valid invoice corpus. */
public final class ContractTests {
    private static int passed;
    private static int failed;
    private static final String UBL = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";
    private static final String CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
    @FunctionalInterface interface Checked { void run() throws Exception; }
    public static void main(String[] args) throws Exception {
        test("byte preservation and defensive ownership", ContractTests::byteOwnership);
        test("opening never modifies source", ContractTests::readOnly);
        test("original copy is byte exact and cannot overwrite", ContractTests::copy);
        test("SHA-256 known-answer", () -> equal("5382511e672645156e2889ebc21c72a0e59377fcbe774abaa703e0a42b3d2006", InvoiceFile.parse(bytes("<r/>" )).sha256()));
        test("root detection uses expanded names", ContractTests::syntaxes);
        test("prefixes have no business meaning", ContractTests::prefixes);
        test("no decimal/date/whitespace coercion", ContractTests::values);
        test("inventory retains all DOM node kinds", ContractTests::inventory);
        test("paths are unique and parents precede children", ContractTests::paths);
        test("UTF-8 and UTF-16 originals survive", ContractTests::encodings);
        test("legacy declared encoding is decoded", ContractTests::legacyEncoding);
        test("malformed XML is refused", () -> rejects(() -> InvoiceFile.parse(bytes("<r><x></r>"))));
        test("DTD, external and internal entities are refused", ContractTests::entities);
        test("XInclude remains inert and visible", ContractTests::xinclude);
        test("unknown extensions remain inspectable", ContractTests::extensions);
        test("input size limit refuses, never truncates", ContractTests::sizeLimit);
        test("depth limit refuses, never truncates", ContractTests::depthLimit);
        test("inventory limit refuses, never truncates", ContractTests::entryLimit);
        test("inventory is immutable", () -> {
            var file = InvoiceFile.parse(bytes("<r/>"));
            try { file.entries().clear(); throw new AssertionError("mutable list"); }
            catch (UnsupportedOperationException expected) { }
        });
        System.out.println("RESULT: " + passed + " passed, " + failed + " failed");
        if (failed != 0) System.exit(1);
    }
    private static void test(String name, Checked body) {
        try { body.run(); passed++; System.out.println("PASS " + name); }
        catch (Throwable ex) { failed++; System.out.println("FAIL " + name + ": " + ex); }
    }
    private static void byteOwnership() throws Exception {
        byte[] data = bytes("<?xml version=\"1.0\"?>\r\n<r a='01'>&#65;<![CDATA[<b>]]></r>\r\n");
        byte[] expected = data.clone();
        var file = InvoiceFile.parse(data);
        data[0] = 0;
        check(Arrays.equals(expected, file.originalBytes()), "input alias");
        byte[] returned = file.originalBytes(); returned[1] = 0;
        check(Arrays.equals(expected, file.originalBytes()), "output alias");
    }
    private static void readOnly() throws Exception {
        Path dir = Files.createTempDirectory("xr-read-");
        Path source = dir.resolve("invoice.xml");
        byte[] original = bytes("<r>  1.2000  </r>");
        try { Files.write(source, original); InvoiceFile.open(source); check(Arrays.equals(original, Files.readAllBytes(source)), "source changed"); }
        finally { Files.deleteIfExists(source); Files.delete(dir); }
    }
    private static void copy() throws Exception {
        Path dir = Files.createTempDirectory("xr-copy-");
        Path target = dir.resolve("copy.xml");
        Path source = dir.resolve("source.xml");
        byte[] data = bytes("<r a='1'/>\r\n");
        try {
            Files.write(source, data);
            var file = InvoiceFile.open(source);
            file.copyOriginal(target);
            check(Arrays.equals(data, Files.readAllBytes(target)), "copy changed");
            rejects(() -> file.copyOriginal(target));
            rejects(() -> file.copyOriginal(source));
            check(Arrays.equals(data, Files.readAllBytes(source)), "source overwritten");
        } finally { Files.deleteIfExists(target); Files.deleteIfExists(source); Files.delete(dir); }
    }
    private static void syntaxes() throws Exception {
        equal(InvoiceFile.Syntax.UBL_INVOICE, InvoiceFile.parse(bytes("<a:Invoice xmlns:a='" + UBL + "'/>" )).syntax());
        equal(InvoiceFile.Syntax.UBL_CREDIT_NOTE, InvoiceFile.parse(bytes("<CreditNote xmlns='urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2'/>" )).syntax());
        equal(InvoiceFile.Syntax.CII, InvoiceFile.parse(bytes("<CrossIndustryInvoice xmlns='urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100'/>" )).syntax());
        equal(InvoiceFile.Syntax.UNKNOWN, InvoiceFile.parse(bytes("<Invoice/>" )).syntax());
        equal(InvoiceFile.Syntax.UNKNOWN, InvoiceFile.parse(bytes("<Invoice xmlns='evil'/>" )).syntax());
        equal(InvoiceFile.Syntax.UNKNOWN, InvoiceFile.parse(bytes("<Other xmlns='" + UBL + "'/>" )).syntax());
    }
    private static void prefixes() throws Exception {
        Random random = new Random(771);
        for (int i = 0; i < 100; i++) {
            String prefix = "p" + random.nextInt(100000);
            var file = InvoiceFile.parse(bytes("<" + prefix + ":Invoice xmlns:" + prefix + "='" + UBL + "'><" + prefix + ":x>001.20</" + prefix + ":x></" + prefix + ":Invoice>"));
            equal(InvoiceFile.Syntax.UBL_INVOICE, file.syntax());
            check(has(file, "TEXT", "001.20"), "value lost");
        }
    }
    private static void values() throws Exception {
        var file = InvoiceFile.parse(bytes("<r><amount currencyID='EUR'>0001.2300</amount><date>20261108</date><note xml:space='preserve'>  A\n B  </note><html>&lt;html&gt;&lt;b&gt;x&lt;/b&gt;</html></r>"));
        for (String value : List.of("0001.2300", "20261108", "  A\n B  ", "<html><b>x</b>")) check(has(file, "TEXT", value), "changed: " + value);
        check(has(file, "ATTRIBUTE", "EUR"), "attribute lost");
    }
    private static void inventory() throws Exception {
        var file = InvoiceFile.parse(bytes("<?xml version='1.0'?><?before kept?><r xmlns:a='urn:a' a:x='v'> \n<!--keep--><a:empty/><![CDATA[<literal>]]>tail</r><?after kept?>"));
        for (String kind : List.of("DOCUMENT", "ELEMENT", "ATTRIBUTE", "TEXT", "COMMENT", "CDATA", "PROCESSING_INSTRUCTION"))
            check(file.entries().stream().anyMatch(e -> e.kind().equals(kind)), "missing " + kind);
        check(has(file, "COMMENT", "keep"), "comment lost");
        check(has(file, "CDATA", "<literal>"), "CDATA lost");
        check(has(file, "ATTRIBUTE", "urn:a"), "namespace declaration lost");
        check(file.entries().stream().anyMatch(e -> e.name().equals("a:empty") && e.namespace().equals("urn:a")), "empty element lost");
        equal(11, file.entries().size());
    }
    private static void paths() throws Exception {
        var file = InvoiceFile.parse(bytes("<r xmlns:a='urn:a' xmlns:b='urn:b'><a:x/><a:x/><b:x/><x/><x/><!--1--><!--2-->t<![CDATA[c]]>z</r>"));
        var paths = new HashSet<String>();
        for (var entry : file.entries()) {
            check(paths.add(entry.path()), "duplicate path " + entry.path());
            equal(entry.id(), paths.size() - 1);
            check(entry.parentId() < entry.id(), "parent order");
        }
        check(file.entries().stream().anyMatch(e -> e.path().equals("/Q{}r[1]/Q{urn:a}x[2]")), "namespace/index path");
    }
    private static void encodings() throws Exception {
        for (var charset : List.of(StandardCharsets.UTF_8, StandardCharsets.UTF_16, StandardCharsets.UTF_16LE, StandardCharsets.UTF_16BE)) {
            String xml = "<?xml version='1.0' encoding='" + charset.name() + "'?><r>Grüße € 😀</r>";
            byte[] data = xml.getBytes(charset);
            var file = InvoiceFile.parse(data);
            check(Arrays.equals(data, file.originalBytes()), "encoding bytes");
            check(has(file, "TEXT", "Grüße € 😀"), "decoded value");
            check(file.rawText().contains("Grüße € 😀"), "raw display encoding");
        }
    }
    private static void legacyEncoding() throws Exception {
        String xml = "<?xml version='1.0' encoding='ISO-8859-1'?><r>Grüße</r>";
        var file = InvoiceFile.parse(xml.getBytes(StandardCharsets.ISO_8859_1));
        check(file.rawText().contains("Grüße"), "legacy text");
    }
    private static void entities() throws Exception {
        for (String xml : List.of("<!DOCTYPE r [<!ENTITY x 'hidden'>]><r>&x;</r>",
            "<!DOCTYPE r [<!ENTITY x SYSTEM 'file:///not-allowed'>]><r>&x;</r>",
            "<!DOCTYPE r SYSTEM 'https://example.invalid/external.dtd'><r/>")) rejects(() -> InvoiceFile.parse(bytes(xml)));
    }
    private static void xinclude() throws Exception {
        var file = InvoiceFile.parse(bytes("<r xmlns:xi='http://www.w3.org/2001/XInclude'><xi:include href='file:///do-not-read'/></r>"));
        check(has(file, "ATTRIBUTE", "file:///do-not-read"), "include not preserved");
        check(file.entries().stream().anyMatch(e -> e.name().equals("xi:include")), "include was resolved");
    }
    private static void extensions() throws Exception {
        var file = InvoiceFile.parse(bytes("<Invoice xmlns='" + UBL + "' xmlns:cbc='" + CBC + "' xmlns:e='urn:unknown'><cbc:ID>R-1</cbc:ID><e:New future='yes'>retain</e:New><e:Binary mimeCode='application/pdf'>JVBERi0x</e:Binary></Invoice>"));
        check(has(file, "TEXT", "retain") && has(file, "TEXT", "JVBERi0x"), "unknown field lost");
        check(file.entries().stream().anyMatch(e -> e.namespace().equals("urn:unknown")), "unknown namespace lost");
    }
    private static void sizeLimit() throws Exception {
        rejects(() -> InvoiceFile.parse(new byte[InvoiceFile.MAX_BYTES + 1]));
        Path path = Files.createTempFile("xr-limit-", ".xml");
        try { Files.write(path, new byte[InvoiceFile.MAX_BYTES + 1]); rejects(() -> InvoiceFile.open(path)); }
        finally { Files.delete(path); }
    }
    private static void depthLimit() throws Exception {
        rejects(() -> InvoiceFile.parse(bytes("<r>".repeat(InvoiceFile.MAX_DEPTH + 1) + "</r>".repeat(InvoiceFile.MAX_DEPTH + 1))));
    }
    private static void entryLimit() throws Exception {
        rejects(() -> InvoiceFile.parse(bytes("<r>" + "<x/>".repeat(InvoiceFile.MAX_ENTRIES) + "</r>")));
    }
    private static boolean has(InvoiceFile file, String kind, String value) { return file.entries().stream().anyMatch(e -> e.kind().equals(kind) && e.value().equals(value)); }
    private static byte[] bytes(String text) { return text.getBytes(StandardCharsets.UTF_8); }
    private static void equal(Object expected, Object actual) { check(expected.equals(actual), "expected " + expected + ", got " + actual); }
    private static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
    private static void rejects(Checked body) throws Exception {
        try { body.run(); } catch (IOException expected) { return; }
        throw new AssertionError("expected explicit IOException rejection");
    }
}
