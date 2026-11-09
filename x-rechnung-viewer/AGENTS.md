# Arbeitsvertrag

## Produktziel

Verbindliche Zieldefinition: [docs/PRODUCT-GOAL.md](docs/PRODUCT-GOAL.md).
Version 1.0: XRechnungen auf Basis von EN 16931-1 in Rechnungs-Papierform nach
DIN 5008 überführen, einschließlich PDF-Vorschau und PDF-Export. Relevante Daten
vollständig darstellen oder verbleibende Verarbeitungs-/Darstellungsgrenzen mit
Herkunft, Quellwert und Grund offen ausweisen (UI rechts, im PDF nachvollziehbar).
Exakte Normfassungen und Abnahmekriterien vor Konformitätsaussagen festlegen.
Version 2: unstrukturierter PDF-/Bildimport, OCR und assistierte XML-Erzeugung.
Diese Importfunktionen gehören ausdrücklich nicht zur 1.0-Abnahme.

Eine menschenlesbare Rechnung ist die Hauptfunktion. Nie wieder einen generischen
XML-Viewer als Produktziel behandeln. Native Swing-Desktop-App ohne Browser,
WebView, HTML-Rechnungsrenderer oder Electron. Java-17-kompatible Quellen.
XML-Diagnose bleibt nachgeordnet. Papier ist Startvorgabe; Kompakt ist eine
globale Auswahl für alle bestehenden/neuen Rechnungsreiter im laufenden Programm. Zielprofil dieses Stands: XRechnung 3.0.1.

## Stand 0.8

Papierähnliche Hauptansicht mit vollständiger generischer Darstellung des
offiziellen KoSIT-Zwischenmodells. 167 BT + 41 BG registriert und als native
Darstellung getestet. 129/167 BT in sechs KoSIT-Quelldateien tatsächlich beobachtet.
115 Testfälle grün. PDF-Vorschau und Export mit identischen Bytes, vollständigen
Modell-Details und Diagnoseanhang vorhanden. Keine vollständige Ende-zu-Ende-
Konformität, kein Regelvalidator, DIN-5008-Abnahme offen. Native Pakete und echte
GUI-Abnahme stehen noch aus. Siehe docs/PDF-0.8.md.

PDF-Garantien: pro Vorgang unveränderlicher Snapshot des ausgewählten Dokuments,
Erzeugung/Rendern/Speichern außerhalb des EDT. Vorschau rendert seitenweise dieselben
Bytes, die gespeichert werden. Kein Überschreiben; Grenzen (Schrift, Seiten/Text/
Dateigröße) ausdrücklich melden, nicht still abschneiden. Geld-Arithmetik bleibt
verboten; float-Werte in PdfInvoice betreffen ausschließlich Seitengeometrie.

PDF-Navigation: Zurück/Vor, direkte Seitennummer und Gesamtzahl, Alt-Pfeile.
Seitengrenzen und Ladezustand respektieren. Neben dem Disclaimer das Produktziel
in einem Satz zeigen; zentrale Formulierung InvoicePanel.PRODUCT_GOAL. Auch auf
jeder PDF-Seite; als Ziel, nicht als erreichte Konformität kennzeichnen.

## Datum und Zeit

Nur gültige reine Kalendertage lokal formatieren. Uhrzeiten, Offset/Zeitzonen und
Zusätze niemals still abschneiden oder umrechnen. Keine fehlende Quellzone erfinden.
Abweichende Datumsfeldwerte vollständig anzeigen und als Formathinweis kenntlich
machen; unbekannte Quellformate bleiben diagnostizierbar. Keine zusätzliche lokale
Zeitdarstellung ohne ausdrückliche Kennzeichnung der Umrechnung und ihrer Zielzone.
Quellwert stets erhalten. Siehe docs/DATE-TIME-SAFETY.md.

## TDD und Spezifikationstreue

1. Jede neue Garantie zuerst als fehlschlagenden, unabhängig begründeten Test formulieren
   und ausführen, dann implementieren und grün prüfen.
2. Red/Green nachvollziehbar festhalten. Gezielte Regressionstests dürfen bestehende
   Zusagen verfeinern, ohne dafür künstliche Produktfehler zu erfinden.
3. Keine Golden-Ergebnisse aus der zu testenden Implementierung ableiten.
4. Offizielle Bindungen, Schema und Sprachdatei nur bewusst mit Herkunft, Version,
   Hash und Lizenz ändern. Keine plausibel erfundenen Feldzuordnungen.
5. Eine vollständige Feldliste, statische XSLT-Referenzen, erfolgreiche Tests und
   ein Zählerstand 0 sind unterschiedliche Nachweise. Keiner ist eine Zertifizierung.

## Invarianten

