# Codex-Übergabe · Alpha 0.6

Historischer Nachweis zum angegebenen Alpha-Stand. Für die weitere Entwicklung
gilt [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md): Papier-/PDF-Ausgabe nach
DIN 5008 aus XRechnung/EN 16931-1 für Version 1.0; PDF-/Bildimport/OCR für Version 2.

Stand 08.11.2026. Vollständiges Projekt, gebaute JAR, Ressourcen, Bibliotheken,
Lizenzen und Tests liegen bei. Keine Abhängigkeit vom Chat-Verlauf.

## Einstieg

1. Projektordner lokal öffnen; AGENTS.md und README.md lesen.
2. Vollständiges JDK 17+ (empfohlen 21), dann sh build.sh oder ./build.ps1.
3. java -jar dist/xrechnung-viewer.jar starten; dist/lib und dist/licenses behalten.
4. Mehrere XML-Dateien öffnen oder hineinziehen; anschließend echte OS-Gesten abnehmen.

## Neu in 0.6

Zwei Fehler unabhängig von identischen Rechnungsbytes nachgewiesen:

- InvoiceTabHeader registrierte MouseListener für Hover, leitete aber keine
  Aktivierung an das JTabbedPane-Modell weiter. Linker MousePressed auf allen
  nicht interaktiven Header-Unterelementen aktiviert nun die eigene Workspace-
  Instanz; das Schließen-Icon bleibt ausgenommen.
- InvoiceRowLayout.preferredLayoutSize setzte während der Messung Kindergrößen;
  PaperText.getPreferredSize änderte den aktiven Swing-Text-View-Baum. Die Messung
  erzeugte 123 Invalidierungen. Messungen sind jetzt ohne diese Seiteneffekte;
  Textumbruch wird separat und mit Breiten-/Schriftcache gemessen.

DocumentLoadTask kapselt den existierenden SwingWorker-Ablauf. XML/Transformation
läuft im Hintergrund, Resultat und finally-Cleanup auf dem EDT. BusyIndicator
zeigt ein kleines Rad in der Statusleiste, Timer nur bei aktiver Verarbeitung.
Erfolg/Fehler/Entfernen stoppen den Timer. Swing-Ansichtsaufbau erfolgt weiterhin
auf dem EDT; sehr große Dokumente können dort weiterhin kurz blockieren.
Keine Änderung am fachlichen Mapping, Byte-Snapshot oder an Geld-Arithmetik.

87 Verträge erfolgreich. docs/interaction-0.6-red.log und -green.log,
docs/async-0.6-red.log und -green.log, docs/idle-0.6-trace.log beachten.
Die erste alte Trace-Ausführung ohne Window ließ AWT den EDT automatisch beenden;
IdleProbe verhindert das headless durch einen ausschließlich dort verwendeten
250-ms-Leer-Heartbeat. CPU-Zahlen im finalen Trace stammen vom lebenden EDT.

Lokale native Nachprüfung:

~~~sh
sh build.sh
java -cp 'build/classes:build/test-classes:vendor/lib/*' de.xrechnung.viewer.IdleProbe --window > build/idle-native.log
~~~

Das Diagnosefenster verwendet denselben InvoiceDesk, echte Dateikopien und 30
Robot-Mausklicks. Danach Thread-Zustand, EDT-CPU und Repaint/Invalidierungszähler.
Zusätzlich die normale App interaktiv prüfen; der Probe ist kein vollständiger
End-to-End-Test von App, Dateidialog und macOS-Ereignisverarbeitung.
Hier kein X-Server/Window-Desktop vorhanden; Cloud-Abnahme blieb headless.

## Historie 0.5

Die macOS-Rückmeldung zu Alpha 0.4 zeigte zwei echte Probleme: Aqua kürzte den
22-Pixel-Textbutton mit × zu ...; der Basic-Tab-Delegate nutzte keine verlässlichen
Aqua-Auswahlfarben. InvoiceTabHeader verwendet jetzt einen BasicButtonUI mit
gezeichnetem Icon, LeadingTabs zeichnet die komplette Reiterkontur und Auswahl
selbst. Der aktivierte Reiter wird nach Auswahl sichtbar gescrollt, während
manuelles Blättern weiterhin möglich bleibt. Kein Layout-Mock als Abnahmenachweis.

InvoicePaper richtet Kopfwerte und Summen in echten Spalten aus. Sämtliche
Detaildaten bleiben gerendert; ein zusätzlicher Umschalter blendet ihren Bereich
standardmäßig aus. Aufklappen stellt die gesamten vorhandenen Daten dar.

Die neue Nutzeranweisung ersetzt ausnahmslose Volltext-Tooltips: Dateireiter nutzen
jetzt Hover-Statuszeile. FullText.hint liefert nur bei Kürzung eine kleine Vorschau
(max. 240 Codepoints). Passive Tooltips ohne eingebettete Controls; 1 s Verzögerung,
4 s Anzeige; zusätzliche Ausblendung bei Klick/Scroll/Escape/Fensterdeaktivierung.
Quellbaum und Lücken behalten Volltextauswahlbereiche statt zusätzlicher Popups.

## Historie 0.4

Linksbündige, begrenzte Dateireiter mit zwei Textzeilen und getrenntem Schließen-X.
FullText stellt wiederverwendbare Vorschau-/Volltext-Tooltips bereit, einschließlich
Kompaktzellen, Quellbaum und Lücken. Keine HTML-Interpretation von Rechnungstext.
Rechnung / Quelldaten; redundanter Titel entfernt; Lückenknopf unten rechts.
LeadingTabs erzwingt horizontale Scroll-Reiter über BasicTabbedPaneUI. Das ist
bewusst eine Swing-Basisdarstellung statt des zentrierenden Aqua-Reiterdelegates.
Schriften/Farben stammen weiter aus dem gewählten System-Look-and-Feel.
InvoiceTabHeader reserviert eigene Bereiche für Dateiname, Nummer, Betrag, Datum
und Schließen. Keine Änderung an fachlichem Mapping oder Geldformatierung.

