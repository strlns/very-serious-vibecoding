# XRechnung Viewer · Alpha 0.8

## Ziel: Version 1.0 und Version 2

Version 1.0 überführt XRechnungen auf Basis von EN 16931-1 in eine fachlich
nachvollziehbare Rechnungsdarstellung nach DIN 5008, einschließlich PDF-Vorschau
und PDF-Export. Nicht verarbeitete oder nicht dargestellte Inhalte werden rechts
mit Herkunft, Quellwert und Grund ausgewiesen; verbleibende Lücken müssen auch
im PDF nachvollziehbar bleiben. Aktuell ist dieses Ziel noch nicht erreicht.

PDF-/Bildimport, OCR und die assistierte Erzeugung neuer XRechnungen sind auf
Version 2 verschoben. Verbindliche Ziele und Abnahmekriterien:
[Produktziel und Versionsgrenzen](docs/PRODUCT-GOAL.md).

**Spezifikationstreue nicht zertifiziert. Nicht fachlich validiert.**

Eine menschenlesbare Java-Desktop-Anwendung für Windows, macOS und Linux.
Die Hauptansicht ist eine Rechnung im Papierstil mit Adressen, Rechnungsdaten,
Positionen, Summen, Steuern und Zahlungsangaben. Darunter stehen die weiteren
fachlichen Angaben mit deutschen Bezeichnungen und BT/BG-Kennungen.
XML-Baum und Quelltext sind nur noch im Reiter „Quelldaten“.

Kein Browser, keine WebView, kein Electron und keine HTML-Rechnungsdarstellung.
Die Oberfläche ist mit nativen Java-Desktop-Komponenten in Swing umgesetzt und
nutzt das System-Look-and-Feel. Die JVM bleibt erforderlich beziehungsweise wird
in später gebauten App-Paketen mitgeliefert. Es ist kein reines AOT-Maschinencodeprogramm.

## Neu in 0.8

- Native PDF-Vorschau mit Zurück/Vor, direkter Seitennummer, Alt-Pfeilen und Zoom; „PDF speichern …“ exportiert
  exakt den angezeigten PDF-Stand. Erzeugung, Rendern und Speichern im Hintergrund.
- A4-Leseansicht mit wiederholten Positionsüberschriften bei Seitenumbrüchen,
  vollständigen fachlichen Detailseiten und einem Diagnoseanhang bei offenen Lücken.
- Preisbasismenge/-einheit direkt am Einzelpreis, Steuerkategorie/-satz je Position
  und übermittelte Befreiungsgründe in Papieransicht und PDF.
- Keine Geld-Arithmetik; zusätzliche übermittelte Nachkommastellen bleiben erhalten.
- **Keine bestätigte DIN-5008-Konformität, keine fachliche Regelvalidierung.**
  Zwölf zusätzliche PDF-Verträge; insgesamt 115 Tests. Einzelheiten: [PDF-Stand](docs/PDF-0.8.md).

### PDF ausprobieren

```sh
sh build.sh
java -jar dist/xrechnung-viewer.jar fixtures/Rechnora/rechnung-gemischte-steuersaetze2.xml
```

In der App „PDF-Vorschau …“ wählen, danach „PDF speichern …“.
Auch ohne grafischen Desktop:

```sh
java -jar dist/xrechnung-viewer.jar --pdf fixtures/demo-darstellungshinweise.xml neue-ausgabe.pdf
```

Bestehende Ziele werden nicht überschrieben. Bei Schreibfehlern kann eine neu
angelegte Zieldatei unvollständig bleiben. Nicht unterstützte Schriftzeichen und
Ressourcenlimits führen zum ausdrücklichen Abbruch statt stiller Auslassung.
Original-XML und Anlagen werden weder in PDF eingebettet noch ausgeführt.

## Bereits in 0.7

- Parserfehler nennen Zeile und Spalte, sofern der XML-Parser diese liefert.
- Zusätzliche Recovery-Tests für beschädigte/gesperrte XML-Dateien, unvollständige
  Rechnungen, ungültige Feldtexte und erneutes Laden nach gemischten Fehlern.
- Roadmap ergänzt: assistierter PDF-/Papierimport mit späterer XML-Erzeugung,
  zunächst Text-Layer, anschließend Scan/OCR; noch nicht implementiert.

## Bereits in 0.6

- Klicks auf Dateiname und Metadaten aktivieren jetzt den jeweiligen Reiter.
  Auch byteidentische Dateikopien behalten unabhängige Original-Snapshots.
- Größenberechnungen der Papieransicht verändern keine Unterelemente mehr:
  eine Quelle wiederholter Layout-Invalidierungen wurde entfernt.
