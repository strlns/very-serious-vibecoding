# Codex-Übergabe · Alpha 0.8

Aktueller Versionsplan: [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md).
Version 1.0 = XRechnung/EN 16931-1 → DIN-5008-Papier-/PDF-Darstellung mit
nachvollziehbaren Restlücken; unstrukturierter PDF-/Bildimport und XML-Erzeugung
gehören zu Version 2. Die nachfolgenden Befunde beschreiben den Implementierungsstand.

Stand 08.11.2026. Vollständiges Projekt, gebaute JAR, Ressourcen, Bibliotheken,
Lizenzen und Tests liegen bei. Keine Abhängigkeit vom Chat-Verlauf.

## Einstieg

1. Projektordner lokal öffnen; AGENTS.md und README.md lesen.
2. Vollständiges JDK 17+ (empfohlen 21), dann sh build.sh oder ./build.ps1.
3. java -jar dist/xrechnung-viewer.jar starten; dist/lib und dist/licenses behalten.
4. Mehrere XML-Dateien öffnen oder hineinziehen; anschließend echte OS-Gesten abnehmen.

## Neu in 0.7

Neue Roadmap M0 für robuste Fehlerbehandlung und M4 für assistierten Papier-/PDF-
Import zu neu erzeugtem XML. M4 ausdrücklich nicht implementiert: Text-Layer,
OCR, fachliche Zuordnung, Benutzerprüfung und XML-Erzeugung/Validierung getrennt.
Kein stilles Reparieren oder automatisches Nachberechnen von Rechnungswerten.

Der Import war bereits pro Datei fehlertolerant: DocumentBatch fängt reguläre
Lese-/Parserausnahmen ab und lädt weitere Dateien. KositMapper liefert bei
Transformationsfehlern ein Diagnosemodell mit Originalbezug. Das ist kein XSD-
Validator und deckt nicht jede Pflichtfeld-/Wertverletzung als Diagnose ab.

InvoiceFile und XmlDocuments ergänzen nun die strukturierte Position des
SAXParseException in der Meldung (Zeile/Spalte); ursprüngliche Ursache bleibt
verkettet. Parserfeatures, DTD-/Entity-Sperren und Limits bleiben unverändert.
RecoveryTests prüfen fünf neue Fälle; nur die fehlende Positionsmeldung war ein
neuer Red-Fall. Vier weitere Tests sichern bereits vorhandene Erhaltung/Wiederaufnahme
als Regressionen ab. docs/recovery-0.7-red.log / -green.log beachten.
92 Tests, vollständiger Build in docs/build-0.7.log. Keine neue Geld-Arithmetik.

## Historie 0.6

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

92 Verträge erfolgreich. docs/interaction-0.6-red.log und -green.log,
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


## Lokale Fortsetzung 09.11.2026 — CII-Preisbasen

Siehe `docs/PRICE-BASE-REVIEW.md` für Reproduktion, Ursache und Grenzen.
Lokaler XSLT-Adapter ergänzt BT-149/150 für vorhandene CII-Netto-Preisbasen;
versionierte KoSIT-Dateien unverändert. 94 Verträge erfolgreich, Red/Green-Protokolle
liegen bei. Neue Rechnora-Fixtures bleiben unverändert; Lizenzhinweis ergänzt.
Papierlayout unverändert. Nächste fachliche Aufgaben: Preisbasen im Hauptlayout,
Steuer-/Befreiungshinweise und allgemeine Quellenverweise bei alternativen Präfixen.
Positionsorientierte zusätzliche Ansicht und Vollständigkeitsmatrix stehen in MILESTONES.


## Rechtes Hinweispanel, 09.11.2026

`GapInspector` kapselt die Darstellung bestehender `SemanticInvoice.Gap`-Befunde.
Dreizeilige Einträge mit Kategorie, kurzem XML-Kontext und Inhaltsvorschau;
Details getrennt nach Inhalt und Quelle, leere Werte ausdrücklich benannt.
Vollständige Gründe, Quellenpfade und Quellwerte bleiben markierbar/kopierbar.
Keine neue fachliche Klassifikation als gültig/ungültig oder DIN-Unvereinbarkeit.
Öffnungsdefault, Gesamtzahl und dokumentbezogener Zustand bleiben bestehen.

