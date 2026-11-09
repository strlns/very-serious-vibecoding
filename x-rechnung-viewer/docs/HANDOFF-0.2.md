# Lokale Codex-Übergabe · Alpha 0.2

Historischer Nachweis zum angegebenen Alpha-Stand. Für die weitere Entwicklung
gilt [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md): Papier-/PDF-Ausgabe nach
DIN 5008 aus XRechnung/EN 16931-1 für Version 1.0; PDF-/Bildimport/OCR für Version 2.

Datum: 08.11.2026. Die Version 0.1 war ein technischer XML-Viewer. Der Nutzer hat
klargestellt: Das Produkt soll eine Rechnung für Menschen zeigen. Das ist jetzt
die Hauptansicht; technische Diagnose ist ein zweiter Reiter.

## Einstieg

1. Kompletten Projektordner lokal in Codex öffnen.
2. AGENTS.md und README.md lesen.
3. Mit JDK 17+ sh build.sh oder ./build.ps1 ausführen.
4. dist/xrechnung-viewer.jar starten; dist/lib und dist/licenses mitnehmen.
5. Mit den Beispielen und anschließend echten freigegebenen Rechnungen lokal testen.
6. Erst nach Desktop-Abnahme portable Pakete auf dem jeweiligen Zielsystem bauen.

## Architektur

- InvoiceFile: unveränderte Bytes, sichere technische XML-Analyse, Originalkopien.
- XmlDocuments: sichere DOM-Verarbeitung für interne Modell-/Ressourcenschritte.
- KositMapper: fest eingebettete offizielle 3.0.1-XSLTs, Saxon HE, Vorlagen-Cache.
  Keine selbst entworfene UBL-/CII-Feldzuordnung. Fehler landen als konkrete Lücken.
- FieldCatalog: alle 167 BT und 41 BG aus dem offiziellen semantischen Schema;
  deutsche KoSIT-Texte und dokumentierte Ergänzungen für Gruppen/BT-160/161.
- SemanticInvoice: unveränderliches hierarchisches Modell mit Quellenverweisen,
  Eigenschaftswerten und sicheren Zusammenfassungsabfragen für Unterpositionen.
- SourceCoverage: konservative Zuordnungsanalyse mit Wert-/Quellenbezug.
  Sie ist weder XSD-/Schematron-Validator noch semantischer Äquivalenzbeweis.
- InvoicePaper: native Papierdarstellung; zentrale Rechnungsdaten und danach
  sämtliche weiteren Modellwerte nach Fachgruppen. Sehr lange Werte scrollbar.
- InvoiceWorkspace: Rechnungsansicht, nachgeordnete technische Diagnose und
  einklappbarer Lückeninspektor mit dauernd sichtbarer Gesamtzahl.
- InvoicePanel: bisheriger XML-Viewer, nur noch technische Diagnose.
- App: Hintergrundladen und Transformation, native Dateidialoge im Swing-Look-and-Feel,
  Menü/Shortcuts, Originalkopien und Diagnose-CLI.

Die Dateiauswahl verwendet Swing JFileChooser, keine Zusage pixelidentischer
nativer Betriebssystemdialoge. Das Projekt verwendet bewusst keine Browsertechnik.

## Exakter Nachweisstand

58 Testfälle bestanden. Native Darstellung aller 167 BT und 41 BG mit synthetischen
Modellwerten geprüft. Sechs reale KoSIT-Dateien decken 129/167 BT tatsächlich in
der Quelltransformation ab. Weitere zielgerichtete synthetische Quellfälle sind
in SemanticTests enthalten und werden nicht als reale Korpusabdeckung ausgegeben.

FIELD-COVERAGE-3.0.1.csv trennt Registrierung, statische XSLT-Erwähnung und beobachtete
Ausführung. FIXTURE-COVERAGE-0.2.csv dokumentiert Hashes, Feldzahlen und Lücken pro
Quelle. Ältere 0.1-Protokolle bleiben als historische Nachweise enthalten.

## Wesentliche Entscheidungen

- Zielprofil explizit 3.0.1, offizielle Visualisierung 2023-11-15.
- Die häufige Profil-URI xrechnung_3.0 unterscheidet keine Patchversion.
- Kein Feld wird allein aufgrund eines Gruppen-Quellenpfades als vollständig abgedeckt markiert.
- CII-Daten werden durch KoSIT ggf. zu ISO-Daten normalisiert; der Quellwert bleibt im Original.
- Rechnungswährung und Steuerwährung sind getrennte Kontexte. Ein Währungskonflikt
  am Zahlbetrag bleibt eine Lücke, auch wenn der Währungscode als Steuerwährung vorkommt.
- Text und CDATA desselben Wertelements werden für die Zuordnungsanalyse zusammen betrachtet.
- Bekannte leere Bemerkungen und der leere CII-Header-Liefercontainer sind bedeutungslos.
  Unbekannte leere Erweiterungen oder Attribute können dagegen eine Präsenzbedeutung haben.
- Zähler 0 ist kein Konformitätsstatus. Die zugrunde liegenden KoSIT-XSLTs setzen
  gültige Eingaben voraus; diese Alpha hat noch keinen passenden Regelvalidator.
- Alle Anlagenwerte bleiben vollständig erhalten; noch keine Dateiextraktion.
- Keine Rundung, Summenberechnung oder Erfindung fehlender Elternwerte.
- PDF und genaue DIN-5008-Anforderungen sind noch nicht umgesetzt.

## Nächste Arbeiten

1. Echte GUI auf Mac, Windows und Linux prüfen, speziell Breiten, DPI, Schriftabdeckung,
   lange Namen/Notizen, Tastatur und Umschalten des Lückenbereichs.
2. Fehlende reale Quellabdeckung der 38 noch nicht im Sechs-Dateien-Korpus beobachteten
   BT ergänzen; Unterschiede zwischen den Syntaxbindungen dokumentieren.
3. Auch die konkreten Restlücken der Maximalbeispiele nachvollziehen. Nicht automatisch
   als Produktfehler oder ungültige Rechnung klassifizieren.
4. Passenden KoSIT-Regelvalidator + Regelpaket für 3.0.1 ermitteln und offline integrieren.
5. Abdeckung mit unabhängigen Goldens, Mutationen und kompletten Datenkombinationen erweitern.
6. Erst dann PDF-Vorschau und Export; dasselbe PDF für Vorschau und gespeicherte Ausgabe.

## Fortsetzungsauftrag

> Lies AGENTS.md und die aktuellen Nachweise. Baue und teste den unveränderten Stand.
> Nimm die menschenlesbare Hauptansicht auf diesem Betriebssystem ab. Ergänze danach
> mit striktem TDD die noch nicht belegten 3.0.1-Quellbindungen und die Regelvalidierung.
> Bewahre Originalbytes, Quellenbezüge, alle Wiederholungen und den einklappbaren
> Lückenbereich. Setze „0 Lücken“ niemals mit Konformität gleich. Bei wesentlich
> wachsendem Aufwand den konkreten, getesteten Zwischenstand melden.
