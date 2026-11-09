# Verbindliches Produktziel und Versionsgrenzen

Festgelegt am 09.11.2026. Diese Zieldefinition gilt für die weitere Entwicklung;
sie beschreibt keine bereits erreichte Normkonformität. Historische Übergaben
und Testberichte dokumentieren den damaligen Stand.

## Version 1.0 — XRechnung zu DIN-5008-Papierform und PDF

XRechnungen auf Grundlage von EN 16931-1 fachlich nachvollziehbar einlesen und
in eine gut lesbare Rechnungsdarstellung nach DIN 5008 überführen. Dieselbe
Darstellung als Papieransicht/PDF-Vorschau und als exportierbares PDF anbieten.
EN 16931-1 bestimmt die fachliche Bedeutung der Rechnungsdaten; DIN 5008 die
Schreib- und Gestaltungsvorgaben. Beide Normen werden gemeinsam berücksichtigt.
XRechnung-spezifische Anforderungen und Erweiterungen bleiben erhalten.
Zielprofil des derzeitigen Codes ist XRechnung 3.0.1; unterstützte Versionen und
Syntaxen müssen für die Freigabe ausdrücklich dokumentiert sein.

Die Papieransicht ist bereits gestalterisch brauchbar. Änderungen folgen
nachgewiesenen fachlichen Lücken und festgelegten Darstellungsanforderungen.
Eine zusätzliche positionsorientierte Ansicht ist geplant; die vorhandenen
Papier- und Kompaktansichten bleiben verfügbar. Diese Zusatzansicht ist keine
Voraussetzung für Version 1.0.

### Abnahme für 1.0

- [ ] Unterstützte XRechnung-Profile, Syntaxen und genaue Fassungen von EN 16931-1
  und DIN 5008 festlegen. DIN-Anforderungen anhand einer autorisierten Normfassung
  konkretisieren und die umgesetzten Anforderungen nachweisen.
- [ ] Relevante Rechnungsinformationen vollständig und fachlich richtig darstellen:
  einschließlich Preisbasismengen/-einheiten, Steuerkategorien und Befreiungsgründen,
  Nachlässen/Zuschlägen, Referenzen, Zahlungsinformationen und Wiederholungen.
  Feldmatrix und unabhängige Referenzfälle belegen Zuordnung und Darstellung.
- [ ] Nicht verarbeitete oder nicht darstellbare Inhalte mit Grund, Herkunft und
  vollständigem Quellwert rechts sichtbar halten. Verarbeitungslücke,
  Darstellungslücke und fachlicher Validierungsbefund müssen unterscheidbar sein.
  Erkannte Grenzen dürfen nicht durch eine scheinbar vollständige Ansicht verdeckt werden.
- [ ] Für jeden relevanten Inhalt festhalten: Hauptdarstellung, vollständige
  Detail-/Fortsetzungsdarstellung oder ausdrücklich ausgewiesene Lücke.
  Die Lückenliste ersetzt keine umsetzbare korrekte Darstellung unterstützter Felder.
- [ ] Exportfähige PDF-Darstellung mit vollständigen Fortsetzungsseiten und
  nachvollziehbaren Restlücken bereitstellen; verbleibende Lücken auch im PDF
  sichtbar ausweisen, etwa in einem Diagnoseanhang mit Herkunft und Quellwert.
  Vorschau und Export verwenden dieselben PDF-Bytes.
- [ ] PDF durch Textauszug und gerenderte Seiten prüfen: Inhalt, Umbrüche,
  Tabellen, Schriften, Sonderzeichen, Lesbarkeit und festgelegte DIN-Vorgaben.
- [ ] Original-XML unverändert erhalten; keine Geldwerte berechnen, rekonstruieren
  oder runden. PDF als abgeleitete Leseansicht kennzeichnen.
- [ ] Fehlerisolation, Wiederaufnahme und native Bedienung auf den unterstützten
  Zielplattformen prüfen. Vorhandene Schutzregeln und Tests gelten weiter.
- [ ] Fachliche Regelvalidierung separat mit Profil/Version und Ergebnis ausweisen;
  keine Gültigkeit aus erfolgreichem Einlesen oder 0 Darstellungslücken ableiten.
  Bestehende M2-Arbeiten bleiben Teil der fachlichen Absicherung.

Version 1.0 ist erreicht, wenn der PDF-Export steht und dieses gemeinsame
fachliche und gestalterische Ziel nachgewiesen ist. Ein funktionierender Export
allein ist noch keine 1.0-Freigabe. Bis zur belegten Abnahme bleiben die vorhandenen
Alpha-/Konformitätshinweise bestehen; keine Zertifizierung behaupten.
DIN 5008 ist kein alternatives Rechnungsdatenmodell: Eine technische Mappinglücke
ist nicht automatisch eine Unvereinbarkeit mit der Norm.

### Datums- und Zeitangaben

Nur reine Kalendertage nach Anzeige-Locale formatieren. Keine stillen Zeit- oder
Zeitzonenkonvertierungen, keine abgeschnittenen oder erfundenen Zeitanteile.
Abweichende Quelldaten erhalten und sichtbar diagnostizieren. Eine gegebenenfalls
spätere zusätzliche lokale Zeitdarstellung muss Quellwert und Zielzone/Offset
explizit erkennbar lassen. Details: [DATE-TIME-SAFETY.md](DATE-TIME-SAFETY.md).

## Version 2 — Assistierter Import unstrukturierter Rechnungen

PDFs mit Text-Layer und Scans/Bilder einlesen, Text/OCR und Layout auswerten,
Rechnungsfelder mit Fundstellen und Unsicherheiten vorschlagen, manuell prüfen
und daraus ein neues XRechnung-XML im festgelegten Profil erzeugen und validieren.
DIN-5008-Layout kann die Analyse unterstützen, garantiert aber weder eine
vollständige Erkennung noch die fachliche Bedeutung eines gefundenen Werts.

Dieser Umfang ist ausdrücklich auf Version 2 verschoben und keine Voraussetzung
für Version 1.0. Die bisherigen Arbeitspakete M4a–M4c bleiben als Planung erhalten:
Text-Layer zuerst, OCR gesondert, fachliche Zuordnung/Benutzerprüfung und
XML-Erzeugung mit Validierung als getrennte Schritte. Keine automatische
Rekonstruktion fehlender Geldwerte oder stillschweigende Reparatur.

## Verweise

- [Meilensteine und offene Arbeiten](MILESTONES.md)
- [Aktuelle technische Übergabe](HANDOFF.md)
- [Untersuchung der CII-Preisbasen](PRICE-BASE-REVIEW.md)
- [DIN: DIN 5008](https://www.din.de/de/mitwirken/normenausschuesse/nia/einfach-richtig-schreiben-707192)
- [DIN EN 16931-1](https://www.dinmedia.de/de/norm/din-en-16931-1/327729047)