`fixtures/demo-darstellungshinweise.xml` demonstriert sieben offene Zuordnungen;
synthetisch erweitert, absichtlich nicht schema-konform, Geldwerte unverändert.
Zwei zusätzliche UI-Datenverträge prüfen unveränderte lange/wörtliche Inhalte,
Quellenpfade, Leerwerte und das Entfernen alter Details beim Dokumentwechsel.
Red/Green: `gap-panel-red.log` und `gap-panel-green.log`.
Headless-Swing-Vorschau unter `build/gap-panel-preview.png`; native macOS-Abnahme offen.


## Alpha 0.8 — PDF-Ausgabe

Aktueller Stand und Abnahmegrenzen: [PDF-0.8.md](PDF-0.8.md).
PdfInvoice erzeugt vollständige A4-Leseansichten aus Original-/Modell-Snapshot.
PdfPreview rendert dieselben unveränderlichen PDF-Bytes seitenweise im Hintergrund
und speichert sie mit CREATE_NEW. App hat Vorschau-/Exportaktion und --pdf-CLI.
InvoicePresentation teilt Preisbasis-/Steueranzeigetexte mit der bestehenden
Papieransicht. 115 Verträge; sh build.sh. Regelvalidator und genaue DIN-Abnahme offen.
Die vorstehenden Alpha-0.7-Abschnitte bleiben historische Übergabeinformationen.


## Darstellung von Positionskennungen und Einheiten

Siehe [UNITS-AND-LINE-IDS.md](UNITS-AND-LINE-IDS.md). Keine geänderten XML-Fixtures.
H87 wird als Stück angezeigt; XPP bleibt als Stück (XPP) unterscheidbar. Lange
PDF-Positionskennungen bleiben in ihrer bedarfsgerecht breiten ID-Spalte. Kein Ersatz
durch berechnete Nummern. 115 Verträge; elf davon PDF-Verträge.


## Ergänzung: PDF-Kommentare zu Kennungen, Preisbasis und Datum

Betragsüberschriften passend zu Beträgen ausgerichtet, dynamisch breitere ID-Spalte
ohne Auslagern. Bei expliziter Basis eins und Stückeinheit: „pro Stück“. Andere
Mengen und unbekannte Einheiten ausdrücklich erhalten. Strukturierte Daten folgen
FORMAT-Locale mit ISO-Fallback; Datumszeichenfolgen im BT-20-Freitext bleiben
unverändert. Quellen und Einzelheiten in UNITS-AND-LINE-IDS.md. 115 Verträge.


## Datumssicherheit über die Transformation hinweg

[DATE-TIME-SAFETY.md](DATE-TIME-SAFETY.md): lokale XSLT-Adapter verhindern
Abschneidung von Zeit-/Offsetzusätzen durch die alte KoSIT-date-Vorlage. Reine
Kalenderdaten behalten ihre Locale-Anzeige; alle anderen Angaben bleiben vollständig
mit sichtbarem Format-Hinweis erhalten. Keine Zeitzonenumrechnung, keine erratene
Zeitzone. 115 Verträge inklusive PDF-Erhaltstests; ursprüngliche KoSIT-Ressourcen
unverändert. Standard-Beispiel-PDFs wurden nicht neu erzeugt, da ihre reinen
Kalenderwerte und ihr Layout unverändert sind.


## PDF-Navigation und sichtbares Produktziel

PdfPageNavigation: „Zurück“, direktes Seitenfeld, Gesamtzahl, „Vor“; Alt-Pfeil
links/rechts. Ganze Seitennummern und Grenzen werden geprüft; keine Eingaben während
des Renderns. PdfPreview hält das alte Seitenbild bis zum Ersatz sichtbar und
ordnet Navigation/Zoom links, Speichern rechts. Disclaimer plus Zieltext erscheinen
auch auf jeder PDF-Seite; gemeinsamer Satz in InvoicePanel.PRODUCT_GOAL.
115 Verträge, davon 3 Navigation und 12 PDF. Details in PDF-0.8.md.
