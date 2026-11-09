package de.xrechnung.viewer;

import java.awt.BorderLayout;
import java.awt.CardLayout;
import java.util.LinkedHashMap;
import javax.swing.*;
import javax.swing.JPanel;

public final class InvoiceDesk extends JPanel {
  private static final long serialVersionUID = 1L;
  private final JTabbedPane tabs = new LeadingTabs(true);
  private final CardLayout cards = new CardLayout();
  private final LinkedHashMap<InvoiceWorkspace, DocumentBatch.Loaded> documents =
      new LinkedHashMap<>();
  private InvoiceMode mode = InvoiceMode.PAPER;
  private final Runnable changed;
  private final java.util.function.Consumer<String> hover;

  public InvoiceDesk(Runnable onSelectionChanged) {
    this(onSelectionChanged, text -> {});
  }

  public InvoiceDesk(Runnable onSelectionChanged, java.util.function.Consumer<String> hover) {
    super();
    this.hover = hover;
    changed = onSelectionChanged;
    setLayout(cards);
    var welcome = new JPanel(new java.awt.GridBagLayout());
    var text =
        new JTextArea(
            "XRechnung Viewer\n\n"
                + "XML-Dateien öffnen oder in dieses Fenster ziehen.\n"
                + "Mehrere Rechnungen werden in eigenen Reitern geöffnet.");
    text.setEditable(false);
    text.setOpaque(false);
    text.setFont(text.getFont().deriveFont(15f));
    welcome.add(text);
    var welcomePage = new JPanel(new BorderLayout());
    welcomePage.add(welcome, BorderLayout.CENTER);
    var warning = new JTextArea("Alpha 0.8 · " + InvoicePanel.DISCLAIMER);
    warning.setEditable(false);warning.setOpaque(false);warning.setLineWrap(true);warning.setWrapStyleWord(true);
    warning.setFont(warning.getFont().deriveFont(10f));
    warning.setBorder(BorderFactory.createEmptyBorder(5, 10, 5, 10));
    welcomePage.add(warning, BorderLayout.SOUTH);
    add(welcomePage, "welcome");
    add(tabs, "documents");
    cards.show(this, "welcome");
    tabs.addChangeListener(e -> changed.run());
  }

  public void addDocument(DocumentBatch.Loaded document) {
    var workspace = new InvoiceWorkspace();
    workspace.setMode(mode);
    workspace.display(
        document.original(), document.invoice(), document.source().getFileName().toString());
    documents.put(workspace, document);
    String name = document.source().getFileName().toString();
    tabs.addTab(name, workspace);
    int index = tabs.indexOfComponent(workspace);

    tabs.setTabComponentAt(
        index,
        new InvoiceTabHeader(
            document, () -> close(workspace), () -> tabs.setSelectedComponent(workspace), hover));
    tabs.setSelectedComponent(workspace);
    cards.show(this, "documents");
    changed.run();
  }

  private void close(InvoiceWorkspace workspace) {
    documents.remove(workspace);
    tabs.remove(workspace);
    if (documents.isEmpty()) cards.show(this, "welcome");
    changed.run();
  }

  public void select(int index) {
    tabs.setSelectedIndex(index);
  }

  public void closeSelected() {
    if (tabs.getSelectedComponent() instanceof InvoiceWorkspace workspace) close(workspace);
  }

  public int documentCount() {
    return documents.size();
  }

  public DocumentBatch.Loaded active() {
    return documents.get(tabs.getSelectedComponent());
  }

  public void setMode(InvoiceMode mode) {
    this.mode = java.util.Objects.requireNonNull(mode);
    for (var workspace : documents.keySet()) workspace.setMode(mode);
  }

  public InvoiceMode mode() {
    return mode;
  }

  InvoiceWorkspace workspace(int index) {
    return (InvoiceWorkspace) tabs.getComponentAt(index);
  }
}
