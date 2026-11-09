# Positionskennungen, Einheiten und Preisbasis

09.11.2026. Es gilt [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md).

## Positionskennung BT-126

Die Wörter „Zeitschrift [...]“ und „Porto + Versandkosten“ stehen schon in den
KoSIT-basierten Quelldateien als cac:InvoiceLine/cbc:ID. Das Mapping nach BT-126
ist damit richtig. Dieser Datentyp ist Identifier; eine fortlaufende Nummer wird
nicht vom Viewer erfunden. Das Beispiel ist ungewöhnlich, aber kein Nachweis eines
Mappingfehlers. Die Zelle war für solche Texte in der PDF zu schmal.

Die Überschrift lautet „Pos.-ID“. Die PDF-Spalte wird je nach vorhandenen
Kennungen zwischen 42 und 100 Punkt breit; sehr lange Kennungen werden innerhalb
ihrer eigenen Spalte umgebrochen. Die Beschreibung bleibt eine getrennte Spalte.
Keine leeren Ersatzfelder und keine erfundenen Positionsnummern. Die Swing-
Papieransicht behält ihre bereits breitere Kennungsspalte.

## Einheitencodes

H87 ist UNECE Recommendation 20: „piece“, hier als „Stück“ angezeigt.
XPP stammt aus Recommendation 21 mit X-Präfix: „Piece“, ein loses/unverpacktes
Stück; Anzeige „Stück (XPP)“ bewahrt die Unterscheidung zum reinen Zählcode H87.
Es sind reale Standardcodes, keine erfundenen Einheiten. Die Quelldateien werden
nicht umgeschrieben. Andere Codes bleiben vorerst unverändert sichtbar;
keine Einheitenumrechnung und keine Vermutung bei unbekanntem Code.
Die Anzeigenamen sind eigene deutsche Beschriftungen eines kleinen, expliziten
Ausschnitts der unten genannten Codeliste, kein vollständiger Einheitenkatalog.
Die Originalcodes stehen weiterhin im Modell, in der Kompaktansicht und in den
vollständigen Papier-/PDF-Details.

## „pro“ beim Einzelpreis

BT-149 ist die Anzahl von Einheiten, für die der Preis gilt. Bei ausdrücklich
gelieferter Basis genau eins und Stückcode H87/XPP lautet die Kurzform „pro Stück“
bzw. „pro Stück (XPP)“. Auch 1.00 und +1 werden dabei als genau eins erkannt.
Andere Mengen, fehlende oder unbekannte Einheiten bleiben ausdrücklich benannt,
z. B. „pro 100 Stück“ und „pro 1 QZZ“. Keine Umrechnung oder ergänzte Ersatzbasis.
Die unveränderte Basismenge steht weiterhin in den vollständigen Details.
„pro“ bleibt eine erklärende Darstellungswahl, keine nachgewiesene DIN-Pflicht.

## Ausrichtung und Datumsanzeige

Beträge und ihre PDF-Spaltenüberschriften stehen rechtsbündig an derselben Kante.
Das ist eine Gestaltungsentscheidung, keine behauptete DIN-Vorgabe.
Strukturierte Datumsfelder folgen der FORMAT-Locale des Rechners: Deutsch
DD.MM.YYYY, andere vom JDK unterstützte Sprachen im lokalisierten MEDIUM-Format,
bei unbekannter/fehlender Sprache ISO YYYY-MM-DD. Fehlerhafte Werte bleiben
unverändert. Keine Länderadresse wird als Dokument-Locale interpretiert.
Das verwendete EN-16931-Kernmodell hat keine eigene Anzeige-Locale; XML-/Syntax-
Datumswerte bleiben von der Anzeigeformatierung unberührt.

Das markierte Datum 2026-07-31 steht innerhalb von BT-20 (Zahlungsbedingungen),
einem Textfeld. Es wird als Bestandteil dieses gelieferten Textes unverändert
angezeigt. Keine automatische Datumssuche/-ersetzung in Freitext; das strukturierte
Fälligkeitsdatum BT-9 wird separat formatiert. Primärquelle zu BT-20:
https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/cac-PaymentTerms/cbc-Note/

## Quellen und Prüfung

Primärquellen, geprüft 09.11.2026 (Peppol BIS Billing, May 2026):
- BT-126, Typ Identifier: https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/cac-InvoiceLine/cbc-ID/
- BT-149, Preisbasismenge: https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/cac-InvoiceLine/cac-Price/cbc-BaseQuantity/
- UNECE Rec 20 Revision 11e einschließlich Rec 21: https://docs.peppol.eu/poacc/billing/3.0/codelist/UNECERec20/

Ein zusätzlicher PDF-Vertrag prüft lange Originalkennungen ohne erfundene Nummern.
Bestehende Wertverträge sind um lesbares H87, unveränderten Originalcode in den
Details und unverändert angezeigten unbekannten Code QZZ ergänzt.
Red/Green: units-line-id-red.log / units-line-id-green.log.


Ergänzende Regressionen: pdf-comments-red.log, pdf-comments-format-red.log und
pdf-comments-green.log. Der tatsächliche Inhalt der ID-Spalte wird über einen
PDF-Textbereich geprüft; weitere Fälle sichern Preisbasis und Locale-Wechsel
sowie unveränderten Zahlungsbedingungstext. 108 Verträge insgesamt.
