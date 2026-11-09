package de.xrechnung.viewer;

/** Shared display strings only; no monetary arithmetic or inferred defaults. */
final class InvoicePresentation {
  // Verified display aliases, not conversions. Original codes remain in model/details.
  // UNECE Rec 20 rev.11e + Rec 21 (Peppol May 2026 list); see docs/UNITS-AND-LINE-IDS.md.
  static String unit(String code) {
    return switch (code) {
      case "H87" -> "Stück";
      case "XPP" -> "Stück (XPP)"; // Rec 21: a loose or unpacked article.
      default -> code;
    };
  }
  static String price(SemanticInvoice.Node line, String currency) {
    String price = InvoiceFormat.money(line.value("BT-146"), currency);
    String base = line.value("BT-149"), unit = line.value("BT-150");
    if (!base.isBlank()) {
      boolean singlePiece = (unit.equals("H87") || unit.equals("XPP"))
          && base.strip().matches("[+]?0*1(?:\\.0*)?");
      price += "\npro " + (singlePiece ? unit(unit)
          : InvoiceFormat.decimal(base) + (unit.isBlank() ? "" : " " + unit(unit)));
    }
    else if (!unit.isBlank()) price += "\nBasiseinheit: " + unit(unit);
    return price;
  }
  static String lineTax(SemanticInvoice.Node line) {
    StringBuilder out = new StringBuilder();
    for (var tax : line.all("BG-30")) {
      if (!out.isEmpty()) out.append("\n");
      out.append("USt-Kategorie: ").append(tax.value("BT-151"));
      if (!tax.value("BT-152").isBlank()) out.append(" · ").append(InvoiceFormat.decimal(tax.value("BT-152"))).append(" %");
    }
    return out.toString();
  }
  static String tax(SemanticInvoice.Node tax, String currency) {
    String text = "Umsatzsteuer · Kategorie " + tax.value("BT-118");
    if (!tax.value("BT-119").isBlank()) text += " · " + InvoiceFormat.decimal(tax.value("BT-119")) + " %";
    text += "\nBemessungsgrundlage: " + InvoiceFormat.money(tax.value("BT-116"), currency)
        + "    Steuerbetrag: " + InvoiceFormat.money(tax.value("BT-117"), currency);
    if (!tax.value("BT-120").isBlank()) text += "\nBefreiungsgrund: " + tax.value("BT-120");
    if (!tax.value("BT-121").isBlank()) text += "\nBefreiungscode: " + tax.value("BT-121");
    return text;
  }
  private InvoicePresentation() {}
}