- Kleine animierte Ladeanzeige während der asynchronen XML-Verarbeitung.
  Im Leerlauf ist ihr Timer vollständig gestoppt.
- Reproduzierbare Tests und ein optionales Leerlauf-Diagnoseprogramm liegen bei.

## Bereits in 0.5

- Aktivmarkierung der Reiter unabhängig vom Betriebssystem: blaue Kontur,
  heller Hintergrund, Unterstreichung. Gezeichnetes Schließen-Kreuz statt Textbutton.
- Dateiname und Rechnungsdaten beim Überfahren des Reiters in der Statuszeile.
  Kleine passive Hinweise nur bei gekürzten Tabellen-/Label-/Betragswerten;
  maximal 240 Zeichen Vorschau, Volltext weiterhin im Auswahlbereich.
- Tooltips ohne Scrollbereiche, verzögert und zeitlich begrenzt; Klick, Scrollen,
  Escape und Fensterdeaktivierung schließen Hinweise.
- Datum und weitere Kopfdaten in echten Spalten; Summen rechts unter den Beträgen.
  Vollständige Zusatzangaben einklappbar; aufgeklappt mit ruhigeren, dünnen Zeilen.

## Bereits in 0.4

- Linksbündige Dateireiter mit begrenzter Breite, vertikal zentriertem Text und
  Schließen-Kreuz rechts. Lange Namen werden mit ... gekürzt; Blätterpfeile bleiben.
- Kleinere zweite Zeile mit Rechnungsnummer, Zahlbetrag und Datum in getrennten
  Bereichen. Vollständige Texte bleiben über Tooltips zugänglich.
- Gemeinsames Volltext-Tooltip-Muster für gekürzte Labels, Tabellen, Quellbaum und
  Lückenliste. Auch Kompaktzellen zeigen ihren ganzen Wert beim Darüberfahren.
- Darstellungslücken unten rechts; redundanter Titel entfernt; Navigation Quelldaten.

## Bereits in 0.3

- Kompaktere Papieransicht mit nebeneinanderliegenden Adress-/Rechnungsblöcken,
  weniger Abständen und zweispaltigen Detailangaben. Lose an den Lesbarkeits- und
  Gliederungszielen der DIN 5008 orientiert; keine Behauptung genauer Normkonformität.
- Beträge werden ohne Rundung formatiert: 336.9 wird zu 336,90 EUR.
  Zusätzliche übermittelte Nachkommastellen bleiben sichtbar.
- Mehrere XML-Dateien per Dateidialog, Kommandozeile oder Drag & Drop öffnen.
  Jede Datei erhält einen eigenen, schließbaren Reiter; vollständiger Pfad beim Hover in der Statuszeile.
- Globale Auswahl Papier / Kompakt gilt für bestehende und neue Reiter im laufenden
  Programm. Papier bleibt die Startvorgabe; keine Speicherung außerhalb des portablen Pakets.
- Der Lückenbereich bleibt pro Rechnung unabhängig ein-/ausklappbar.
- Alphahinweis und nicht zertifizierte Spezifikationstreue stehen kleiner am unteren Rand.
- Validieren ist als deaktivierter Button sichtbar. Noch kein Regelvalidator.

## Starten

Java 17 oder neuer mit Desktop-Unterstützung. Nach dem Entpacken im Projektordner:

~~~sh
java -jar dist/xrechnung-viewer.jar
~~~

Beispiele direkt öffnen:

~~~sh
java -jar dist/xrechnung-viewer.jar fixtures/kosit-01.01a-INVOICE_ubl.xml
java -jar dist/xrechnung-viewer.jar fixtures/demo-paper-with-gap.xml
java -jar dist/xrechnung-viewer.jar datei1.xml datei2.xml
~~~

**Den vollständigen Ordner dist einschließlich lib und licenses zusammenhalten.**
Die einzelne JAR reicht ab Version 0.2 nicht mehr.
Die Demo mit Lücke ist absichtlich um ein unbekanntes Zusatzfeld ergänzt und keine
als gültig freigegebene Rechnung.

Ohne grafischen Desktop:

~~~sh
java -jar dist/xrechnung-viewer.jar --invoice fixtures/kosit-01.01a-INVOICE_ubl.xml
java -jar dist/xrechnung-viewer.jar --inspect fixtures/kosit-01.01a-INVOICE_ubl.xml
~~~

--invoice zeigt Zuordnungsstatus und konkrete Lücken; --inspect nur technische
Metadaten. Exit-Code 0 ist bei diesen Diagnosebefehlen kein Gültigkeitsnachweis.

