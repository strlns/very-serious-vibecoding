# Nachweise · Alpha 0.2 · 08.11.2026

Historischer Nachweis zum angegebenen Alpha-Stand. Für die weitere Entwicklung
gilt [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md): Papier-/PDF-Ausgabe nach
DIN 5008 aus XRechnung/EN 16931-1 für Version 1.0; PDF-/Bildimport/OCR für Version 2.

Linux-x64-Cloud ohne interaktiven Desktop. OpenJDK 17.0.20.
Build mit JDK-Compiler, Ziel Java 17; kein Maven-/Gradle-Build erforderlich.

## Ergebnis

58 Testfälle bestanden:
- 19 Kernverträge: Originalbytes, Kopien, XML-Sicherheit, Namespaces, Grenzen.
- 6 Verträge für die nachgeordnete technische Diagnose.
- 2 feste Originaldatei-Regressionen mit unabhängigen Knotenzählungen.
- 22 Verträge für Katalog, offizielle Transformationen und Zuordnungsanalyse.
- 9 Verträge für Papieransicht, sämtliche Katalogfelder und Gruppen, lange Werte,
  Klappverhalten, sichtbaren Zähler und Layout.

Siehe build-0.2.log. Ergänzend sind 100 deterministische Präfixvarianten in einem
alten Kernvertrag enthalten.

## TDD-Protokolle

semantic-red.log: gegen die leere semantische API schlugen 9 von 10 Fällen fehl;
der ablehnungsfreie Leerwertfall konnte am leeren Stub schon bestehen.
invoice-workspace-red.log: die neue Hauptansicht war noch nicht implementiert.
coverage-context-red.log: fehlender Steuerkontextnachweis und unklarer Leerwert.
coverage-split-red.log: aufgeteilter Text/CDATA und unbekanntes leeres Attribut.
currency-conflict-red.log: eine zu breite Währungszuordnung wurde erkannt.
subline-scope-red.log: ein Elternwert konnte aus einer Unterposition stammen.
contexts-empty-red.log: bedeutungsloser CII-Leercontainer und UBL-Gruppenindikator.
paper-width-red.log: die Papieransicht erforderte unerwünschtes horizontales Scrollen.
catalog-label-red.log: eine Gruppenübersetzung wurde gegen die offizielle
Dokumentation korrigiert (Fremdforderungen).

column-alignment-red.log ist trotz des historischen Namens kein roter Nachweis:
der erste enge Test reproduzierte das visuell beobachtete Problem nicht.
Der aktuelle Regressionstest prüft drei Papierbreiten; das Layout nutzt inzwischen
gemeinsame feste Spaltenanteile. Hier wird kein fehlgeschlagener Test erfunden.

Eine ursprüngliche Annahme zum Maximalbeispiel war falsch: es enthält nur eine
Hauptposition. Der Wiederholungstest verwendet seitdem das unabhängig geprüfte
offizielle Beispiel mit zwei Hauptpositionen. Ein künstlicher Steuerwährungsfall
wurde um den für die offizielle BG-22-Transformation benötigten Summencontainer
ergänzt. Das waren Korrekturen der Testeingaben, keine verdeckten Produktfixes.

## Abdeckung

Alle 167 BT und 41 BG des fixierten Modells sind als native Darstellung geprüft.
Die sechs realen KoSIT-Quellen führen 129/167 BT tatsächlich aus.
Die 38 in diesem Korpus nicht beobachteten BT sind in FIELD-COVERAGE-3.0.1.csv
explizit erkennbar. Weitere gezielte synthetische Quellfälle werden separat getestet.

Die großen offiziellen UBL-/Gutschrift-Beispiele enthalten weiterhin konkrete
Lücken. Die kleineren UBL-/CII-Beispiele sowie Anlagen- und Artikelattributbeispiele
erzeugen im aktuellen Audit keine Restlücken. Keine dieser Aussagen ist ein
Gültigkeitsnachweis; auch KoSITs Maximaldateien sind technische Testbeispiele.

Anlagenprüfung: zwei originale Base64-Werte mit 17.980 und 17.976 Zeichen,
SHA-256 unabhängig mit Python ermittelt, einschließlich Dateiname/MIME-Typ.
Die Dateien werden noch nicht extrahiert. Artikeleigenschaften BT-160/161 werden
gegen originale Name-/Wertangaben geprüft.

## Weitere Prüfungen

Die Rechnungsansicht wurde mit und ohne Lücke headless gerendert und visuell geprüft.
Es wurde keine echte Mac-/Windows-Fensterabnahme der neuen Version durchgeführt.
PowerShell, native Pakete, Signierung und CI sind nicht ausgeführt.
Vollständige Validator-, PDF-, DIN- oder Archivierungskonformität ist nicht nachgewiesen.

Alte Nachweise stehen in VERIFICATION-0.1.md. Alte Mutationstests betreffen nur
den Original-/XML-Kern. Sie beweisen keine Mutationstest-Abdeckung der neuen Fachlogik.
