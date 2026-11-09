package de.xrechnung.viewer;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import javax.swing.SwingUtilities;

/** Headless Swing component contracts; these do not substitute for OS interaction tests. */
public final class ViewTests {
    public static void main(String[] args) throws Exception {
        var failure = new AtomicReference<Throwable>();
        SwingUtilities.invokeAndWait(() -> {
            try { run(); } catch (Throwable ex) { failure.set(ex); }
        });
        if (failure.get() != null) throw new AssertionError("View contract failed", failure.get());
        System.out.println("RESULT: 6 view contracts passed");
    }
    private static void run() throws Exception {
        var panel = new InvoicePanel();
        equal(InvoicePanel.DISCLAIMER, panel.disclaimerText());
        System.out.println("PASS disclaimer before load");
        String full = "  Grüße € 😀\n" + "long".repeat(2000) + ".*";
        String xml = "<r><x>" + full + "</x><empty/><html>&lt;html&gt;literal&lt;/html&gt;</html></r>";
        var file = InvoiceFile.parse(xml.getBytes(StandardCharsets.UTF_8));
        panel.display(file, "<html>invoice.xml");
        equal(file.entries().size(), panel.displayedEntries());
        equal(4, panel.viewCount());
        for (int i = 0; i < panel.viewCount(); i++) {
            panel.selectView(i);
            equal(InvoicePanel.DISCLAIMER, panel.disclaimerText());
        }
        System.out.println("PASS persistent disclaimer in all four views");
        panel.filter(".*");
        equal(1, panel.displayedEntries());
        panel.filter("nothing-will-match"); equal(0, panel.displayedEntries());
        panel.filter(""); equal(file.entries().size(), panel.displayedEntries());
        System.out.println("PASS literal filter preserves inventory");
        int valueIndex = file.entries().stream().filter(e -> e.value().equals(full)).findFirst().orElseThrow().id();
        panel.selectEntry(valueIndex);
        equal(full, panel.selectedValue());
        System.out.println("PASS selected value is complete and unchanged");
        equal(xml, panel.sourceText());
        System.out.println("PASS raw source uses original decoded text");
        int htmlIndex = file.entries().stream().filter(e -> e.value().startsWith("<html>")).findFirst().orElseThrow().id();
        equal("<html>literal</html>", panel.renderedValue(htmlIndex));
        System.out.println("PASS HTML-like values remain literal text");
    }
    private static void equal(Object expected, Object actual) {
        if (!expected.equals(actual)) throw new AssertionError("Expected " + expected + ", got " + actual);
    }
}