## Darstellungslücken

- Unten rechts bleibt eine Gesamtzahl der festgestellten Lücken sichtbar.
- Rechts daneben liegt der ein- und ausklappbare Detailbereich.
- Bei einer neuen Rechnung mit Lücken wird er standardmäßig geöffnet, ohne Lücken geschlossen.
- Manuelles Zuklappen ändert weder die Zahl noch die gespeicherten Werte.
- Jede Lücke zeigt Grund, Herkunft und vollständigen kopierbaren Quellwert.
- Gezählt werden nicht nachweisbar zugeordnete Werte/Attribute, unklare leere
  Elemente und Transformationsdiagnosen; keine Quote und kein Konformitätsprozentsatz.
- Bekannt bedeutungslose Leerwerte werden nicht gezählt, z. B. eine leere
  Rechnungsbemerkung oder der leere CII-Liefercontainer im offiziellen Beispiel.
- Unbekannte leere Elemente und Attribute werden nicht pauschal als bedeutungslos
  angenommen. Auch ihre Anwesenheit kann in einer Erweiterung eine Bedeutung haben.
- Eindeutig vertretene Kontextangaben wie VAT im zugeordneten Steuerkontext,
  eine passende Betragswährung oder der Nachlass-/Zuschlagsindikator einer
  tatsächlich zugeordneten UBL-Gruppe werden berücksichtigt.

**0 Lücken bedeutet nicht 100 % Konformität.** Die Prüfung ist konservative
Zuordnungsanalyse, keine XSD-/Schematron-Validierung und kein Beweis, dass eine
semantisch falsche Zuordnung ausgeschlossen ist.

## XRechnung 3.0.1: was „alle Felder“ hier bedeutet

Verwendet wird die offizielle KoSIT-Visualisierung für XRechnung 3.0.1,
Release 2023-11-15. Die drei originalen Bindungen für UBL Invoice, UBL CreditNote
und CII überführen XML in das offizielle semantische Zwischenmodell.

Dessen vollständiger Katalog umfasst **167 eindeutige Business Terms und
41 Business Groups**, einschließlich der dort definierten Erweiterungen.
Alle sind registriert und durch die native Detaildarstellung abgedeckt.
Kennungsschemata, Schemaversion, MIME-Typ und Dateiname bleiben ebenfalls sichtbar.
Wiederholte Gruppen und Felder werden einzeln erhalten. Lange Werte werden
nicht abgeschnitten; sehr große Werte erhalten einen eigenen Scrollbereich.

Die Bezeichnungen stammen aus KoSITs deutscher Sprachdatei. Fehlende
Gruppenbezeichnungen sowie BT-160/161 sind anhand der Modelldokumentation ergänzt.

Die Nachweise sind getrennt:
- Alle 167 BT und 41 BG: synthetische Verträge für die native Darstellung.
- 129 von 167 BT: in sechs echten KoSIT-Quelldateien tatsächlich transformiert.
- Weitere gezielte synthetische Quelltests prüfen unter anderem getrennte
  Steuerwährungen, Zusatzattribute und unbekannte Erweiterungen.
- Noch keine vollständige, unabhängig geprüfte Ende-zu-Ende-Abdeckung sämtlicher
  Felder, Kardinalitäten und Kombinationen in jeder Syntax.

Siehe docs/FIELD-COVERAGE-3.0.1.csv und docs/FIXTURE-COVERAGE-0.2.csv.
Statische Erwähnung einer Kennung im XSLT ist dort ausdrücklich kein Ausführungsnachweis.
Die Profilkennung in der XML nennt häufig nur xrechnung_3.0; daraus wird nicht
automatisch die genaue Patchversion 3.0.1 abgeleitet. 3.0.1 ist das gewählte Zielprofil.

## Bauen und testen

Vollständiges JDK 17+, empfohlen JDK 21. Alle für diesen Stand benötigten
Java-Bibliotheken und KoSIT-Ressourcen liegen bei. Kein Maven/Gradle und kein
Netzwerkzugriff beim Build nötig.

macOS / Linux:

~~~sh
sh build.sh
~~~

Windows PowerShell:

~~~powershell
./build.ps1
~~~

**92 Testfälle**: 19 Original-/XML-Verträge, 6 Diagnose-UI-Verträge, 2 feste
Originaldatei-Regressionen, 22 fachliche Transformations-/Zuordnungsverträge,
9 bestehende Rechnungs-UI-Verträge, 11 Formatierungsverträge, 9 Dokument-/Drop-Verträge
und 2 Kompakt-Datenverträge sowie 3 Text-/Hinweisverträge, 2 Interaktions-/Messreinheitsverträge und
2 Verträge für asynchrone Verarbeitung und Animation-Cleanup sowie 5 Recovery-Verträge. Auch lange Texte, alle Katalogfelder/-gruppen,
vollständige eingebettete Daten, Leerwerte und Klappverhalten werden geprüft.
Die echten Desktopfenster wurden hier noch nicht auf Windows/macOS getestet.

