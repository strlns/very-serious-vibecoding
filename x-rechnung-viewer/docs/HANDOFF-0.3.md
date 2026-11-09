# Codex-Übergabe · Alpha 0.3

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

## Neu in 0.3

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
- InvoiceWorkspace: Lückeninspektor pro Dokument, Rechnungs-/Diagnosereiter,
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

80 Tests grün; siehe docs/build-0.3.log und docs/VERIFICATION.md.
Der vollständige 3.0.1-Katalog bleibt 167 BT + 41 BG.
Quellabdeckung weiterhin 129/167 BT in sechs realen KoSIT-Dateien, ergänzt um
gezielte synthetische Quelltests. Feldmatrix aus 0.2 bleibt gültig.
80 Tests sind keine Zertifizierung; 0 Darstellungslücken bleibt kein Validierungsstatus.

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
