package de.xrechnung.viewer;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.rendering.PDFRenderer;

/** Offline PDF layout from the immutable semantic snapshot. All floats below are page geometry. */
public final class PdfInvoice {
  public static final int MAX_PAGES = 500;
  public static final int MAX_BYTES = 32 * 1024 * 1024;
  private static final String FONT = "/org/apache/pdfbox/resources/ttf/LiberationSans-Regular.ttf";

  public static final class Snapshot {
    private final byte[] data;
    private final int pages;
    private Snapshot(byte[] data, int pages) { this.data = data.clone(); this.pages = pages; }
    public byte[] bytes() { return data.clone(); }
    public int pageCount() { return pages; }
    public BufferedImage renderPage(int index, float dpi) throws IOException {
      if (index < 0 || index >= pages || !Float.isFinite(dpi) || dpi < 36 || dpi > 160)
        throw new IllegalArgumentException("Ungültige Vorschauseite oder Auflösung");
      try (var doc = Loader.loadPDF(data)) { return new PDFRenderer(doc).renderImageWithDPI(index, dpi); }
    }
    public void save(Path target) throws IOException {
      // CREATE_NEW is the no-overwrite boundary, including existing symlinks.
      try (var out = Files.newOutputStream(target, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
        out.write(data);
      }
    }
  }

  public static Snapshot create(InvoiceFile original, SemanticInvoice invoice) throws IOException {
    try (var doc = new PDDocument()) {
      var info = doc.getDocumentInformation();
      info.setTitle("Rechnung · Leseansicht");
      info.setCreator("XRechnung Viewer · Alpha 0.8");
      info.setSubject("Abgeleitete Leseansicht. Nicht validiert. Original-SHA-256: " + original.sha256());
      try (var layout = new Layout(doc)) { layout.invoice(original, invoice); }
      try (var bytes = new ByteArrayOutputStream()) {
        doc.save(bytes);
        if (bytes.size() > MAX_BYTES) throw new IOException("PDF überschreitet 32 MiB; kein Export erzeugt.");
        return new Snapshot(bytes.toByteArray(), doc.getNumberOfPages());
      }
    } catch (IllegalArgumentException ex) {
      throw new IOException("PDF konnte nicht erzeugt werden: " + ex.getMessage(), ex);
    }
  }