Optional den Auditbericht neu erzeugen:

~~~sh
java -cp 'build/classes:build/test-classes:vendor/lib/*' de.xrechnung.viewer.CoverageAudit
~~~

Windows-Classpath-Trenner: Semikolon. Die alten Kern-Mutationstests sind mit
python3 mutation-smoke.py verfügbar; sie betreffen ausschließlich den unveränderten
Original-/XML-Kern und ersetzen keine Mutationstest-Abdeckung der neuen Fachlogik.

## Portable App-Pakete

Auf dem jeweiligen Zielbetriebssystem:

~~~sh
sh package.sh
~~~

Unter Windows alternativ ./package.ps1. Ausgabe: build/native.
Windows: Startprogramm XRechnungViewer.exe plus app/runtime-Ordner.
macOS: XRechnungViewer.app. Linux: Startprogramm mit gebündelter Laufzeit.

Gesamtes Paket weitergeben, nicht nur die EXE. Die Architektur folgt dem JDK.
Windows x64 ist das erste Windows-Ziel; Windows ARM ist nicht abgenommen.
Diese nativen Pakete, die PowerShell-Skripte und der vorbereitete Drei-Plattform-
CI-Workflow wurden in dieser Cloud noch nicht ausgeführt. Keine Codesignierung
oder Notarisierung. Vorhandene native Ausgabeordner werden nicht überschrieben.

## Schutz des Originals und Grenzen

Das Original bleibt ein unveränderter Byte-Snapshot mit SHA-256. Originalkopien
werden nicht aus dem Modell zurückserialisiert und überschreiben keine vorhandenen
Dateien. Nach erfolgreichem Schreiben erfolgt ein Bytevergleich. Ein I/O-Fehler
kann eine unvollständige neue Zieldatei hinterlassen; er wird als Fehler gemeldet.

XML-Parser und die offizielle Transformation können die Schreibweise normalisieren,
z. B. Zeichenreferenzen und CII-Datumsangaben. Die menschenlesbaren Ansichten zeigen
ISO-Daten als deutsches Datum und Dezimalzahlen mit Komma. Bekannte Währungen erhalten
mindestens ihre im JDK hinterlegten ISO-4217-Nachkommastellen. Weitere vorhandene
Stellen bleiben erhalten, auch bei Einzelpreisen. Unbekannte oder fehlende Währungen
werden nicht als EUR interpretiert. Unformatierte Modellwerte bleiben in der
Kompaktansicht zugänglich. Keine Summenberechnung,
kein Ersetzen übermittelter Beträge und keine Rundung. Quelltext und Originalbytes
bleiben verfügbar. Unterpositionen liefern keine Ersatzwerte für fehlende Elternwerte.

Eingebettete Anlagen sind als vollständige Datenwerte samt Metadaten zugänglich,
werden aber noch nicht extrahiert oder geöffnet. Externe XML-Ressourcen und
kundenseitige Stylesheets werden nicht ausgeführt. KoSIT-Includes sind auf fest
eingebettete Ressourcen beschränkt.

Grenzen: 8 MiB Eingabe, 128 Elementebenen, 50.000 Inventareinträge. Überschreitung
wird abgelehnt; es wird keine gekürzte Rechnung eingelesen. Diese Grenzen sind
keine harte Speicherverbrauchsgarantie. Desktop-Schriftabdeckung, Skalierung und
Bedienung sind noch auf den Zielsystemen abzunehmen.

Noch kein KoSIT-Regelvalidator, keine bestätigte DIN-5008-Konformität und keine
Archivierungsfunktion. PDF-Vorschau und -Export sind seit Alpha 0.8 vorhanden.

## Übergabe an Codex

Projektordner lokal öffnen, AGENTS.md und docs/HANDOFF.md lesen, Build ausführen.
Die Fortsetzung braucht keinen Chat-Verlauf. docs/MILESTONES.md benennt die
noch offenen Nachweise. docs/VERIFICATION.md beschreibt die tatsächlich
ausgeführten Prüfungen. Quellen, Abhängigkeiten, Ressourcen und gebaute JAR liegen bei.

Lizenzen: LICENSE, THIRD-PARTY-NOTICES.md und vendor/licenses.

## Mehrere Dateien und Drag & Drop

