package de.xrechnung.viewer;

import java.util.ArrayList;
import javax.swing.*;

/** Real Swing input contracts, independently of native windows or PDF rendering. */
public final class PdfNavigationTests {
  public static void main(String[] args) throws Exception {
    SwingUtilities.invokeAndWait(()->{
      var events=new ArrayList<Integer>();
      var navigation=new PdfPageNavigation(5,events::add);
      navigation.previous();SemanticTests.equal(0,events.size());
      navigation.next();navigation.goTo(4);navigation.next();navigation.goTo(5);navigation.goTo(-1);
      SemanticTests.equal(java.util.List.of(1,4),events);
      SemanticTests.equal(4,navigation.currentPage());
      System.out.println("PASS navigation preserves page boundaries and emits exactly one selected index");
      var spinner=(JSpinner)java.util.Arrays.stream(navigation.getComponents()).filter(c->c instanceof JSpinner).findFirst().orElseThrow();
      var field=((JSpinner.DefaultEditor)spinner.getEditor()).getTextField();
      field.setText("2");
      try{spinner.commitEdit();}catch(java.text.ParseException ex){throw new AssertionError(ex);}
      SemanticTests.equal(1,navigation.currentPage());
      for(String invalid:java.util.List.of("0","6","1.5","1,5","-1","abc","999999999999999")) {
        field.setText(invalid);
        try{spinner.commitEdit();throw new AssertionError("accepted invalid page "+invalid);}
        catch(java.text.ParseException expected){}
        SemanticTests.equal(1,navigation.currentPage());
      }
      field.setValue(2);
      navigation.setBusy(true);navigation.next();navigation.goTo(4);
      SemanticTests.equal(1,navigation.currentPage());
      navigation.setBusy(false);
      System.out.println("PASS direct page input rejects invalid numbers and busy navigation leaves selection unchanged");
      var root=new JPanel();navigation.bindShortcuts(root);
      root.getActionMap().get("pdf-next").actionPerformed(null);SemanticTests.equal(2,navigation.currentPage());
      root.getActionMap().get("pdf-previous").actionPerformed(null);SemanticTests.equal(1,navigation.currentPage());
      var single=new PdfPageNavigation(1,index->{throw new AssertionError("single page emitted navigation");});
      single.next();single.previous();single.goTo(1);SemanticTests.equal(0,single.currentPage());
      System.out.println("PASS keyboard navigation and single-page documents obey the same bounds");
    });
    System.out.println("RESULT: 3 PDF navigation contracts passed");
  }
}
