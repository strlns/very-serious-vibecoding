# Datums-, Uhrzeit- und Zeitzonensicherheit

09.11.2026. Es gilt [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md).

## Fachlicher Rahmen

Die EN-16931-Datumsfelder, etwa BT-2 und BT-9, beschreiben Kalendertage ohne
Uhrzeit oder Zeitzone. Die dokumentierte UBL-Darstellung ist YYYY-MM-DD; bei CII
wird der kompakte Kalenderwert YYYYMMDD mit Formatcode 102 verwendet. Der Name
IssueDateTime in der CII-XML bedeutet nicht, dass der hier gebundene Business Term
einen beliebigen Zeitpunkt mit Offset vorsieht. Freitexte und Erweiterungen können
abweichende Zeitangaben enthalten; sie werden nicht durch Datumsvermutungen verändert.

Primärquelle: Peppol BIS Billing, Abschnitt 7.2.7 (Date), basierend auf EN 16931:
https://docs.peppol.eu/poacc/billing/3.0/bis/#_date
UBL BT-2: https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/cbc-IssueDate/
CII-Bindung: versionierte lokale KoSIT-Transformation cii-xr.xsl, BT-2 und BT-9,
DateTimeString mit @format='102'. Keine vollständige fachliche Validierung behauptet.

## Verbindliche Anzeige-Regel

- Nur gültige reine Kalendertage werden nach der FORMAT-Locale dargestellt.
  Die System-Zeitzone spielt dabei keine Rolle. Unbekannte Locale: ISO-Datum.
- Uhrzeit, Offset, Z-Suffix oder andere Zusätze werden nicht abgeschnitten,
  ergänzt, interpretiert oder auf die System-Zeitzone umgerechnet.
- Werte mit Uhrzeit ohne Zeitzone bleiben ohne Zeitzone: keine Zone erfinden.
- Für solche abweichenden Inhalte in einem Datumsfeld: vollständige Quellangabe
  in der Ansicht erhalten und einen sichtbaren Datumsformat-Hinweis ergänzen.
  Auch das PDF enthält Quellwert und Diagnose, nicht einen vermeintlich konformen Ersatz.
- Nicht unterstützte CII-Formatcodes bleiben als nicht zugeordnete Quelldaten
  sichtbar; keine automatische Interpretation als UTC oder Ortszeit.
- Freitexte wie BT-20 werden weiterhin unverändert ausgegeben.
- Keine zusätzliche lokale Zeitdarstellung implementiert. Falls diese künftig
  beauftragt wird: Quellwert samt verfügbarer Zone/Offset bleibt primär sichtbar;
  zusätzliche Umrechnung nur ausdrücklich als solche mit Zielzone/Offset kennzeichnen.
  Fehlende oder mehrdeutige Quellzonen dürfen nicht geraten werden.

## Gefundener Fehler und Korrektur

Die alte KoSIT-Vorlage `date` verwendet nur die ersten acht Ziffern eines
normalisierten Eingabewerts. So konnte z. B. 2026-11-09T00:30:00+14:00 zu
2026-11-09 werden. Der ursprüngliche Wert blieb zwar in den Quelldaten/Lücken,
die Rechnungsansicht zeigte aber nur den abgeschnittenen Kalendertag.

Lokale Adapter für UBL Invoice/CreditNote und CII überschreiben ausschließlich
diese Vorlage: exakte Kalenderformate werden umgesetzt; alle anderen Werte
bleiben vollständig erhalten. Pinned KoSIT-Dateien sind unverändert.
InvoiceFormat prüft reine Kalenderdaten ausdrücklich, bevor es Locale-Formate
anwendet. KositMapper ergänzt für nicht reine/ungültige Datumsmodellwerte einen
Format-Hinweis, den das rechte Panel als „Datum · Format prüfen“ kategorisiert.
Das ersetzt keinen Regelvalidator und bedeutet keine Unterstützung dieser Werte
als konforme XRechnung-Datumsangaben.

## Nachweise

Neue Verträge: Format unter mehreren System-Zeitzonen, vollständige UBL-Zeit-/
Offsetwerte (inkl. CreditNote), CII mit Zusatzwerten/anderen Formatcodes sowie
PDF-Erhalt und Diagnose über System-Zeitzonen hinweg. Insgesamt 112 Verträge.
`date-safety-red.log`: die beiden Abschneidungen vor der Implementierung.
`date-safety-green.log`: finaler vollständiger Build. Reine Locale-Formatierung
blieb schon vorher für Zeitangaben konservativ; der neue Formattest sichert dieses
bestehende Verhalten ab. Keine Geld-Arithmetik und keine geänderten XML-Fixtures.
