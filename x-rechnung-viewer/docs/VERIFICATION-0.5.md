# Nachweise · Alpha 0.5 · 08.11.2026

Historischer Nachweis zum angegebenen Alpha-Stand. Für die weitere Entwicklung
gilt [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md): Papier-/PDF-Ausgabe nach
DIN 5008 aus XRechnung/EN 16931-1 für Version 1.0; PDF-/Bildimport/OCR für Version 2.

Cloud Linux x64, OpenJDK 17.0.20, Java-17-Ziel. Kein interaktiver Desktop.

## Ergebnis: 83 Testfälle

19 Original/XML + 6 Diagnose-UI + 2 eingefrorene Originaldateien +
22 semantische Zuordnungsverträge + 9 bestehende Rechnungs-UI-Verträge +
11 Formatierungsverträge + 9 Dokument-/Drop-Verträge +
2 Kompakt-Datenverträge + 3 Text-/Hinweisverträge. Vollständige Ausgabe: build-0.5.log.

Die 11 Formatfälle enthalten zusätzlich 200 deterministische numerische
Roundtrips: Der dargestellte Betrag wird zurück als BigDecimal gelesen und
muss numerisch exakt gleich sein. Keine Rundung oder Float/Double-Arithmetik.
Zusätzlich negative, ganze, sehr große und hochpräzise Beträge, EUR/JPY/KWD,
unbekannte/fehlende Codes, ungültige Werte und die getrennte Steuerwährung.
IDs mit führenden Nullen werden nicht zu Zahlen umgedeutet.

Die tatsächliche Nutzerreferenz ist bytegleich mit dem bereits eingefrorenen
UBL-Beispiel. Geprüft wird 336.9 im Modell, 336,90 EUR in beiden Ansichten,
unveränderter Modellwert und unveränderter Originalhash.

## Red/Green und Regressionen

format-0.3-red.log: 8/11 Fälle schlugen gegen den leeren Formatter fehl;
reine Erhaltungseigenschaften konnten schon am Stub bestehen.
documents-0.3-red.log: 7/8 Fälle schlugen gegen die leeren Dokument-/Drop-APIs fehl.
drop-copy-0.3-red.log: MOVE-only wurde von der zunächst offenen Policy akzeptiert;
der Test wurde zuerst ausgeführt, anschließend auf COPY-only korrigiert.
Die zusätzlichen Kompakt-Datentests sind ergänzende Regressionen, kein erfundener
nachträglicher Red-Nachweis.

Dokumentfälle prüfen Reihenfolge, Teilfehler, Ablehnung von Ordnern/Fremdformaten,
Zuordnung des Original-Snapshots zum aktiven Reiter, Schließen aller Reiter,
globalen Modus für bestehende/neue Reiter, vollständige Datei-Drops, Busy-Sperre
und Erhaltung normalen Textkopierens mit einer privaten Test-Clipboard.

Die Kompakt-Verträge prüfen alle 167 BT plus Metadaten, unveränderliche/lesende
Tabellendaten, wiederholte Gruppen und vollständige lange HTML-artige Werte.
Keine Änderung am fachlichen Eingabemapping oder an den KoSIT-Ressourcen.

## Visuelle Prüfung und Grenzen

Papier-/Kompaktmodus mit sieben offenen Reitern (fünf lange Präsentationsaliase) wurden headless gerendert und
visuell geprüft. Adressen stehen nebeneinander, Abstände sind kleiner, Detailfelder
zweispaltig, EUR-Summen zweistellig und Warnung unten. Keine neuen Pixel-,
Papiermaß- oder DIN-Konformitätstests. Die zwei historischen Layoutregressionen
werden nur weiter ausgeführt.

Echte Drag-Gesten, Betriebssystem-/Swing-Dateidialoge, PowerShell, Windows-/Mac-GUI,
DPI/Schriftabdeckung und native App-Pakete wurden hier nicht ausgeführt.
Transferobjekte und Zustände sind geprüft, kein vollständiger OS-Integrationstest.

Fachlicher Nachweisstand unverändert: 167 BT / 41 BG im Katalog, 129/167 BT in
sechs realen KoSIT-Dateien ausgeführt. Noch kein Regelvalidator, PDF-Export,
DIN-5008-Zertifikat oder vollständiger Ende-zu-Ende-Konformitätsnachweis.

## Ergänzung 0.4

full-text-0.4-red.log dokumentiert die zunächst fehlende Implementierung;
full-text-0.4-green.log die beiden erfolgreichen Verträge. Geprüft sind exakter
Volltext trotz gekürzter Anzeige, HTML-artige Nutzdaten als reiner Text, unveränderte
kurze Texte, Zeilenumbruch-Vorschau und Unicode-Codepoint-Grenzen.
Keine neuen Geometrie-/Pixeltests. Kopfzeilen und Blätterpfeile wurden in den
beiden tatsächlichen Swing-Renderings preview-0.4-paper.png und
preview-0.4-table.png visuell geprüft. Die fünf zusätzlichen langen Pfadnamen
existieren nur im Renderhilfsprogramm; die zugehörigen Originalbytes bleiben gleich.
Echte macOS-/Windows-Fenster sind weiter lokal abzunehmen, insbesondere Aqua,
DPI-Skalierung und Tooltip-Verhalten. Keine neue Geld-Arithmetik.

## Ergänzung 0.5

83 Verträge erfolgreich, einschließlich der bisherigen vollständigen 167-BT-/41-BG-
Darstellung und Originalerhaltung. hints-0.5-red.log zeigt den zuerst ausgeführten
Fehler für einen unnötigen Hinweis; hints-0.5-green.log den erfolgreichen Vertrag
für bedingte Hinweise, begrenzte Unicode-Vorschau und reine HTML-artige Textdaten.
Die alte getToolTipText()-Quelle bleibt unverändert; die ereignisbezogene Anzeige
ist bedingt/begrenzt. Quellbaum/Lückenliste und Dateireiter registrieren keine
allgemeinen Daten-Popups mehr.

Tatsächliche Swing-Renderings: preview-0.5-paper.png, preview-0.5-table.png und
preview-0.5-details.png. Aktiven Reiter, Kreuz, lange Dateinamen, horizontalen
Überlauf, ausgerichtetes Datum/rechtsbündige Summen und aufgeklappte Detailzeilen
visuell geprüft. Keine neuen Pixel-/DIN-Tests. macOS/Windows, reale Maus-/Tooltip-
Interaktion und DPI bleiben lokal abzunehmen. Die macOS-Probleme aus 0.4 wurden
anhand der vom Nutzer gezeigten Screenshots analysiert; Aqua selbst läuft hier nicht.
Keine Änderung am Mapping, Original oder an Geld-Arithmetik.
