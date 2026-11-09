package de.xrechnung.viewer;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Currency;
import java.util.Locale;
import java.time.format.FormatStyle;

/** Display only. Never writes to the model or rounds a supplied numeric value. */
public final class InvoiceFormat {
  public static String money(String value, String currency) {
    if (value.isBlank()) return value;
    String lexical = value.strip();
    if (!isDecimal(lexical)) return value;
    BigDecimal number = new BigDecimal(lexical);
    int minimum = 0;
    try {
      minimum = Math.max(0, Currency.getInstance(currency).getDefaultFractionDigits());
    } catch (IllegalArgumentException ex) {
      /* Unknown/missing code: preserve precision; never infer EUR. */
    }
    String displayed =
        number
            .setScale(Math.max(minimum, number.scale()), RoundingMode.UNNECESSARY)
            .toPlainString()
            .replace('.', ',');
    return displayed + (currency.isBlank() ? "" : " " + currency);
  }

  public static String field(SemanticInvoice.Node node, SemanticInvoice.Node root) {
    return switch (node.type()) {
      case "xr:amount", "xr:unit_price_amount" ->
          money(node.value(), root.value(node.id().equals("BT-111") ? "BT-6" : "BT-5"));
      case "xr:percentage", "xr:quantity" -> decimal(node.value());
      case "xr:date" -> date(node.value());
      default -> node.value();
    };
  }

  static String decimal(String value) {
    return isDecimal(value.strip())
        ? new BigDecimal(value.strip()).toPlainString().replace('.', ',')
        : value;
  }

  static boolean isCalendarDate(String value) {
    if (!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) return false;
    try { LocalDate.parse(value); return true; }
    catch (java.time.format.DateTimeParseException ex) { return false; }
  }

  static String date(String value) {
    if (!isCalendarDate(value)) return value;
    try {
      LocalDate date=LocalDate.parse(value);
      Locale locale=Locale.getDefault(Locale.Category.FORMAT);
      String language=locale.getLanguage();
      if (language.equals("de")) return date.format(DateTimeFormatter.ofPattern("dd.MM.uuuu", locale));
      boolean known=!language.isBlank() && java.util.Arrays.stream(java.text.DateFormat.getAvailableLocales())
          .anyMatch(available -> available.getLanguage().equals(language));
      return known ? date.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(locale))
          : date.toString();
    } catch (Exception ex) {
      return value;
    }
  }

  private static boolean isDecimal(String value) {
    return value.matches("[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)");
  }

  private InvoiceFormat() {}
}
