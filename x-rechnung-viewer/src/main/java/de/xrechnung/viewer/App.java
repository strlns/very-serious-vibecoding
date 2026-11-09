package de.xrechnung.viewer;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.GraphicsEnvironment;
import java.awt.Toolkit;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import javax.swing.*;
import javax.swing.filechooser.FileNameExtensionFilter;

public final class App {
  private static final String TITLE = "XRechnung Viewer · Alpha 0.8";
  private final JFrame frame = new JFrame(TITLE);
  private final JButton open = new JButton("XML öffnen …");
  private final JButton copy = new JButton("Originalkopie speichern …");
  private final JButton pdf = new JButton("PDF-Vorschau …");
  private final JMenuItem pdfMenu = new JMenuItem("PDF-Vorschau / Export …");
  private final JButton validate = new JButton("Validieren");
  private final JComboBox<InvoiceMode> mode = new JComboBox<>(InvoiceMode.values());
  private final BusyIndicator activity = new BusyIndicator();
  private final JLabel status = new JLabel("Keine Rechnung geöffnet");
  private final JMenuItem openMenu = new JMenuItem("XML-Dateien öffnen …");
  private final JMenuItem copyMenu = new JMenuItem("Originalkopie speichern …");
  private final JMenuItem closeMenu = new JMenuItem("Reiter schließen");
  private final InvoiceDesk desk;
  private boolean busy;

