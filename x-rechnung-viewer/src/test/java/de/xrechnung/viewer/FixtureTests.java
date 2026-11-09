package de.xrechnung.viewer;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

/** Pinned upstream syntax fixtures: integrity + independently counted XML inventory, NOT validation. */
public final class FixtureTests {
    public static void main(String[] args) throws Exception {
        check("kosit-01.01a-INVOICE_ubl.xml", "74fb09c609d5fba15a8c543060998d3b92858f56a81fb5b0ed244d6794e498d1",
            InvoiceFile.Syntax.UBL_INVOICE, Map.of("DOCUMENT", 1L, "ELEMENT", 103L, "ATTRIBUTE", 19L, "TEXT", 206L, "COMMENT", 1L));
        check("kosit-01.01a-INVOICE_uncefact.xml", "727b51982a84c9b406599a7384783570910440ed405c9bb6d918b22442636886",
            InvoiceFile.Syntax.CII, Map.of("DOCUMENT", 1L, "ELEMENT", 116L, "ATTRIBUTE", 14L, "TEXT", 231L, "COMMENT", 1L));
        System.out.println("RESULT: 2 pinned KoSIT fixture contracts passed (no conformity assessment)");
    }
    private static void check(String name, String digest, InvoiceFile.Syntax syntax, Map<String, Long> expected) throws Exception {
        Path source = Path.of("fixtures", name);
        byte[] before = Files.readAllBytes(source);
        InvoiceFile file = InvoiceFile.open(source);
        if (!digest.equals(file.sha256())) throw new AssertionError("Fixture hash mismatch: " + name);
        if (file.syntax() != syntax) throw new AssertionError("Syntax mismatch: " + name);
        Map<String, Long> actual = file.entries().stream().collect(Collectors.groupingBy(InvoiceFile.Entry::kind, Collectors.counting()));
        if (!expected.equals(actual)) throw new AssertionError("Inventory mismatch: " + name + " " + actual);
        if (!Arrays.equals(before, file.originalBytes()) || !Arrays.equals(before, Files.readAllBytes(source))) throw new AssertionError("Original changed");
        System.out.println("PASS " + name + " SHA-256 + " + file.entries().size() + " independently counted inventory entries");
    }
}
