package de.xrechnung.viewer;

import java.util.List;

public record SemanticInvoice(Node root, List<Gap> gaps, String status) {
  public record Property(String name, String label, String value) {}

  public record Node(
      String key,
      String name,
      String id,
      String label,
      String value,
      String sourcePath,
      String type,
      List<Property> properties,
      List<Node> children) {
    public Node {
      properties = List.copyOf(properties);
      children = List.copyOf(children);
    }

    public List<Node> all(String bt) {
      return walk().stream().filter(n -> n.id().equals(bt)).toList();
    }

    /** Summary lookup respects line boundaries. all() still includes every descendant. */
    public String value(String bt) {
      String found = findValue(bt, false);
      return found == null ? "" : found;
    }

    private String findValue(String bt, boolean lineScope) {
      if (id.equals(bt)) return value;
      boolean scoped = lineScope || id.equals("BG-25") || id.equals("BG-DEX-01");
      for (Node child : children) {
        if (scoped && child.id.equals("BG-DEX-01")) continue;
        String found = child.findValue(bt, scoped);
        if (found != null) return found;
      }
      return null;
    }

    public List<Node> walk() {
      var nodes = new java.util.ArrayList<Node>();
      nodes.add(this);
      for (Node child : children) nodes.addAll(child.walk());
      return List.copyOf(nodes);
    }

    public boolean group() {
      return id.startsWith("BG-") || name.equals("invoice");
    }
  }

  public record Gap(String reason, String sourcePath, String value) {}

  public SemanticInvoice {
    gaps = List.copyOf(gaps);
  }

  public List<Node> fields() {
    return root.walk().stream().filter(n -> !n.group()).toList();
  }
}