  private App(List<Path> initialFiles) {
    desk =
        new InvoiceDesk(
            this::selectionChanged,
            text -> {
              if (!busy) {
                if (text == null) selectionChanged();
                else status.setText(text);
              }
            });
    var tips = ToolTipManager.sharedInstance();
    tips.setInitialDelay(1000);
    tips.setReshowDelay(300);
    tips.setDismissDelay(4000);
    // Discard passive hints on interaction, scrolling, Escape and application deactivation.
    java.awt.Toolkit.getDefaultToolkit()
        .addAWTEventListener(
            event -> {
              boolean dismiss =
                  event.getID() == java.awt.event.MouseEvent.MOUSE_PRESSED
                      || event.getID() == java.awt.event.MouseEvent.MOUSE_WHEEL
                      || event.getID() == java.awt.event.WindowEvent.WINDOW_DEACTIVATED
                      || (event instanceof java.awt.event.KeyEvent key
                          && key.getID() == java.awt.event.KeyEvent.KEY_PRESSED
                          && key.getKeyCode() == java.awt.event.KeyEvent.VK_ESCAPE);
              if (dismiss && tips.isEnabled()) {
                tips.setEnabled(false);
                tips.setEnabled(true);
              }
            },
            java.awt.AWTEvent.MOUSE_EVENT_MASK
                | java.awt.AWTEvent.MOUSE_WHEEL_EVENT_MASK
                | java.awt.AWTEvent.WINDOW_EVENT_MASK
                | java.awt.AWTEvent.KEY_EVENT_MASK);
    frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
    var toolbar = new JToolBar();
    toolbar.setFloatable(false);
    open.addActionListener(e -> chooseOpen());
    copy.addActionListener(e -> chooseCopy());
    pdf.addActionListener(e -> createPdf());
    pdfMenu.addActionListener(e -> createPdf());
    validate.setEnabled(false);
    validate.setToolTipText(
        "Geplant: Validierung gegen XRechnung 3.0.1. In dieser Alpha noch nicht verfügbar.");
    mode.addActionListener(e -> desk.setMode((InvoiceMode) mode.getSelectedItem()));
    mode.setMaximumSize(new Dimension(140, mode.getPreferredSize().height));
    toolbar.add(open);
    toolbar.add(copy);
    toolbar.add(pdf);
    toolbar.add(validate);
    toolbar.addSeparator();
    toolbar.add(new JLabel("Ansicht: "));
    toolbar.add(mode);
    frame.add(toolbar, BorderLayout.NORTH);
    frame.add(desk, BorderLayout.CENTER);
    status.putClientProperty("html.disable", Boolean.TRUE);
    status.setFont(status.getFont().deriveFont(11f));
    status.setBorder(BorderFactory.createEmptyBorder(3, 10, 5, 10));
    var footer = new JPanel(new BorderLayout(8, 0));
    footer.add(status, BorderLayout.CENTER);
    footer.add(activity, BorderLayout.EAST);
    frame.add(footer, BorderLayout.SOUTH);
    int shortcut = Toolkit.getDefaultToolkit().getMenuShortcutKeyMaskEx();
    var bar = new JMenuBar();
    var file = new JMenu("Datei");
    var help = new JMenu("Hilfe");
    openMenu.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_O, shortcut));
    openMenu.addActionListener(e -> chooseOpen());
    copyMenu.setAccelerator(
        KeyStroke.getKeyStroke(KeyEvent.VK_S, shortcut | InputEvent.SHIFT_DOWN_MASK));
    copyMenu.addActionListener(e -> chooseCopy());
    closeMenu.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_W, shortcut));
    closeMenu.addActionListener(e -> desk.closeSelected());
    file.add(openMenu);
    file.add(copyMenu);
    file.add(pdfMenu);
    file.add(closeMenu);
    file.addSeparator();
    var quit = new JMenuItem("Beenden");
    quit.addActionListener(e -> frame.dispose());
    file.add(quit);
    var about = new JMenuItem("Über diese Alpha …");
    about.addActionListener(
        e ->
            message(
                TITLE
                    + "\n\n"
                    + "Papier- und Kompaktansicht, mehrere Rechnungen und Drag & Drop.\n"
                    + "Die Ansicht gilt gemeinsam für alle geöffneten Reiter.\n"
                    + "PDF-Vorschau und Export mit vollständigen Details.\nKeine fachliche Regelvalidierung; DIN-5008-Abnahme offen.\n\n"
                    + InvoicePanel.DISCLAIMER,
                JOptionPane.INFORMATION_MESSAGE));
    help.add(about);
    bar.add(file);
    bar.add(help);
    frame.setJMenuBar(bar);
    var screen = Toolkit.getDefaultToolkit().getScreenSize();
    frame.setSize(Math.min(1280, screen.width), Math.min(860, screen.height));
    frame.setMinimumSize(new Dimension(Math.min(760, screen.width), Math.min(480, screen.height)));
    frame.setLocationRelativeTo(null);
    selectionChanged();
    installDrop();
    frame.setVisible(true);
    if (!initialFiles.isEmpty()) load(initialFiles);
  }

  private void chooseOpen() {
    var chooser = new JFileChooser();
    chooser.setDialogTitle("XML-Rechnungen öffnen");
    chooser.setMultiSelectionEnabled(true);
    chooser.setFileFilter(new FileNameExtensionFilter("XML-Dateien", "xml"));
    if (chooser.showOpenDialog(frame) == JFileChooser.APPROVE_OPTION) {
      var selected = chooser.getSelectedFiles();
      load(
          selected.length == 0 && chooser.getSelectedFile() != null
              ? List.of(chooser.getSelectedFile().toPath())
              : Arrays.stream(selected).map(java.io.File::toPath).toList());
    }
  }

  private void load(List<Path> paths) {
    if (paths.isEmpty() || busy) return;
    List<Path> requested = List.copyOf(paths);
    setBusy(true);
    status.setText(requested.size() + " Datei(en) werden geöffnet …");
    activity.setBusy(true, "XML wird verarbeitet …");
    new DocumentLoadTask(
            () -> DocumentBatch.load(requested),
            result -> {
              activity.setBusy(false, "");
              for (var document : result.loaded()) desk.addDocument(document);
              installDrop();
              if (!result.failures().isEmpty()) {
                String details =
                    result.failures().stream()
                        .map(f -> f.source().getFileName() + ": " + f.reason())
                        .collect(java.util.stream.Collectors.joining("\n"));
                message(
                    result.loaded().size()
                        + " Rechnung(en) geöffnet. "
                        + result.failures().size()
                        + " Datei(en) nicht geöffnet:\n\n"
                        + details,
                    JOptionPane.ERROR_MESSAGE);
              }
            },
            ex -> {
              activity.setBusy(false, "");
              message(
                  "Dateien konnten nicht geöffnet werden.\n" + rootMessage(ex),
                  JOptionPane.ERROR_MESSAGE);
            },
            () -> setBusy(false))
        .execute();
  }

  private void chooseCopy() {
    var selected = desk.active();
    if (selected == null || busy) return;
    String name = selected.source().getFileName().toString();
    var chooser = new JFileChooser();
    chooser.setDialogTitle("Originalkopie von " + name + " speichern");
    chooser.setSelectedFile(
        new java.io.File(name.replaceFirst("(?i)\\.xml$", "") + "-original.xml"));
    if (chooser.showSaveDialog(frame) != JFileChooser.APPROVE_OPTION) return;
    Path target = chooser.getSelectedFile().toPath();
    setBusy(true);
    status.setText("Originalkopie von " + name + " wird geschrieben und byteweise geprüft …");
    new SwingWorker<Void, Void>() {
      @Override
      protected Void doInBackground() throws Exception {
        selected.original().copyOriginal(target);
        return null;
      }

      @Override
      protected void done() {
        boolean confirmed = false;
        try {
          get();
          confirmed = true;
        } catch (Exception ex) {
          message(
              "Originalkopie von "
                  + name
                  + " konnte nicht bestätigt werden. Eine neue Zieldatei kann unvollständig sein.\n"
                  + rootMessage(ex),
              JOptionPane.ERROR_MESSAGE);
        } finally {
          setBusy(false);
        }
        if (confirmed) status.setText("Originalkopie von " + name + " wurde bytegenau geprüft.");
      }
    }.execute();
  }

  private void createPdf() {
    var selected = desk.active();
    if (selected == null || busy) return;
    setBusy(true);
    status.setText("PDF wird aus der ausgewählten Rechnung erzeugt …");
    new SwingWorker<PdfInvoice.Snapshot,Void>() {
      protected PdfInvoice.Snapshot doInBackground() throws Exception {
        return PdfInvoice.create(selected.original(), selected.invoice());
      }
      protected void done() {
        PdfInvoice.Snapshot result = null;
        try { result = get(); }
        catch (Exception ex) { message("PDF konnte nicht erzeugt werden.\n" + rootMessage(ex), JOptionPane.ERROR_MESSAGE); }
        finally { setBusy(false); }
        if (result != null) PdfPreview.show(frame, result, selected.source().getFileName().toString());
      }
    }.execute();
  }

  private void setBusy(boolean value) {
    busy = value;
    activity.setBusy(value, value ? "Verarbeitung läuft …" : "");
    selectionChanged();
  }

  private void selectionChanged() {
    var selected = desk.active();
    open.setEnabled(!busy);
    openMenu.setEnabled(!busy);
    copy.setEnabled(!busy && selected != null);
    pdf.setEnabled(!busy && selected != null);
    pdfMenu.setEnabled(!busy && selected != null);
    copyMenu.setEnabled(!busy && selected != null);
    closeMenu.setEnabled(selected != null);
    frame.setTitle(TITLE + (selected == null ? "" : " · " + selected.source().getFileName()));
    copy.setToolTipText(
        selected == null
            ? "Zuerst eine Rechnung öffnen"
            : "Originalkopie der ausgewählten Rechnung: " + selected.source());
    if (!busy)
      status.setText(
          selected == null
              ? "XML-Dateien öffnen oder in das Fenster ziehen"
              : desk.documentCount()
                  + " Rechnung(en) · "
                  + selected.source().getFileName()
                  + " · "
                  + selected.invoice().gaps().size()
                  + " Darstellungslücken · Nicht validiert");
  }

  private void installDrop() {
    XmlFileDrop.install(
        frame.getRootPane(),
        this::load,
        () -> busy,
        text -> message(text, JOptionPane.ERROR_MESSAGE));
  }

  private static String rootMessage(Throwable ex) {
    while (ex.getCause() != null) ex = ex.getCause();
    return ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
  }

  private void message(String text, int type) {
    var area = new JTextArea(text);
    area.setEditable(false);
    area.setLineWrap(true);
    area.setWrapStyleWord(true);
    area.setColumns(65);
    area.setBackground(UIManager.getColor("Panel.background"));
    JOptionPane.showMessageDialog(frame, area, TITLE, type);
  }

  public static void main(String[] args) throws Exception {
    if (args.length == 3 && args[0].equals("--pdf")) {
      var original = InvoiceFile.open(Path.of(args[1]));
      var invoice = KositMapper.map(original);
      var snapshot = PdfInvoice.create(original, invoice);
      snapshot.save(Path.of(args[2]));
      System.out.println("PDF gespeichert: " + args[2] + " · " + snapshot.pageCount() + " Seiten · Nicht validiert · DIN-5008-Abnahme offen");
      return;
    }
    if (args.length == 2 && args[0].equals("--inspect")) {
      var file = InvoiceFile.open(Path.of(args[1]));
      System.out.println(InvoicePanel.DISCLAIMER);
      System.out.println("Syntax: " + file.syntax() + " (nur Wurzelelement-Erkennung)");
      System.out.println("SHA-256: " + file.sha256());
      System.out.println("Einträge: " + file.entries().size() + "; NICHT VALIDIERT");
      return;
    }
    if (args.length == 2 && args[0].equals("--invoice")) {
      var file = InvoiceFile.open(Path.of(args[1]));
      var invoice = KositMapper.map(file);
      System.out.println(InvoicePanel.DISCLAIMER);
      System.out.println(invoice.status());
      System.out.println(
          "Rechnung "
              + invoice.root().value("BT-1")
              + " · "
              + invoice.fields().size()
              + " fachliche Werte · Darstellungslücken: "
              + invoice.gaps().size());
      for (var gap : invoice.gaps())
        System.out.println(
            "LÜCKE: " + gap.reason() + " | " + gap.sourcePath() + " | " + gap.value());
      return;
    }
    if (Arrays.stream(args).anyMatch(a -> a.startsWith("--"))) {
      System.out.println(
          "Aufruf: java -jar xrechnung-viewer.jar [datei1.xml datei2.xml …] | --invoice datei.xml |"
              + " --inspect datei.xml | --pdf datei.xml ausgabe.pdf");
      return;
    }
    if (GraphicsEnvironment.isHeadless())
      throw new IllegalStateException(
          "Desktop nicht verfügbar. --invoice oder --inspect verwenden.");
    System.setProperty("apple.laf.useScreenMenuBar", "true");
    System.setProperty("apple.awt.application.name", "XRechnung Viewer");
    UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
    List<Path> paths = Arrays.stream(args).map(Path::of).toList();
    SwingUtilities.invokeLater(() -> new App(paths));
  }
}
