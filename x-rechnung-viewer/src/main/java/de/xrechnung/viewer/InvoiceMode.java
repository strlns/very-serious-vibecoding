package de.xrechnung.viewer;

public enum InvoiceMode {
  PAPER("Papier"),
  TABLE("Kompakt");
  private final String label;

  InvoiceMode(String label) {
    this.label = label;
  }

  @Override
  public String toString() {
    return label;
  }
}