- Unveränderter Original-Byte-Snapshot; keine Rückserialisierung als Originalkopie.
- Kein Float/Double, keine stillen Rundungen oder erfundenen Ersatzwerte.
- Namespace + lokaler Name bestimmen XML-Bedeutung, nicht Präfixe.
- Wiederholungen, Attribute und Unterpositionen erhalten. Ein Elternwert darf nicht
  aus einer Unterposition übernommen werden.
- Spezifikationstreue nicht zertifiziert bleibt in allen Ansichten und später auf
  jeder PDF-Seite sichtbar. Regelvalidierung separat mit genauer Version ausweisen.
- Nicht zugeordnete Daten rechts einsehbar halten, mit vollständigem Quellwert.
- Lückenbereich einklappbar: standardmäßig offen genau dann, wenn Lücken existieren.
  Die Gesamtzahl bleibt auch zugeklappt unten rechts sichtbar. Neue Datei setzt den Default neu.
- Eindeutig bedeutungslose Leerwerte nicht zählen; unbekannte leere Elemente/
  Attribute nicht blind als optional oder bedeutungslos einstufen.
- Gruppenquellenverweise decken nicht pauschal alle Nachfahren ab.
- Keine Kunden-Stylesheets, externen XML-Ressourcen oder Anlagen ausführen.
- Bestehende Zieldateien nicht überschreiben.

## Prüfen und fortsetzen

sh build.sh beziehungsweise ./build.ps1. Den vollständigen dist-Ordner behalten.
Katalog, reale Quelltests und offene Fälle stehen in docs/FIELD-COVERAGE-3.0.1.csv.
docs/HANDOFF.md und docs/MILESTONES.md lesen. Bei wachsendem Aufwand einen
belegten Zwischenstand melden; keine abgeschlossene Konformität behaupten.

## Aktuelle Prioritäten und Bedienregeln

- Vorschau nur lose an DIN 5008 orientieren; aktuell keine neuen Tests für Pixel,
  Abstände, Papiermaße oder Vorschau-Layout hinzufügen. Diese Präzision und
  entsprechende Normtests gehören später zur PDF-Ausgabe.
- Daten-/Spec-Behandlung, Formatierung ohne Rundung und Dokumentzustände gezielt testen.
- InvoiceFormat formatiert nur Anzeigestrings. BigDecimal aus Dezimaltext verwenden,
  keine Precision-/Skalenkürzung. EUR mindestens 2 Stellen, Mehrpräzision erhalten.
- Währungsnachkommastellen gemäß JDK-Currency; keine EUR-Annahme bei fehlendem Code.
- InvoiceDesk hält pro Reiter ein eigenes unverändertes Original. Kopieren/Validieren
  künftig an diesen Snapshot binden, nicht blind den Pfad erneut einlesen.
- Globale Ansicht bleibt beim Wechsel/Schließen/Neuöffnen von Reitern erhalten;
  keine Persistenz über einen Programmneustart zugesagt.
- Datei-Drops nur als COPY, niemals MOVE. Vorhandene Text-TransferHandler zum
  Kopieren delegieren, nicht einfach ersetzen. Keine Eingabedatei verschieben/löschen.
- Alpha-/Spec-Warnung kleiner unten. Validieren-Button bleibt deaktiviert,
  bis tatsächlich eine passende Regelvalidierung implementiert ist.

## Verbindliche Geld-Arithmetik-Regel des Nutzers

- Aktuell KEINE Geld-Arithmetik: Rechnungsbeträge, Summen, Steuern, Nachlässe und
  Zuschläge nur aus den geladenen Daten übernehmen. Auch keine Kontrollsummen bilden.
- Reine Anzeigeformatierung ist erlaubt: Dezimalkomma und ergänzte Nachnullen ohne
  Wertänderung oder Rundung. InvoiceFormat verwendet hierfür BigDecimal aus Text
  und setScale nur mit RoundingMode.UNNECESSARY und ohne Skalenverkleinerung.
- Falls künftig Geldberechnungen ausdrücklich beauftragt werden, ausnahmslos
  exakte Decimal-Arithmetik verwenden: in Java BigDecimal aus Dezimaltext,
  niemals float/double, auch nicht als Zwischenwert oder Konstruktorargument.
  Diese Regel gilt ebenso für Bibliotheken, Transformationen und Validierungsregeln.
- Jede künftige Geldberechnung, die über reines Summieren hinausgeht, muss dem
  Nutzer VOR Implementierung und Ausführung zur ausdrücklichen Bestätigung vorgelegt
  werden. Formel, Zweck, betroffene Werte und etwaige Rundungs-/Präzisionsregeln
  konkret erläutern. Insbesondere Subtraktion, Multiplikation, Division, Prozent-/
  Steuerberechnung, Umrechnung, Rundung und automatisch berechnete Ersatzwerte
  sind nicht pauschal freigegeben. Schweigen oder eine frühere allgemeine
  Entwicklungsfreigabe ersetzt diese Bestätigung nicht.