## Bereits in 0.3

Kompaktere Papieransicht, mindestens zwei Stellen bei EUR ohne Rundung,
globale Papier-/Kompaktansicht, mehrere Dokumentreiter mit Schließen,
Mehrfachdateiauswahl, lokale Datei-Drops als COPY. Der Warntext steht kleiner
unten. Validieren ist vorhanden und deaktiviert.

Die vom Nutzer tatsächlich verwendete Referenzdatei wurde byteweise per SHA-256
mit fixtures/kosit-01.01a-INVOICE_ubl.xml verglichen: identischer Inhalt,
74fb09c609d5fba15a8c543060998d3b92858f56a81fb5b0ed244d6794e498d1.
Zahlbetrag im Modell 336.9, Anzeige jetzt 336,90 EUR.

## Bausteine

- InvoiceFile, XmlDocuments, KositMapper, FieldCatalog, SemanticInvoice,
  SourceCoverage: unveränderte fachliche Grundlage aus 0.2.
- InvoiceFormat: währungsabhängige Mindeststellen, keine Kürzung weiterer Stellen,
  BigDecimal/UNNECESSARY. IDs/Codes werden nicht automatisch zu Zahlen.
- DocumentBatch: Hintergrundladen mehrerer Dateien; erfolgreiche Ergebnisse und
  dateibezogene Fehler getrennt. Reihenfolge erfolgreicher Dateien bleibt erhalten.
- InvoiceDesk: unabhängiger Snapshot pro Reiter, aktive Originalzuordnung,
  schließbare Reiter, globale Ansichtsart im laufenden Prozess.
- XmlFileDrop: dateilistenfähige Wrapper um bestehende TransferHandler.
  Erzwingt COPY, lehnt MOVE-only ab, delegiert Textkopieren.
- InvoiceWorkspace: Lückeninspektor pro Dokument, Rechnungs-/Quelldatenreiter,
  darunter kleinere Warnung; Paper/Table als innere Ansichtsarten.
- InvoicePaper: kompakte Blöcke, dichtere Positionszeilen, zweispaltige Details.
- InvoiceTableModel/InvoiceTable: fachlich beschriftete Tabelle, alle Werte/
  Metadaten, Wiederholungen mit Gruppennummern, Volltextdetails und Rohmodellwerte.
- App: Toolbar, Dateidialog, mehrere CLI-Dateien, asynchrones Laden und
  Originalkopie aus dem ausgewählten Snapshot. Validatorbutton noch deaktiviert.

Mehrfaches Öffnen desselben Pfads erzeugt absichtlich unabhängige Reiter.
Keine versteckte Aktualisierung geöffneter Dokumente von der Festplatte.
Ansichtsmodus gilt auch für später neu angelegte Reiter, nach Neustart wieder Papier.

## Nachweise

87 Tests grün; siehe docs/build-0.6.log und docs/VERIFICATION.md.
Der vollständige 3.0.1-Katalog bleibt 167 BT + 41 BG.
Quellabdeckung weiterhin 129/167 BT in sechs realen KoSIT-Dateien, ergänzt um
gezielte synthetische Quelltests. Feldmatrix aus 0.2 bleibt gültig.
87 Tests sind keine Zertifizierung; 0 Darstellungslücken bleibt kein Validierungsstatus.

Keine neuen Layoutnorm-/Pixeltests. Vorhandene alte Breiten-/Spaltenregressionen
laufen weiterhin. Die Vorschau wurde für beide Modi visuell headless geprüft.
Reale Fenster, Gesten, DPI, Plattformpakete und PowerShell sind noch lokal abzunehmen.

## Nächste Arbeiten

1. Native Bedienung auf Windows x64, Mac und Linux prüfen: Datei-Drop auf
   Textfelder/Tabellen/Leerflächen, Mehrfachauswahl, Tastatur, Schließen/Wechseln,
   Originalkopie und Clipboard. Dokumente dabei nicht verändern.
2. Fehlende Quellfälle der 3.0.1-Feldmatrix mit unabhängigen Goldens ergänzen.
3. Passenden KoSIT-Validator und 3.0.1-Regelpaket versioniert/offline integrieren.
   Zunächst Tests für gültig/ungültig/unbekannt/nicht unterstützt/Prüffehler.
   Gegen den Original-Byte-Snapshot des aktiven Reiters prüfen.
4. Erst danach PDF-Vorschau/Export. Genau dieselben PDF-Bytes für Vorschau und
   Export; dann präzise DIN-5008-Anforderungen und Layouttests festlegen.

Historischer Stand: HANDOFF-0.2.md, VERIFICATION-0.2.md und VERIFICATION-0.1.md.

## Verbindliche Ergänzung: Geld-Arithmetik

Aktuell keine Geldberechnungen, auch keine Summierung. BigDecimal wird nur für
wertgleiche Anzeigeformatierung verwendet; Nachnullen werden ohne Rundung ergänzt.
Künftig ausschließlich Decimal/BigDecimal aus Text. Jede Berechnung über reines
Summieren hinaus muss vor Implementierung/Ausführung mit konkreter Formel und
Präzisions-/Rundungsregeln vom Nutzer ausdrücklich bestätigt werden. Das gilt
auch für eingebundene Validatoren und Transformationen. AGENTS.md ist verbindlich.
