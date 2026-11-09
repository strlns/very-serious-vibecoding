package de.xrechnung.viewer;

import java.util.concurrent.atomic.AtomicReference;
import javax.swing.SwingUtilities;

public final class FullTextTests {
  public static void main(String[] args) throws Exception {
    var failure = new AtomicReference<Throwable>();
    SwingUtilities.invokeAndWait(
        () -> {
          try {
            String text = "<html>Langer Dateiname 😀\nmit weiteren Informationen</html>";
            var label = new FullText.Label(text, 22);
            SemanticTests.check(label.getText().endsWith("..."), "missing ellipsis");
            SemanticTests.equal(text, label.getToolTipText());
            SemanticTests.check(
                Boolean.TRUE.equals(label.getClientProperty("html.disable")),
                "HTML interpretation enabled");
            SemanticTests.equal("abc", FullText.preview("abc", 10));
            SemanticTests.equal("😀😀...", FullText.preview("😀😀😀😀😀😀", 5));
            SemanticTests.equal("a b", FullText.preview("a\nb", 10));
            SemanticTests.check(FullText.hint("kurz", false) == null, "unnecessary tooltip");
            String longText = "<html>" + "😀Information ".repeat(80);
            String hint = FullText.hint(longText, true);
            SemanticTests.check(hint.codePointCount(0, hint.length()) <= 240, "hint too long");
            SemanticTests.check(hint.endsWith("..."), "hint must indicate preview");
            SemanticTests.equal("<html>kurz", FullText.hint("<html>kurz", true));
            var shortLabel = new FullText.Label("kurz", 30);
            var hover =
                new java.awt.event.MouseEvent(
                    shortLabel, java.awt.event.MouseEvent.MOUSE_MOVED, 0, 0, 0, 0, 0, false);
            shortLabel.setSize(10000, 30);
            SemanticTests.check(shortLabel.getToolTipText(hover) == null, "fitting label popup");
            shortLabel.setSize(1, 30);
            SemanticTests.equal("kurz", shortLabel.getToolTipText(hover));
            var tip = shortLabel.createToolTip();
            tip.setTipText(longText);
            SemanticTests.equal(0, tip.getComponentCount());
            SemanticTests.check(!tip.isFocusable(), "tooltip must remain passive");
            SemanticTests.equal(longText, tip.getTipText());
            System.out.println("PASS hints are conditional, bounded plain-text previews");
            System.out.println(
                "PASS shortened labels preserve the exact full tooltip including HTML-like text");
            System.out.println(
                "PASS short strings, line previews and Unicode truncation preserve data"
                    + " boundaries");
          } catch (Throwable t) {
            failure.set(t);
          }
        });
    if (failure.get() != null) throw new AssertionError(failure.get());
    System.out.println("RESULT: 3 full-text contracts passed");
  }
}
