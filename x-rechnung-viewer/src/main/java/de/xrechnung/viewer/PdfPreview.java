package de.xrechnung.viewer;

import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import java.nio.file.Path;
import javax.swing.*;
import javax.swing.filechooser.FileNameExtensionFilter;

/** Modeless native preview. A single immutable PDF snapshot owns every page and export. */
final class PdfPreview extends JDialog {
  private static final long serialVersionUID = 1L;
  private final PdfInvoice.Snapshot snapshot;
  private final JLabel pageImage = new JLabel("", SwingConstants.CENTER);
  private final JLabel status = new JLabel("PDF wird angezeigt …");
  private final JButton save = new JButton("PDF speichern …");
  private final PdfPageNavigation navigation;
  private final JComboBox<String> zoom = new JComboBox<>(new String[]{"75 %", "100 %", "125 %", "150 %"});
  private final JScrollPane scroll = new JScrollPane(pageImage);
  private final String suggested;
  private int page, request;
  private SwingWorker<BufferedImage,Void> rendering;

  static void show(Window owner, PdfInvoice.Snapshot snapshot, String name) {
    if (!SwingUtilities.isEventDispatchThread()) throw new IllegalStateException("PDF-Vorschau benötigt EDT");
    var preview = new PdfPreview(owner,snapshot,name); preview.setVisible(true); preview.render();
  }
  private PdfPreview(Window owner, PdfInvoice.Snapshot snapshot, String name) {
    super(owner, "PDF-Vorschau · " + name, ModalityType.MODELESS);
    this.snapshot=snapshot;
    navigation=new PdfPageNavigation(snapshot.pageCount(),index->{page=index;render();});
    navigation.bindShortcuts(getRootPane());
    suggested=name.replaceFirst("(?i)\\.xml$", "")+".pdf";
    setDefaultCloseOperation(DISPOSE_ON_CLOSE);
    var toolbar=new JToolBar();toolbar.setFloatable(false);
    toolbar.setBorder(BorderFactory.createEmptyBorder(6,8,6,8));
    toolbar.add(navigation);toolbar.addSeparator();
    toolbar.add(new JLabel("Zoom: "));toolbar.add(zoom);toolbar.add(Box.createHorizontalGlue());toolbar.add(save);
    zoom.setMaximumSize(new Dimension(100,32));zoom.setSelectedIndex(1);
    zoom.addActionListener(e->render());save.addActionListener(e->save());
    pageImage.setVerticalAlignment(SwingConstants.TOP);
    pageImage.setBorder(BorderFactory.createEmptyBorder(16,16,16,16));
    pageImage.setOpaque(true);pageImage.setBackground(new Color(225,230,236));
    scroll.getVerticalScrollBar().setUnitIncrement(24);
    add(toolbar,BorderLayout.NORTH);add(scroll,BorderLayout.CENTER);
    status.putClientProperty("html.disable",Boolean.TRUE);
    status.setBorder(BorderFactory.createEmptyBorder(6,10,6,10));
    var footer=new JPanel(new BorderLayout());
    footer.add(status,BorderLayout.NORTH);
    var purpose=new JTextArea(InvoicePanel.DISCLAIMER);
    purpose.setEditable(false);purpose.setOpaque(false);purpose.setLineWrap(true);purpose.setWrapStyleWord(true);
    purpose.setFont(purpose.getFont().deriveFont(10f));
    purpose.setBorder(BorderFactory.createEmptyBorder(0,10,8,10));
    footer.add(purpose,BorderLayout.CENTER);add(footer,BorderLayout.SOUTH);
    setSize(960,900);setLocationRelativeTo(owner);
    addWindowListener(new WindowAdapter(){public void windowClosed(WindowEvent e){request++;if(rendering!=null)rendering.cancel(true);pageImage.setIcon(null);}});
  }
  private void render() {
    final int token=++request, index=page;
    final float dpi=new float[]{54,72,90,108}[zoom.getSelectedIndex()];
    if(rendering!=null)rendering.cancel(true);
    navigation.setBusy(true);
    // Keep the last rendered page in place until its replacement is ready.
    if(pageImage.getIcon()==null)pageImage.setText("Seite wird geladen …");
    status.setText("Seite "+(page+1)+" / "+snapshot.pageCount()+" · Darstellung wird geladen …");
    rendering=new SwingWorker<>() {
      protected BufferedImage doInBackground() throws Exception {return snapshot.renderPage(index,dpi);}
      protected void done(){
        if(token!=request || !isDisplayable())return;
        try {
          pageImage.setIcon(new ImageIcon(get()));pageImage.setText("");
          scroll.getVerticalScrollBar().setValue(0);scroll.getHorizontalScrollBar().setValue(0);
          status.setText("Seite "+(index+1)+" / "+snapshot.pageCount()+" · Nicht validiert · DIN-5008-Abnahme offen");
        } catch(Exception ex){pageImage.setIcon(null);pageImage.setText("Vorschau konnte nicht geladen werden.");error(ex);}
        finally{navigation.setBusy(false);}
      }
    };rendering.execute();
  }
  private void save() {
    var chooser=new JFileChooser();chooser.setDialogTitle("Angezeigten PDF-Stand speichern");
    chooser.setFileFilter(new FileNameExtensionFilter("PDF-Dokument (*.pdf)","pdf"));
    chooser.setSelectedFile(new java.io.File(suggested));
    if(chooser.showSaveDialog(this)!=JFileChooser.APPROVE_OPTION)return;
    Path selected=chooser.getSelectedFile().toPath();
    final Path target=selected.toString().toLowerCase(java.util.Locale.ROOT).endsWith(".pdf")?selected:Path.of(selected+".pdf");
    save.setEnabled(false);
    new SwingWorker<Void,Void>() {
      protected Void doInBackground() throws Exception {snapshot.save(target);return null;}
      protected void done(){try{get();if(isDisplayable())status.setText("Angezeigter PDF-Stand gespeichert: "+target);}
        catch(Exception ex){if(isDisplayable())error(ex);}finally{save.setEnabled(true);}}
    }.execute();
  }
  private void error(Exception ex) {
    Throwable cause=ex;while(cause.getCause()!=null)cause=cause.getCause();
    var text=new JTextArea("PDF-Vorgang fehlgeschlagen. Bestehende Dateien werden nicht überschrieben. Eine neu angelegte Zieldatei kann bei Schreibfehlern unvollständig sein.\n"+cause.getMessage());
    text.setEditable(false);text.setLineWrap(true);text.setWrapStyleWord(true);text.setColumns(60);
    JOptionPane.showMessageDialog(this,text,"PDF",JOptionPane.ERROR_MESSAGE);
  }
}
