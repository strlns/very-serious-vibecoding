# Testeingaben und Herkunft

Die Beispiele dienen der fachlichen Prüfung des
[Produktziels für Version 1.0](../docs/PRODUCT-GOAL.md): XRechnung/EN 16931-1 →
DIN-5008-Papier-/PDF-Darstellung mit nachvollziehbaren Restlücken.
PDF-/Bildimport und OCR sind für Version 2 geplant.

## Unveränderte Dateien aus der KoSIT-Testsuite v2026-08-31

- kosit-01.01a-INVOICE_ubl.xml
- kosit-01.01a-INVOICE_uncefact.xml

https://github.com/itplr-kosit/xrechnung-testsuite/tree/v2026-08-31/src/test/business-cases/standard

Die SHA-256-Werte und unabhängigen Knotenzählungen sind in FixtureTests festgeschrieben.

## Unveränderte Dateien aus KoSIT Visualization 3.0.1 / 2023-11-15

- max-3.0.1-ubl.xml ← test/instances/maxRechnung_ubl.xml
- max-3.0.1-creditnote.xml ← test/instances/maxRechnung_creditnote.xml
- embedded-3.0.1-ubl.xml ← test/instances/embedded-documents-bt-125_ubl.xml
- item-attributes-3.0.1-ubl.xml ← test/instances/itemAttributes_ubl.xml

https://github.com/itplr-kosit/xrechnung-visualization/releases/tag/v2023-11-15

Originaldateien nicht verändern. Die Maximaldateien sind technische Beispiele,
keine Behauptung eines realen oder fachlich gültigen Geschäftsfalls.

## Abgeleitete Demo mit Lücke

demo-paper-with-gap.xml basiert auf dem oben genannten UBL-Beispiel der Testsuite.
Es wurde bewusst um ein fremdes ProjectCode-Element mit ZUSATZFELD-2026 ergänzt.
Das demonstriert den geöffneten Lückeninspektor; keine gültige Rechnung behaupten.

Alle Originale: KoSIT / ursprüngliche Mitwirkende, Apache-2.0.
Lizenztext: LICENSE-KoSIT.txt. Gemischte Datums-/Versionsangaben werden nicht als
Nachweis exakter XRechnung-Patchkonformität missverstanden; das Ziel der App ist 3.0.1.

Gezielte synthetische Quellfälle in SemanticTests prüfen einzelne Eigenschaften
und erfüllen häufig nicht alle Regeln einer vollständigen Rechnung.


## Diagnose-Demo für das rechte Hinweispanel

`demo-darstellungshinweise.xml` erweitert `demo-paper-with-gap.xml` ausschließlich
um synthetische Erweiterungsdaten: unbekannte Textfelder, Attribute, ein leeres
Element, ein leeres Kennungsschema und langen wörtlichen Text. Sie ist absichtlich
kein schema-konformes Rechnungsbeispiel. Keine Geldwerte wurden geändert.
Die Demo dient offenen Zuordnungen, nicht dem Nachweis fachlicher Rechnungsfehler.
