package de.xrechnung.viewer;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.List;
import java.util.Random;

public final class FormatTests {
  private static int passed, failed;

  @FunctionalInterface
  interface Checked {
    void run() throws Exception;
  }

  public static void main(String[] args) throws Exception {
    test("date display follows FORMAT locale, unknown falls back to ISO", () -> {
      var before = java.util.Locale.getDefault(java.util.Locale.Category.FORMAT);
      try {
        java.util.Locale.setDefault(java.util.Locale.Category.FORMAT, java.util.Locale.GERMANY);
        equal("09.11.2026", InvoiceFormat.date("2026-11-09"));
        java.util.Locale.setDefault(java.util.Locale.Category.FORMAT, java.util.Locale.US);
        equal("Nov 9, 2026", InvoiceFormat.date("2026-11-09"));
        java.util.Locale.setDefault(java.util.Locale.Category.FORMAT, java.util.Locale.ROOT);
        equal("2026-11-09", InvoiceFormat.date("2026-11-09"));
        java.util.Locale.setDefault(java.util.Locale.Category.FORMAT, java.util.Locale.forLanguageTag("zz-ZZ"));
        equal("2026-11-09", InvoiceFormat.date("2026-11-09"));
        equal("bad-date", InvoiceFormat.date("bad-date"));
      } finally { java.util.Locale.setDefault(java.util.Locale.Category.FORMAT, before); }
    });
    test("times and timezone-bearing values remain literal across system zones", () -> {
      var previousZone=java.util.TimeZone.getDefault();
      var previousLocale=java.util.Locale.getDefault(java.util.Locale.Category.FORMAT);
      try {
        java.util.Locale.setDefault(java.util.Locale.Category.FORMAT,java.util.Locale.GERMANY);
        for(String zone:List.of("Pacific/Kiritimati","America/Los_Angeles","UTC")) {
          java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone(zone));
          for(String value:List.of("2026-11-09T00:30:00+14:00","2026-11-09T23:30:00-12:00",
              "2026-11-09T02:30:00","2026-11-09Z","2026-11-09+02:00","20261109T003000Z"))
            equal(value,InvoiceFormat.date(value));
          equal("09.11.2026",InvoiceFormat.date("2026-11-09"));
        }
      } finally {
        java.util.TimeZone.setDefault(previousZone);
        java.util.Locale.setDefault(java.util.Locale.Category.FORMAT,previousLocale);
      }
    });
    test(
        "EUR pads one fraction digit",
        () -> equal("336,90 EUR", InvoiceFormat.money("336.9", "EUR")));
    test(
        "whole EUR and negative values",
        () -> {
          equal("0,00 EUR", InvoiceFormat.money("0", "EUR"));
          equal("-12,00 EUR", InvoiceFormat.money("-12", "EUR"));
        });
    test(
        "unit prices never lose additional precision",
        () -> {
          equal("1,23456789 EUR", InvoiceFormat.money("1.23456789", "EUR"));
          equal("1,2300 EUR", InvoiceFormat.money("1.2300", "EUR"));
        });
    test(
        "large decimal values do not pass through floating point",
        () ->
            equal(
                "123456789012345678901234567890,90 EUR",
                InvoiceFormat.money("123456789012345678901234567890.9", "EUR")));
    test(
        "currency-specific minimum scales",
        () -> {
          equal("12 JPY", InvoiceFormat.money("12", "JPY"));
          equal("12,300 KWD", InvoiceFormat.money("12.3", "KWD"));
        });
    test(
        "unknown or missing currency is never assumed EUR",
        () -> {
          equal("12,3 ZZZ", InvoiceFormat.money("12.3", "ZZZ"));
          equal("12,3", InvoiceFormat.money("12.3", ""));
        });
    test(
        "empty and invalid lexical values remain visible",
        () -> {
          equal("", InvoiceFormat.money("", "EUR"));
          equal("not-a-number", InvoiceFormat.money("not-a-number", "EUR"));
          equal("1E3", InvoiceFormat.money("1E3", "EUR"));
        });
    test(
        "VAT accounting amounts use BT-6",
        () -> {
          var root =
              root(List.of(field("BT-5", "EUR", "xr:code"), field("BT-6", "USD", "xr:code")));
          equal("12,30 USD", InvoiceFormat.field(field("BT-111", "12.3", "xr:amount"), root));
          equal("12,30 EUR", InvoiceFormat.field(field("BT-115", "12.3", "xr:amount"), root));
        });
    test(
        "identifier digits are not numeric amounts",
        () ->
            equal(
                "000012.3",
                InvoiceFormat.field(field("BT-1", "000012.3", "xr:identifier"), root(List.of()))));
    test(
        "200 exact numeric round trips",
        () -> {
          var random = new Random(813);
          for (int i = 0; i < 200; i++) {
            var source = BigDecimal.valueOf(random.nextLong(), random.nextInt(8));
            String shown =
                InvoiceFormat.money(source.toPlainString(), "EUR")
                    .replace(" EUR", "")
                    .replace(',', '.');
            if (source.compareTo(new BigDecimal(shown)) != 0)
              throw new AssertionError("value changed");
          }
        });
    test(
        "reference payable formats correctly without changing source/model",
        () -> {
          var source = InvoiceFile.open(Path.of("fixtures/kosit-01.01a-INVOICE_ubl.xml"));
          String hash = source.sha256();
          var invoice = KositMapper.map(source);
          var amount = invoice.root().all("BT-115").get(0);
          equal("336.9", amount.value());
          equal("336,90 EUR", InvoiceFormat.field(amount, invoice.root()));
          var table = new InvoiceTableModel();
          table.display(invoice);
          var row =
              table.rows().stream()
                  .filter(r -> r.term().equals("BT-115"))
                  .findFirst()
                  .orElseThrow();
          equal("336,90 EUR", row.displayed());
          equal("336.9", row.raw());
          equal("336.9", amount.value());
          equal(hash, source.sha256());
        });
    System.out.println("RESULT: " + passed + " format contracts passed, " + failed + " failed");
    if (failed > 0) System.exit(1);
  }

  private static SemanticInvoice.Node field(String id, String value, String type) {
    return new SemanticInvoice.Node(id, id, id, id, value, "/source", type, List.of(), List.of());
  }

  private static SemanticInvoice.Node root(List<SemanticInvoice.Node> children) {
    return new SemanticInvoice.Node(
        "root", "invoice", "", "Rechnung", "", "", "", List.of(), children);
  }

  private static void equal(Object a, Object b) {
    SemanticTests.equal(a, b);
  }

  private static void test(String name, Checked body) {
    try {
      body.run();
      passed++;
      System.out.println("PASS " + name);
    } catch (Throwable t) {
      failed++;
      System.out.println("FAIL " + name + ": " + t);
    }
  }
}