- Reines Summieren ist damit aktuell ebenfalls nicht beauftragt. Übermittelte
  Werte niemals durch errechnete Werte ersetzen. Neue zugelassene Berechnungen
  zuerst mit unabhängig begründeten Tests absichern.

## Reiter und Hinweise in 0.5

- Reiter linksbündig und mit begrenzter Breite; Dateiname und kleinere Metadaten
  getrennt von der Schließen-Schaltfläche. Blätterpfeile bei Überlauf erhalten.
- FullText ist das wiederverwendbare Kürzungs-/Hinweismuster. Volle Daten bleiben
  im Modell und im Auswahlbereich. Keine flächendeckenden Volltext-Tooltips mehr:
  kleine reine Textvorschauen nur bei gekürzten Labels/Tabellen-/Betragszellen,
  maximal 240 Codepoints. Kein HTML, keine Scroll-/Eingabekomponenten in Popups.
- Dateireiter zeigen den vollständigen Pfad und die Rechnungsdaten beim Hover in
  der Statuszeile; keine Datei-Tooltips. Quellbaum und Lücken nutzen Auswahlbereiche.
- Tooltips nach 1 Sekunde, maximal 4 Sekunden; Klick, Scrollen, Escape und
  Fensterdeaktivierung blenden sie zusätzlich aktiv aus.
- Schließen-Kreuz als Icon zeichnen, niemals als winzigen Aqua-Textbutton.
  Aktiven Reiter explizit über Farbe, Rahmen und Linie kennzeichnen.
- Papierkopf/Datum und Summen mit echten Spalten, niemals mit Leerzeichen ausrichten.
  Vollständige Detaildaten sind standardmäßig eingeklappt und vollständig aufklappbar.
- Navigation heißt Rechnung / Quelldaten. Kein zusätzlicher Rechnungsansicht-Titel.
- Plattformabnahme für Aqua/Windows und DPI weiterhin offen; LeadingTabs verwendet
  bewusst BasicTabbedPaneUI, damit Plattformdelegates keine Zentrierung erzwingen.

## Interaktion und Leerlauf ab 0.6

- Alle nicht interaktiven Unterelemente eines Dateireiterkopfs müssen den eigenen
  Reiter per linker Maustaste aktivieren. Schließen bleibt eine getrennte Aktion.
  Gleiche XML-Bytes/Rechnungsnummern dürfen unabhängige Dokumente nicht vermischen.
- Größenabfragen dürfen keine Komponenten vergrößern/verkleinern, Text-View-Bäume
  umkonfigurieren oder neue Invalidierungen/Repaints anfordern. Änderungen gehören
  in Layout-/Zustandsoperationen. Messwerte nach Breite/Schrift cachen.
- XML-Parser/KoSIT-Transformation ausschließlich außerhalb des Swing-EDT.
  Swing-Komponenten ausschließlich auf dem EDT erstellen/ändern.
- BusyIndicator hat nur während Verarbeitung einen Animationstimer. Bei Erfolg,
  Fehler und Entfernen der Komponente stoppen; keine Idle-Polling-Schleifen.
- Keine Hintergrund-EDT-Heartbeats in der Anwendung. IdleProbe nutzt nur headless
  einen ausdrücklich markierten Diagnose-Heartbeat, um AWT-Auto-Shutdown während
  der Messung zu vermeiden. Das ist kein Produktionsverhalten.
- InteractionTests/AsyncLoadTests sichern Interaktion, Messreinheit und Cleanup ab;
  es sind keine Vorschau-Pixeltests. IdleProbe --window für native Nachprüfung.

## Fehlertoleranz und späterer Papierimport ab 0.7

- Fehlertoleranz ist Fehlerisolation/Wiederaufnahme, keine stillschweigende XML-
  Reparatur. Syntaktisch fehlerhaftes XML gezielt ablehnen, Zeile/Spalte nennen.
- Wohlgeformtes XML kann schema-/fachlich ungültig sein. Anzeige/Zuordnungsanalyse
  und Regelvalidierung strikt unterscheiden; kein gültig-Status ohne eigene Prüfung.
- Fehlende/ungültige Rechnungswerte niemals durch errechnete oder erfundene Werte
  ersetzen. Original unverändert halten; nächste Datei und nächste Ladeoperation
  müssen nach regulären Parserfehlern bedienbar bleiben.
- Keine pauschalen catch(Throwable)-Blöcke zur Verdeckung von VM-/Programmierfehlern.
  Untersuchte Fehlerpfade testen; kein allgemeines Absturzfreiheitsversprechen.
- Papier-/PDF-zu-XML ist nur Version 2 / Roadmap M4: Text-Layer zuerst, Scan/OCR gesondert.
  Fundstellen/Unsicherheit, manuelle Prüfung, fehlende Pflichtdaten und validierte
  Erzeugung eines NEUEN XML sind eigene Arbeitsschritte. DIN-Layout ist kein
  ausreichender semantischer Nachweis. Kein Import durch automatische Geldrekonstruktion.
