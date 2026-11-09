# PDF-Vorschau und Export · Alpha 0.8

09.11.2026. Es gilt [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md).
Dies ist die erste implementierte PDF-Etappe, keine 1.0-Freigabe.

## Bedienung

`sh build.sh`, dann `java -jar dist/xrechnung-viewer.jar datei.xml`.
Die ausgewählte Rechnung über „PDF-Vorschau …“ anzeigen. Navigation:
„Zurück · Seite [Nummer] von [Gesamtzahl] · Vor“. Nummer direkt eingeben und
mit Enter bestätigen; Alt+Pfeil links/rechts blättert. Ungültige Nummern werden
nicht übernommen. Innerhalb der Seite bleibt der normale Scrollbereich erhalten.
Seitenwechsel und Zoom rendern im Hintergrund. Das bisherige Seitenbild bleibt
bis zum erfolgreichen Ersatz sichtbar; der Status kennzeichnet den Ladevorgang.
Währenddessen ist die Seitennavigation gesperrt, um widersprüchliche Eingaben
zu vermeiden. „PDF speichern …“ schreibt genau den angezeigten PDF-Stand.
Die Rechnung und ihr unverändertes Original werden zu Beginn des Vorgangs erfasst;
ein zwischenzeitlicher Reiterwechsel ändert die Vorschau nicht.

Headless: `java -jar dist/xrechnung-viewer.jar --pdf eingabe.xml neue-ausgabe.pdf`.
Bestehende Dateien/Symlinks werden mit CREATE_NEW abgelehnt. Ein Schreibfehler kann
eine neue unvollständige Zieldatei hinterlassen und wird ausdrücklich gemeldet.

## Aufbau und fachlicher Umfang

- A4-Hauptrechnung mit Parteien, Kopfdaten, Positionen, Summen, Steuerkategorien/
  -sätzen, Befreiungstext/-code und Zahlungsangaben. Tabellenköpfe werden bei
  Fortsetzung wiederholt; auch einzelne überlange Positionen laufen weiter.
- Preisbasis steht am Einzelpreis. Vorhandene Mengen/Einheiten werden angezeigt;
  keine fehlenden Werte oder Geldbeträge berechnen, rekonstruieren oder runden.
- Vollständige Detailseiten enthalten alle nicht leeren Modellfelder und ihre
  Metadaten in Gruppenreihenfolge, einschließlich wiederholter Gruppen. Leere
  Werte mit vorhandenen Metadaten bleiben sichtbar. Details können Hauptdaten wiederholen.
- Offene Zuordnungen folgen mit vollständigem Grund, Quellenpfad und Quellwert
  im Diagnoseanhang. Das ist keine Validierungsfehlerliste.
- Disclaimer, fehlende DIN-Abnahme und Originalbezug auf jeder Seite.
- Keine Anlagenausführung/-extraktion und keine XML-Einbettung; XML bleibt Original.

Die Swing-Papieransicht behält ihr Layout; nur Preisbasis- und Steueranzeigetexte
wurden fachlich ergänzt. Die PDF-Vorschau ist ein eigenes natives Fenster und
zeigt die tatsächlichen PDF-Seiten, keinen Screenshot des Swing-Rechnungsbereichs.

## Architektur und Grenzen

Direkte Java-/PDFBox-Ausgabe statt zusätzlicher FO-/FOP-Pipeline. Versionierte
Offline-Abhängigkeit 3.0.8 inklusive Lizenzen und Schrift; keine neuen Downloads
beim Build oder im Betrieb. Snapshot.bytes liefert defensive Kopien. Vorschau
öffnet den Snapshot seitenweise, hält nur das aktuelle Seitenbild vor und stoppt
weitere UI-Aktualisierungen nach Schließen des Fensters. Keine Polling-Timer.

float-Werte betreffen ausschließlich Seitengeometrie/Schriftmaße. Rechnungswerte
laufen nur durch die vorhandene wertgleiche InvoiceFormat-Anzeigeformatierung.
Schrift: eingebettete Liberation Sans. Ein nicht darstellbares Zeichen führt zu
einem verständlichen Fehler mit Unicode-Codepunkt statt stiller Ersetzung.
Komplexe Schriften und universelle Unicode-Abdeckung sind nicht abgenommen.
Limits: 500 Seiten, Textbudget 2 Millionen Java-Zeichen (einschließlich Layout-
Messungen), 32 MiB PDF und 36–160 dpi für interne Vorschauseiten. Überschreitungen
führen zum Abbruch ohne abgeschnittenen Ersatzexport.