  private static final class Layout implements AutoCloseable {
    private static final Color INK = new Color(35,48,65), MUTED = new Color(89,102,117), BLUE = new Color(38,72,107), LINE = new Color(222,227,232);
    private static final float LEFT = 56.7f, RIGHT = 42.5f, TOP = 68, BOTTOM = 68;
    private static final float WIDTH = PDRectangle.A4.getWidth() - LEFT - RIGHT;
    private final float[] COL = {42,162,66,112, WIDTH-382};
    private final PDDocument doc;
    private final PDType0Font font;
    private final Map<Integer,Float> widths = new HashMap<>();
    private PDPageContentStream stream;
    private float y;
    private String section = "Rechnung";
    private int characters;
    Layout(PDDocument doc) throws IOException {
      this.doc = doc;
      try (var input = PdfInvoice.class.getResourceAsStream(FONT)) {
        if (input == null) throw new IOException("Eingebettete PDF-Schrift fehlt.");
        font = PDType0Font.load(doc, input, true);
      }
    }
    private void page() throws IOException {
      if (Thread.currentThread().isInterrupted()) throw new IOException("PDF-Erzeugung abgebrochen.");
      if (doc.getNumberOfPages() >= MAX_PAGES) throw new IOException("PDF-Seitenlimit (500) erreicht; nichts wurde abgeschnitten.");
      if (stream != null) stream.close();
      var page = new PDPage(PDRectangle.A4); doc.addPage(page);
      stream = new PDPageContentStream(doc,page);
      y = PDRectangle.A4.getHeight()-TOP;
      at("XRECHNUNG · LESEANSICHT", LEFT, PDRectangle.A4.getHeight()-35, 8, BLUE);
      float labelWidth = width(section,8);
      at(section, LEFT+WIDTH-labelWidth, PDRectangle.A4.getHeight()-35, 8, MUTED);
    }
    private void ensure(float height) throws IOException { if (stream == null || y-height < BOTTOM) page(); }
    private float glyph(int cp) throws IOException {
      Float old = widths.get(cp); if (old != null) return old;
      try { float value = font.getStringWidth(new String(Character.toChars(cp)))/1000; widths.put(cp,value); return value; }
      catch (IllegalArgumentException ex) { throw new IOException("Zeichen U+"+Integer.toHexString(cp).toUpperCase(Locale.ROOT)+" ist in der PDF-Schrift nicht darstellbar. Kein unvollständiger Export erzeugt.",ex); }
    }
    private float width(String text, float size) throws IOException {
      float total = 0; for(int cp:text.codePoints().toArray()) total += glyph(cp)*size; return total;
    }
    private java.util.List<String> wrap(String text, float size, float max) throws IOException {
      characters += text.length();
      if (characters > 2_000_000) throw new IOException("PDF-Textbudget überschritten; nichts wurde abgeschnitten.");
      var lines = new ArrayList<String>();
      for (String paragraph : text.replace("\r\n","\n").replace('\r','\n').replace("\t","    ").split("\n",-1)) {
        if (paragraph.isEmpty()) { lines.add(""); continue; }
        int start=0;
        while (start < paragraph.length()) {
          int end=start, space=-1; float used=0;
          while (end < paragraph.length()) {
            int cp=paragraph.codePointAt(end); float next=glyph(cp)*size;
            if (used+next>max && end>start) break;
            used+=next; end+=Character.charCount(cp);
            if (cp==' ') space=end;
          }
          if (end<paragraph.length() && space>start) end=space;
          lines.add(paragraph.substring(start,end)); start=end;
        }
      }
      return lines;
    }
    private void at(String text, float x, float baseline, float size, Color color) throws IOException {
      stream.beginText(); stream.setFont(font,size); stream.setNonStrokingColor(color);
      stream.newLineAtOffset(x,baseline); stream.showText(text); stream.endText();
    }
    private void rule(float baseline) throws IOException {
      stream.setStrokingColor(LINE); stream.setLineWidth(.5f); stream.moveTo(LEFT,baseline); stream.lineTo(LEFT+WIDTH,baseline); stream.stroke();
    }
    private void paragraph(String text, float size, Color color) throws IOException {
      for (var line:wrap(text,size,WIDTH)) { ensure(size*1.4f); at(line,LEFT,y-size,size,color); y-=size*1.4f; }
      y-=4;
    }
    private void heading(String text) throws IOException { ensure(42); y-=8; paragraph(text,14,BLUE); }
    private void key(String label, String value) throws IOException {
      if (!value.isBlank()) paragraph(label+": "+value,10,INK);
    }
    private void columns(String[] text, float[] positions, float[] widths, float size) throws IOException {
      var lines = new ArrayList<java.util.List<String>>(); int count=0;
      for(int i=0;i<text.length;i++) { var wrapped=wrap(text[i],size,widths[i]);lines.add(wrapped);count=Math.max(count,wrapped.size()); }
      for(int n=0;n<count;n++) {
        ensure(size*1.4f);
        for(int i=0;i<text.length;i++) if(n<lines.get(i).size()) at(lines.get(i).get(n),positions[i],y-size,size,INK);
        y-=size*1.4f;
      }
      y-=12;
    }
    private void tableHeader() throws IOException {
      ensure(32); y-=4;
      String[] titles={"Pos.-ID","Beschreibung","Menge / Einheit","Einzelpreis","Betrag"};
      float x=LEFT;
      for(int i=0;i<titles.length;i++) {
        var lines=wrap(titles[i],8,COL[i]-10);
        for(int n=0;n<lines.size();n++) {
          String text=lines.get(n);
          float offset=i>=3?COL[i]-5-width(text,8):5;
          at(text,x+offset,y-8-n*10,8,BLUE);
        }
        x+=COL[i];
      }
      y-=27; rule(y); y-=6;
    }
    private void tableRow(String[] cells) throws IOException {
      var lines=new ArrayList<java.util.List<String>>();int count=0;
      for(int i=0;i<cells.length;i++) { var wrapped=wrap(cells[i],9,COL[i]-10);lines.add(wrapped);count=Math.max(count,wrapped.size()); }
      float fullHeight=count*13+12;
      if (y-fullHeight<BOTTOM && fullHeight<PDRectangle.A4.getHeight()-TOP-BOTTOM-40) {
        page(); tableHeader();
      }
      for(int n=0;n<count;n++) {
        if(y-13<BOTTOM) { page(); tableHeader(); }
        float x=LEFT;
        for(int i=0;i<cells.length;i++) {
          if(n<lines.get(i).size()) {
            String text=lines.get(i).get(n);
            float offset=i>=3?COL[i]-5-width(text,9):5;
            at(text,x+offset,y-9,9,INK);
          }
          x+=COL[i];
        }
        y-=13;
      }
      y-=5;rule(y);y-=7;
    }
    private void details(SemanticInvoice.Node parent, SemanticInvoice.Node root) throws IOException {
      for(var node:parent.children()) {
        if(node.group()) {
          if(node.walk().stream().noneMatch(n -> !n.group() && (!n.value().isBlank() || !n.properties().isEmpty()))) continue;
          ensure(46); y-=7; paragraph(node.label()+" · "+node.id(),11,BLUE);
          details(node,root);
        } else if(!node.value().isBlank() || !node.properties().isEmpty()) {
          String label=node.label()+" · "+node.id();
          String value=node.value().isEmpty()?"(leer)":InvoiceFormat.field(node,root);
          for(var property:node.properties()) value+="\n"+property.label()+": "+(property.value().isEmpty()?"(leer)":property.value());
          var labels=wrap(label,8.5f,176);
          var values=wrap(value,9,WIDTH-192);
          int count=Math.max(labels.size(),values.size());
          float height=count*12+7;
          if(height < PDRectangle.A4.getHeight()-TOP-BOTTOM) ensure(height);
          for(int i=0;i<count;i++) {
            ensure(12);
            if(i<labels.size()) at(labels.get(i),LEFT,y-9,8.5f,MUTED);
            if(i<values.size()) at(values.get(i),LEFT+192,y-9,9,INK);
            y-=12;
          }
          y-=3;rule(y);y-=4;
        }
      }
    }
    private void total(String label, String value, boolean emphasis) throws IOException {
      float size=emphasis?13:10;
      var lines=wrap(value,size,220);
      ensure(Math.max(20,lines.size()*size*1.4f+6));
      at(label,LEFT+WIDTH-304,y-size,size,emphasis?BLUE:INK);
      for(var line:lines) {at(line,LEFT+WIDTH-width(line,size),y-size,size,emphasis?BLUE:INK);y-=size*1.4f;}
      y-=4;
    }
    void invoice(InvoiceFile original, SemanticInvoice invoice) throws IOException {
      var root=invoice.root();String currency=root.value("BT-5");page();
      paragraph(root.value("BT-3").equals("381")?"Gutschrift":"Rechnung",25,INK);
      paragraph(root.value("BT-1").isBlank()?"Rechnungsnummer fehlt":root.value("BT-1"),15,MUTED);
      y-=6;
      String seller=party(root,"BG-4",new String[]{"BT-27","BT-35","BT-36","BT-162","BT-38","BT-37","BT-40"});
      String buyer=party(root,"BG-7",new String[]{"BT-44","BT-50","BT-51","BT-163","BT-53","BT-52","BT-55"});
      columns(new String[]{"VERKÄUFER\n"+seller,"RECHNUNGSEMPFÄNGER\n"+buyer},new float[]{LEFT,LEFT+WIDTH/2+8},new float[]{WIDTH/2-12,WIDTH/2-8},10);
      key("Rechnungsdatum",InvoiceFormat.date(root.value("BT-2")));
      key("Zahlbar bis",InvoiceFormat.date(root.value("BT-9")));
      key("Käuferreferenz",root.value("BT-10")); key("Bestellnummer",root.value("BT-13"));
      for(var note:root.all("BT-22")) key("Bemerkung",note.value());
      var lines=root.all("BG-25");
      if(!lines.isEmpty()) {
        float idWidth=42;
        for(var line:lines) idWidth=Math.max(idWidth,Math.min(100,width(line.value("BT-126"),9)+10));
        COL[0]=idWidth; COL[1]=204-idWidth;
        heading("Positionen"); tableHeader();
        for(var line:lines) {
          String description=line.value("BT-153");
          if(!line.value("BT-154").isBlank()) description+="\n"+line.value("BT-154");
          String tax=InvoicePresentation.lineTax(line);if(!tax.isBlank()) description+="\n"+tax;
          String lineId = line.value("BT-126");
          tableRow(new String[]{lineId,description,
              InvoiceFormat.decimal(line.value("BT-129"))+" "+InvoicePresentation.unit(line.value("BT-130")),
              InvoicePresentation.price(line,currency),InvoiceFormat.money(line.value("BT-131"),currency)});
        }
      }
      heading("Summen und Steuern");
      for(var total:root.all("BG-22")) {
        for(var item:java.util.List.of(new String[]{"Nettobetrag","BT-109"},new String[]{"Umsatzsteuer","BT-110"},new String[]{"Bruttobetrag","BT-112"},new String[]{"Bereits gezahlt","BT-113"},new String[]{"Rundungsbetrag","BT-114"},new String[]{"Zahlbetrag","BT-115"}))
          if(!total.value(item[1]).isBlank()) total(item[0],InvoiceFormat.money(total.value(item[1]),currency),item[1].equals("BT-115"));
      }
      for(var tax:root.all("BG-23")) paragraph(InvoicePresentation.tax(tax,currency),10,MUTED);
      var paymentLines = new ArrayList<String>();
      addPayment(paymentLines,"Zahlungsbedingungen",root.value("BT-20"));
      addPayment(paymentLines,"Verwendungszweck",root.value("BT-83"));
      for(var payment:root.all("BG-17")) {
        addPayment(paymentLines,"Zahlungskonto",payment.value("BT-84"));
        addPayment(paymentLines,"Kontoinhaber",payment.value("BT-85"));
        addPayment(paymentLines,"Zahlungsdienstleister",payment.value("BT-86"));
      }
      if(!paymentLines.isEmpty()) {
        String paymentText=String.join("\n",paymentLines);
        float height=wrap(paymentText,9.5f,WIDTH).size()*13.3f+38;
        ensure(Math.min(height,PDRectangle.A4.getHeight()-TOP-BOTTOM));
        heading("Zahlungsangaben");paragraph(paymentText,9.5f,INK);
      }
      section="Rechnungsdetails";page();heading("Vollständige Rechnungsangaben");
      paragraph("Offene Zuordnungen: "+invoice.gaps().size()+". Kein Validierungsergebnis. Alle im Zwischenmodell vorhandenen Felder und Metadaten. Hauptansicht und Details können Angaben wiederholen. XML bleibt das Original.",10,MUTED);
      paragraph("Original-SHA-256: "+original.sha256(),8,MUTED);
      paragraph(invoice.status(),8,MUTED);
      details(root,root);
      if(!invoice.gaps().isEmpty()) {
        section="Diagnoseanhang";page();heading("Diagnoseanhang");
        paragraph(invoice.gaps().size()+" Hinweise zur Darstellung. Keine Fehlerquote, keine fachliche Gültigkeitsprüfung. Nicht verarbeitete Inhalte bleiben nachfolgend mit Quelle und Wert sichtbar.",10,MUTED);
        int i=0;for(var gap:invoice.gaps()) {
          heading("Hinweis "+(++i));paragraph(gap.reason(),10,INK);
          paragraph("Quelle: "+gap.sourcePath(),8,MUTED);
          paragraph("Vollständiger Quellwert:",9,MUTED);
          paragraph(gap.value().isEmpty()?"(leer - kein Textinhalt)":gap.value(),10,INK);
        }
      }
      stream.close();stream=null;
      int number=0;
      for(var page:doc.getPages()) {
        stream=new PDPageContentStream(doc,page,PDPageContentStream.AppendMode.APPEND,true,true);
        at("Spezifikationstreue nicht zertifiziert · Nicht validiert",LEFT,53,7.5f,MUTED);
        at(InvoicePanel.PRODUCT_GOAL,LEFT,41,7.5f,MUTED);
        at("DIN-5008-Abnahme offen · PDF ist Leseansicht, XML bleibt Original.",LEFT,29,7.5f,MUTED);
        String label="Seite "+(++number)+" / "+doc.getNumberOfPages();
        at(label,LEFT+WIDTH-width(label,7.5f),17,7.5f,MUTED);stream.close();stream=null;
      }
    }
    private static void addPayment(java.util.List<String> lines,String label,String value) {
      if(!value.isBlank()) lines.add(label+": "+value);
    }
    private static String party(SemanticInvoice.Node root,String group,String[] terms) {
      var found=root.all(group);if(found.isEmpty()) return "";
      var result=new ArrayList<String>();for(String term:terms) {String value=found.get(0).value(term);if(!value.isBlank()) result.add(value);}
      return String.join("\n",result);
    }
    public void close() throws IOException { if(stream!=null) {stream.close();stream=null;} }
  }
  private PdfInvoice() {}
}