Strg/⌘+O öffnet den Dateidialog mit Mehrfachauswahl. Strg/⌘+W schließt den aktiven
Reiter; dessen Kreuz kann ebenso verwendet werden. Originalkopie speichern
bezieht sich immer auf den gerade ausgewählten Reiter und dessen Byte-Snapshot.

Das Fenster akzeptiert lokale Dateilisten des Betriebssystems. Es werden nur
reguläre Dateien mit Endung .xml (ohne Beachtung der Groß-/Kleinschreibung) geladen.
Ordner und andere Formate ergeben eine konkrete Meldung. In einem gemischten
Stapel bleiben erfolgreich geladene Dateien erhalten, auch wenn eine andere
Datei fehlschlägt. Doppelt geöffnete Dateien ergeben unabhängige Reiter/Snapshots.

Datei-Drops werden als COPY angenommen; MOVE-only-Drops werden abgewiesen.
Die App verschiebt oder löscht keine Eingabedatei. Während eines laufenden
Lade-/Kopiervorgangs werden keine neuen Datei-Drops angenommen.
Textauswahl und normales Kopieren bleiben trotz der Drop-Unterstützung erhalten.

In der Cloud wurden Transferobjekte, Zustände und Datenzuordnung getestet.
Echte Datei-Drag-Gesten, native Dateidialoge und die neue Oberfläche müssen
noch auf Windows/macOS/Linux interaktiv abgenommen werden.

## Optionaler Leerlauf-Trace

Nach sh build.sh auf dem lokalen Desktop:

~~~sh
java -cp 'build/classes:build/test-classes:vendor/lib/*' de.xrechnung.viewer.IdleProbe --window
~~~

Öffnet zwei echte Dateikopien, wechselt 30-mal per Maus zwischen ihren Reitern
und protokolliert danach CPU-Zeit des UI-Threads und Zeichen-/Layoutanforderungen.
Ohne --window läuft ein headless Swing-Ereignis-/Renderdurchlauf. Dieser ersetzt
keine macOS-/Aqua-Abnahme. Windows-Classpath-Trenner: Semikolon.

## Fehlerbehandlung und weitere Roadmap

Beschädigtes XML wird abgelehnt und nicht automatisch repariert. Eine Fehlermeldung
pro Datei ist beabsichtigtes Verhalten; andere Dateien und vorhandene Reiter bleiben
bei regulären Importfehlern verwendbar. Wohlgeformte, aber unvollständige/fachlich
ungültige Rechnungen können eine Best-Effort-Ansicht oder Transformationsdiagnose
liefern. Dies ist weiterhin keine Schema-/Geschäftsregelvalidierung.

PDF-/Scan-Import und die Erzeugung eines neuen XML sind ausdrücklich Version 2
zugeordnet; die Arbeitspakete stehen in docs/MILESTONES.md. Text/OCR ist ein prüfbarer Entwurf mit Fundstellen
und Unsicherheiten; fehlende Rechnungsangaben werden nicht erfunden. Originale
bleiben unverändert. Noch keine Implementierung eines solchen Imports.


## Rechtes Hinweispanel ausprobieren

```sh
sh build.sh
java -jar dist/xrechnung-viewer.jar fixtures/demo-darstellungshinweise.xml
```

Das Buildskript kompiliert Java-17-kompatible Quellen, kopiert Ressourcen, setzt
Classpath und Main-Class, führt die Tests aus und erstellt die Distribution.
Zum Starten den vollständigen `dist`-Ordner mit Bibliotheken behalten.

Die synthetische Demo zeigt sieben offene Zuordnungen unterschiedlicher Art.
Sie ist absichtlich kein schema-konformes Rechnungsbeispiel. Das Panel unterscheidet
anhand der vorhandenen Diagnose unbekannte Inhalte/Attribute, leere Elemente und
Modell-/Transformationshinweise. Die Kurzquelle dient nur der Orientierung;
unter „Quelle“ bleibt der vollständige Namespace-qualifizierte Pfad kopierbar.
Unter „Inhalt“ stehen Grund und unveränderter vollständiger Quellwert.
Die Anzahl der Hinweise ist keine Fehlerquote und kein Validierungsergebnis.


Die PDF-Vorschau zeigt „Zurück · Seite [Nummer] von [Gesamtzahl] · Vor“.
Seitenzahl mit Enter übernehmen; Alt+Pfeil links/rechts blättert. Beim Rendern
bleibt das bisherige Seitenbild sichtbar. Neben dem Disclaimer steht das Produktziel
in einem Satz, ebenfalls auf jeder exportierten PDF-Seite.
