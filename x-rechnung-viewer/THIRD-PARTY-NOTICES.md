# Fremde Komponenten · Alpha 0.3

## KoSIT

Originale XSLTs, semantisches Schema und deutsche Sprachdatei:
XRechnung Visualization 3.0.1, Release 2023-11-15, unverändert eingebettet.
https://github.com/itplr-kosit/xrechnung-visualization/releases/tag/v2023-11-15
https://github.com/itplr-kosit/xrechnung-visualization/releases/download/v2023-11-15/xrechnung-3.0.1-xrechnung-visualization-2023-11-15.zip

Copyright Koordinierungsstelle für IT-Standards / ursprüngliche Mitwirkende.
Apache-2.0, siehe vendor/licenses/KoSIT-Apache-2.0.txt.
Originale Copyright-/Autorenhinweise der Quelldateien bleiben erhalten.

Die Beispieldateien stammen aus dieser Visualisierungsdistribution beziehungsweise
der KoSIT-Testsuite v2026-08-31; genaue Herkunft siehe fixtures/README.md.
Die Demo mit Darstellungslücke ist als abgeleitetes, verändertes Beispiel gekennzeichnet.

## Saxon HE 12.5

Copyright Saxonica und jeweilige Mitwirkende. Mozilla Public License 2.0.
Lizenz: vendor/licenses/Saxon-MPL-2.0.txt.
Unveränderte Binärdistribution:
https://repo.maven.apache.org/maven2/net/sf/saxon/Saxon-HE/12.5/Saxon-HE-12.5.jar
Korrespondierender Quellcode:
https://repo.maven.apache.org/maven2/net/sf/saxon/Saxon-HE/12.5/Saxon-HE-12.5-sources.jar
Projekt: https://github.com/Saxonica/Saxon-HE

## XML Resolver 5.2.2, einschließlich data-Klassifikator

Copyright Norman Walsh und Mitwirkende. Apache-2.0.
Lizenz: vendor/licenses/XMLResolver-Apache-2.0.txt.
https://repo.maven.apache.org/maven2/org/xmlresolver/xmlresolver/5.2.2/
https://github.com/xmlresolver/xmlresolver
W3C-Lizenzhinweise zu eingebetteten Katalogdaten bleiben im data-JAR erhalten.

SHA-256 und Herkunft stehen zusätzlich in vendor/DEPENDENCIES.json.
Keine dieser Komponenten wurde modifiziert. Die App ist nicht von KoSIT zertifiziert.

## Laufzeit und weitere Komponenten

Die Java-Laufzeit ist nicht Bestandteil dieses Quellpakets.
jpackage nimmt die Laufzeit des verwendeten JDK auf; dessen Lizenzdateien müssen
bei der Weitergabe erhalten bleiben. Ebenso dist/licenses und dieser Hinweis.
FOP ist nicht enthalten; PDFBox ist seit Alpha 0.8 enthalten. Keine DIN-Normtexte oder Zertifizierungszeichen.


## Rechnora-Beispiele

`fixtures/Rechnora`: Copyright (c) 2026 Rechnora (Fiscal Infrastructure Labs),
CC BY 4.0. Namensnennung: Rechnora — https://rechnora.de.
Mitgelieferter Lizenzhinweis: `fixtures/Rechnora/LICENSE`.
Die lokalen Mappingtests verwenden diese Beispieldateien unverändert.


## Apache PDFBox 3.0.8 und eingebettete Liberation Sans 2.1.5

Unveränderte Standalone-JAR vom offiziellen Apache-Downloadserver; SHA-512 gegen
die dort veröffentlichte Prüfsumme geprüft, SHA-256 und URL in vendor/DEPENDENCIES.json.
Apache-2.0 und enthaltene Drittanbieterhinweise: vendor/licenses/PDFBox-3.0.8-LICENSE.txt,
PDFBox-3.0.8-NOTICE.txt sowie vollständige Release-Lizenz PDFBox-3.0.8-DISTRIBUTION-LICENSE.txt.
https://pdfbox.apache.org/download.html

PDF-Ausgabe bettet die unveränderte LiberationSans-Regular.ttf aus dieser JAR als
Untermenge ein. Schriftversion 2.1.5 laut Namensmetadaten; Copyright 2010 Google
Corporation und 2012 Red Hat, Inc. SIL Open Font License 1.1:
vendor/licenses/LiberationFonts-2.1.5-OFL.txt.
https://github.com/liberationfonts/liberation-fonts/tree/2.1.5