Keine bestätigte DIN-5008-Konformität, kein XSD-/Geschäftsregelvalidator, keine
PDF/A-, ZUGFeRD-, Factur-X- oder Archivierungskonformität. Exakte DIN-Vorgaben aus
autorisierter Normfassung und native macOS-/Windows-/Linux-GUI-Abnahme stehen aus.
Semantische Richtigkeit und Quellabdeckung des Mappers sind weiterhin gesondert
zu prüfen; vorhandene Fehlzuordnungen werden durch den PDF-Export nicht geheilt.

## Prüfung und Übergabe

100 bestehende Verträge plus 3 Navigations- und 12 PDF-Verträge = 115. PdfTests prüfen unabhängig
bekannte Rechnungswerte/Präzision, Preisbasis, Reverse-Charge-Begründung, alle
167 Modellfelder mit Metadaten, Diagnoseherkunft und lange Literaltexte,
Umbrüche, überlange Einzelpositionen, wiederholte Tabellenköpfe, Textgrenzen,
Disclaimer/Seitenzahlen, Snapshot-Eigentum, bytegleichen Export und Nichtüberschreiben.
Die Snapshot-Vorschauseite wird im Test tatsächlich gerendert.
Ergänzung: [Positionskennungen und Einheiten](UNITS-AND-LINE-IDS.md).

`pdf-red.log` dokumentiert den anfänglichen API-Kompilierfehler (noch fehlende
Implementierung und unvollständiger manueller Test-Classpath), keinen fachlichen
Red-Nachweis. `pdf-pagination-red.log` reproduziert den visuell gefundenen
Übergangsseitenfehler mit dem verschärften Test gegen die frühere Implementierung
in einem isolierten Build-Ordner. `pdf-payment-red.log` sichert den ebenfalls
visuell gefundenen Zahlungszeilenumbruch vor dessen Korrektur ab.
`pdf-green.log` enthält den finalen Gesamtbuild.

Beispiele unter output/pdf: gemischte-steuersaetze.pdf, reverse-charge.pdf und
darstellungshinweise.pdf. Letzteres nutzt absichtlich nicht schema-konforme,
synthetische Erweiterungen. Alle Beispielseiten wurden mit Poppler gerendert
und visuell geprüft; Textauszüge und Programmprüfungen ergänzen die Sichtprüfung.
Build-/Vorschauartefakte liegen unter build/pdf-review-final, nicht im Produkt.

Nächste Etappe: genaue DIN-Anforderungen, fachliche Feldmatrix/Referenzfälle und
native Interaktion abnehmen. Der Import unstrukturierter Daten bleibt Version 2.

Datums-/Zeitzonenschutz: [DATE-TIME-SAFETY.md](DATE-TIME-SAFETY.md).


## Bedienungs- und Produktziel-Ergänzung

PdfPageNavigation ist eine separat headless prüfbare Swing-Komponente mit
Seitengrenzen, validierter Ganzzahleingabe, Ladezustand und Alt-Pfeil-Kürzeln.
Drei Verträge prüfen diese Zustände inklusive einseitiger PDFs. Die native
macOS-Interaktion bleibt abzunehmen; kein fließendes Blättern über Seitenränder
oder mehrseitiger Bildcache implementiert. Vorhandene In-Seiten-Scrollfunktion bleibt.

Der Disclaimer nennt jetzt zusätzlich das Produktziel in einem Satz, auch im
Willkommensbild, der Papieransicht, den Quelldaten, der PDF-Vorschau und auf jeder
PDF-Seite. Der Satz beschreibt das Ziel; er behauptet keine bereits erreichte
DIN-Konformität. Text-/Seitenrandtests prüfen seine Anwesenheit und Platzierung.
Red/Green: pdf-navigation-red.log / pdf-navigation-green.log. Der Red-Nachweis
betrifft den zunächst fehlenden Produktzielsatz; die drei Eingabeverträge ergänzen
die neue Navigationskomponente. Beispielseiten und Komponente headless visuell geprüft.
