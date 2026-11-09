# CII-Preisbasismengen: Untersuchung vom 09.11.2026

Aktueller Versionsplan: [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md).
Version 1.0 = XRechnung/EN 16931-1 → DIN-5008-Papier-/PDF-Darstellung mit
nachvollziehbaren Restlücken; unstrukturierter PDF-/Bildimport und XML-Erzeugung
gehören zu Version 2. Die nachfolgenden Befunde beschreiben den Implementierungsstand.

## Reproduktion und Ursache

Die neuen Rechnora-Beispiele wurden unverändert über die bestehende CLI geladen:

| Datei unter fixtures/Rechnora | Vorher | Nachher |
| --- | ---: | ---: |
| rechnung-gemischte-steuersaetze.xml (UBL) | 0 Lücken | 0 Lücken |
| rechnung-gemischte-steuersaetze2.xml (CII) | 6 Lücken | 0 Lücken |
| rechnung-reverse-charge.xml (UBL) | 0 Lücken | 0 Lücken |

Die sechs CII-Lücken betreffen drei Netto-Preisbasismengen und deren unitCode.
In der KoSIT-Visualisierung 2023-11-15 erzeugt das BG-29-Template BT-149 mit einem
statischen Quellenverweis auf ChargeAmount/ActualAmount statt BasisQuantity.
BT-150 wird ausschließlich aus GrossPriceProductTradePrice ausgewählt, obwohl
die Beispiele die Einheit an NetPriceProductTradePrice/BasisQuantity enthalten.
Die Menge war deshalb bereits sichtbar, aber ohne nachgewiesene Herkunft;
die Einheit der Preisbasis fehlte tatsächlich im semantischen Modell.

## Begrenzte Korrektur

`src/main/resources/viewer/cii-price-base.xsl` importiert die unveränderte offizielle
Transformation. Nur BG-29 mit vorhandener Netto-BasisQuantity wird überschrieben.
Menge und Einheit werden aus genau diesem Element übernommen, mit dynamischen
Quellenverweisen. Keine Berechnung, Rundung, Einheitenumrechnung oder Ersatzwerte.
Nicht dargestellte Brutto-Basismengen bleiben als Lücken sichtbar, insbesondere
bei abweichenden Mengen/Einheiten. Das ist keine Validierung solcher Konflikte.
Die Resolver-Freigabe wurde nur um diese konkrete lokale Ressource erweitert.

Red-Nachweis: `price-base-red.log`, zwei neue fehlschlagende Verträge.
Green-Nachweis: `price-base-green.log`, vollständiger Build mit 94 Verträgen.
Geprüft werden die drei Beispiele, Preisbasis 10.000/C62, getrennte Positionen,
alternative Präfixe für die Preisbasis, unbekannte Attribute, fehlende Basisdaten,
nicht verdeckte Brutto-Basisdaten sowie unveränderte Originalbytes.
Papier-Detaildarstellung wird auf vorhandene Modellschlüssel geprüft, die
Kompaktdarstellung auf das zusätzliche Einheitenfeld. Das beweist weder ein
verständliches Hauptlayout noch die Vollständigkeit des gesamten Rechnungsstandards.

## Weitere Befunde und nächste Prüfung

- Alternative ram-Präfixe erzeugen in diesem CII-Beispiel drei zusätzliche
  Herkunftslücken bei Zahlungsbedingungen/Fälligkeit. Preisbasisfelder sind mit
  dem Adapter präfixunabhängig. Eine allgemeine Behebung steht noch aus.
- Die Papier-Haupttabelle zeigt einen Einzelpreis, aber dessen Basismenge und
  Einheit erst in den aufklappbaren Details. Bei Preisen pro 10/100 Einheiten
  kann das missverständlich sein. Vor PDF-Export fachlich prüfen und lösen.
- Steuerkategorien und Befreiungs-/Reverse-Charge-Begründungen sind ebenfalls
  gezielt auf ihre Sichtbarkeit in der Hauptansicht zu prüfen.
- 0 Zuordnungslücken bedeutet weder vollständige Hauptansicht noch gültige Rechnung.
- Keine gestalterische Änderung der Papieransicht und kein neuer PDF-Export.

## Normen: Arbeitsgrundlage, keine abgeschlossene Normprüfung

DIN 5008 behandelt Schreib- und Gestaltungsregeln; EN 16931-1 das semantische
Datenmodell der Kernelemente einer elektronischen Rechnung. Die Ziele ergänzen
sich. Zwei alternative Rechnungsdatenmodelle daraus abzuleiten wäre irreführend.
Eine DIN-orientierte Leseansicht kann Rechnungsdaten aus XRechnung darstellen;
Detailumfang und Fortsetzungsseiten sind eine Darstellungsentscheidung.
Ein einheitliches Layout allein löst spätere OCR-/Zuordnungsprobleme nicht.
Exakte DIN-Konformität wird weiterhin erst anhand einer autorisierten Normfassung
und festgelegter Abnahmekriterien beurteilt.

Primärquellen:
- DIN zu DIN 5008: https://www.din.de/de/mitwirken/normenausschuesse/nia/einfach-richtig-schreiben-707192
- DIN EN 16931-1: https://www.dinmedia.de/de/norm/din-en-16931-1/327729047
- Lokale, versionierte KoSIT-Bindung: `src/main/resources/kosit-3.0.1/xsl/cii-xr.xsl`,
  Templates BG-29, BT-149 und BT-150. Herkunft/Lizenz siehe vorhandene Projektdokumentation.
