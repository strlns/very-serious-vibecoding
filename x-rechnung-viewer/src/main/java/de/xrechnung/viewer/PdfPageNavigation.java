package de.xrechnung.viewer;

import java.awt.*;
import java.awt.event.*;
import java.text.ParseException;
import java.util.function.IntConsumer;
import javax.swing.*;
import javax.swing.text.DefaultFormatterFactory;

/** Bounded one-based page input; callbacks use zero-based PDF page indices. EDT only. */
final class PdfPageNavigation extends JPanel {
  private static final long serialVersionUID = 1L;
  private final int count;
  private final IntConsumer changed;
  private final JButton previous = new JButton("Zurück"), next = new JButton("Vor");
  private final JSpinner number;
  private int page;
  private boolean updating, busy;

  PdfPageNavigation(int count, IntConsumer changed) {
    super(new FlowLayout(FlowLayout.LEFT, 6, 0));
    if(count < 1) throw new IllegalArgumentException("PDF muss mindestens eine Seite haben");
    this.count=count;this.changed=java.util.Objects.requireNonNull(changed);
    number=new JSpinner(new SpinnerNumberModel(1,1,count,1));
    var editor=new JSpinner.NumberEditor(number,"0");number.setEditor(editor);
    var input=editor.getTextField();
    input.setFormatterFactory(new DefaultFormatterFactory(new JFormattedTextField.AbstractFormatter(){
      private static final long serialVersionUID = 1L;
      public Object stringToValue(String value) throws ParseException {
        try {
          if(!value.matches("[0-9]+")) throw new NumberFormatException();
          int parsed=Integer.parseInt(value);
          if(parsed<1 || parsed>count) throw new NumberFormatException();
          return parsed;
        }catch(NumberFormatException ex){throw new ParseException("Seitenzahl von 1 bis "+count+" eingeben",0);}
      }
      public String valueToString(Object value){return value==null?"":value.toString();}
    }));
    input.setValue(1);input.setColumns(Math.max(2,Integer.toString(count).length()));
    input.setHorizontalAlignment(SwingConstants.CENTER);
    input.setFocusLostBehavior(JFormattedTextField.COMMIT_OR_REVERT);
    number.getAccessibleContext().setAccessibleName("PDF-Seite");
    input.getAccessibleContext().setAccessibleDescription("Seitenzahl von 1 bis "+count+", mit Enter übernehmen");
    previous.getAccessibleContext().setAccessibleDescription("Vorherige PDF-Seite, Alt und Pfeil links");
    next.getAccessibleContext().setAccessibleDescription("Nächste PDF-Seite, Alt und Pfeil rechts");
    add(previous);add(new JLabel("Seite"));add(number);add(new JLabel("von "+count));add(next);
    previous.addActionListener(e->previous());next.addActionListener(e->next());
    number.addChangeListener(e->{
      if(updating)return;
      int requested=((Number)number.getValue()).intValue()-1;
      if(busy || requested<0 || requested>=count){sync();return;}
      goTo(requested);
    });
    sync();
  }
  int currentPage(){return page;}
  void previous(){if(!busy)goTo(page-1);}
  void next(){if(!busy)goTo(page+1);}
  void goTo(int index){
    if(busy || index<0 || index>=count || index==page)return;
    page=index;sync();changed.accept(page);
  }
  void setBusy(boolean value){busy=value;sync();}
  private void sync(){
    updating=true;
    try{number.setValue(page+1);}finally{updating=false;}
    number.setEnabled(!busy && count>1);
    previous.setEnabled(!busy && page>0);next.setEnabled(!busy && page+1<count);
  }
  void bindShortcuts(JComponent root){
    bind(root,KeyStroke.getKeyStroke(KeyEvent.VK_LEFT,InputEvent.ALT_DOWN_MASK),"pdf-previous",this::previous);
    bind(root,KeyStroke.getKeyStroke(KeyEvent.VK_RIGHT,InputEvent.ALT_DOWN_MASK),"pdf-next",this::next);
  }
  private static void bind(JComponent root,KeyStroke stroke,String key,Runnable action){
    root.getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW).put(stroke,key);
    root.getActionMap().put(key,new AbstractAction(){
      private static final long serialVersionUID = 1L;
      public void actionPerformed(ActionEvent e){action.run();}
    });
  }
}
