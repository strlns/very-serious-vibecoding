# Meilensteine · Stand Alpha 0.8

## Versionsplan ab 09.11.2026

Verbindlich: [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md).
M0–M3 führen zur Version 1.0: fachlich nachvollziehbare Überführung von XRechnung
auf Basis von EN 16931-1 in Papier-/PDF-Darstellung nach DIN 5008, mit sichtbaren
Restlücken. PDF-Export und belegtes Erreichen dieses Ziels bilden den 1.0-Meilenstein.
M4 einschließlich M4a–M4c ist vollständig auf Version 2 verschoben.

## M0 — Robuster Import und nachvollziehbare Fehler (laufend)

Fehlertoleranz der Anwendung bedeutet keine automatische XML-Reparatur.

In 0.7 abgesichert:
- [x] Nicht wohlgeformtes oder aus Sicherheitsgründen gesperrtes XML wird pro Datei
  abgelehnt; unveränderte Originaldatei bleibt erhalten. Parserposition als Zeile/Spalte.
- [x] Ein fehlerhafter Eintrag im Stapel verhindert nicht das Laden späterer Dateien.
- [x] Bereits geöffnete Rechnungen bleiben erhalten; Laden ist nach Fehlern erneut möglich.
- [x] Asynchrone Verarbeitung endet mit abgeschalteter Ladeanimation.
- [x] Fehlende/ungültige Beispieldaten verursachen beim Anzeigen keinen unbehandelten
  Importfehler; nicht interpretierbare Inhalte bleiben über Original/Diagnose zugänglich.

Regeln:
- Wohlgeformtheit, unterstützte Syntax, Transformierbarkeit und fachliche/schema-
  konforme Rechnung sind getrennte Eigenschaften. Der jetzige Parser prüft kein XSD.
- Fehlende Angaben nicht erfinden, unlesbare Beträge nicht zu 0 machen. Keine Tags,
  Namespaces, Dezimalwerte oder Zeichenkodierungen stillschweigend korrigieren.
- Auch eine erfolgreiche Best-Effort-Darstellung kann fachlich ungültig sein;
  0 Darstellungslücken bedeutet keine bestandene Validierung.

Noch offen:
- [ ] Strukturierte Fehlerklassen für Lesen/Parser/Sicherheitslimit/Transformation/
  Darstellung/Validierung mit jeweils geeigneter Wiederaufnahme ausarbeiten.
- [ ] Darstellungsfehler pro Dokument isolieren und fehlerhaften UI-Aufbau atomar
  zurückrollen; weitere Dokumente eines Stapels trotzdem installieren.
- [ ] Optional eigener Fehler-/Originaldatenreiter für abgelehnte Dateien; kein
  repariertes XML als Original oder gültige Rechnung präsentieren.
- [ ] Ressourcenlimits vor dem vollständigen DOM-Aufbau weiter absichern; begrenzte
  Laufzeit, Speicher-/Eintragsbudgets und Abbruch mit großen/feindlichen Quellen testen.
- [ ] Native Fehlerdialoge und Wiederaufnahme auf Windows/macOS/Linux abnehmen.

## M1 — Benutzbare erste Rechnungsansicht

Implementiert: Papierstil, Absender/Empfänger, Rechnungsdaten, Positionen, Summen,
Steuern, Zahlungsangaben, vollständige fachliche Detailgruppen. XML-Diagnose nachgeordnet.
Lückenzahl unten rechts; Details einklappbar und nur bei Lücken standardmäßig offen.
Mehrere Dateireiter, Drag & Drop, globale Papier-/Kompaktansicht und
währungsabhängige Formatierung ohne Rundung sind in 0.3 ergänzt.

Noch abzunehmen:
- [ ] GUI auf Windows x64, macOS und Linux.
- [ ] Reale Benutzerbedienung, native Datei-Drops, Mehrfachauswahl, Clipboard,
      Reiterwechsel/Schließen, DPI 100–200 %, Tastatur und Schriftabdeckung.
- [ ] Native Pakete ohne separat installiertes Java starten.
- [ ] PowerShell-Build und vorbereiteten CI-Workflow ausführen.

## M2 — Vollständigkeit und fachliche Validierung für XRechnung 3.0.1

Teilweise implementiert: alle 167 BT / 41 BG des offiziellen Zwischenmodells
registriert und nativ dargestellt. 129 BT in sechs KoSIT-Quellen beobachtet.
Vollständige Detailwerte und Metadaten, Quellwertabgleich und Restlückeninspektor vorhanden.

Noch offen:
- [ ] Für alle noch nicht belegten BT reale oder unabhängig konstruierte fachliche
  Quellfälle in jeder jeweils zulässigen Syntax hinzufügen.
- [ ] Kardinalitäten, Gruppenbezüge, Unterpositionskombinationen, alle Kennungsschemata,
  Steuersonderfälle, Nachlässe, Zuschläge und Dritt-/Fremdforderungen prüfen.
- [ ] Passendes offizielles 3.0.1-Regelpaket und KoSIT-Validator mit Version, Herkunft,
  SHA-256 und Lizenz fixieren; vollständig offline einbinden.
- [ ] Gültig/ungültig/unbekannt/nicht unterstützt/Prüfung fehlgeschlagen separat zeigen.
- [ ] Quellenbezüge gegen unabhängige fachliche Goldens prüfen; auch semantisch falsche
  Zuordnungen müssen Tests erkennen, nicht nur fehlende Werte.
- [ ] Konkrete Restlücken der Maximalfälle beurteilen, ohne Gruppen pauschal abzuhaken.
- [ ] Anlagenextraktion separat bytegenau und ohne Dateinamen-/Pfadübernahme testen.
- [ ] Hauptansicht für alle unterstützten Fälle fachlich abnehmen.

Disclaimer bleibt auch nach erfolgreicher Regelprüfung.
0 Lücken allein erfüllt keinen dieser Freigabepunkte.

## M3 — Papier-/PDF-Darstellung nach DIN 5008 · Freigabeziel 1.0

Erster implementierter Stand in Alpha 0.8: PDFBox-basierte A4-Ausgabe aus dem
semantischen Modell, vollständige Detailseiten, Diagnoseanhang, native Vorschau
und Speichern derselben PDF-Bytes. Zwölf PDF-Verträge plus Sichtprüfung der
Beispielseiten; genaue DIN-5008-Anforderungen und deren Abnahme bleiben offen.
Siehe [PDF-Stand und Grenzen](PDF-0.8.md).
DIN 5008 betrifft die Gestaltung, nicht die Gültigkeit der XRechnung.

- [ ] DIN-5008-orientiertes Layout; exakte Normkonformität nur aus autorisierter
  Normfassung einschließlich Berichtigungen ableiten.
- [x] Erste Pipeline aus semantischem Modell evaluieren: direkte PDFBox-Ausgabe;
  FOP ist für diesen Stand nicht erforderlich.
- [x] Vorschau aus denselben PDF-Bytes rendern, die exportiert werden (PDFBox).
- [ ] Vollständigkeit, Tabellenüberläufe, Seitenumbrüche, Schriften und Sonderzeichen
  mit Textauszug UND gerenderten Seiten gegen unabhängige Referenzen prüfen.
- [x] Disclaimer auf jeder Seite. PDF als Leseansicht, XML als Original kennzeichnen.
- [ ] Nicht vollständig darstellbare Daten explizit behandeln, niemals still auslassen.
- [ ] Original-XML optional unverändert beilegen/einbetten; keine automatische
  Behauptung von ZUGFeRD, Factur-X, PDF/A oder Archivierungskonformität.

Bei erheblich wachsendem Aufwand Fortschritt melden; nach abgeschlossenen,
nachgewiesenen Etappen stoppen und den nächsten Prüfpunkt festhalten.

## M4 — Version 2: Assistierter Import von Papier-/PDF-Rechnungen zu XML

Ziel für Version 2: Rechnungen in Papiergestaltung/PDF einlesen, DIN-5008-Regeln
bei der Layoutinterpretation berücksichtigen und daraus
nach Prüfung ein neues XML-Dokument im gewählten Rechnungsprofil erzeugen.
Das Layout liefert allein keine vollständige fachliche Zuordnung oder fehlenden
Pflichtdaten. Kein Versprechen einer automatischen verlustfreien OCR-Konvertierung.
Dieses Vorhaben beginnt erst nach einem gesonderten Konzept und einem belegten,
überschaubaren ersten Teilziel; bei wachsendem Aufwand Fortschritt melden.

### M4a — PDF mit Text-Layer

- [ ] Prüfen, ob bereits ein unterstütztes eingebettetes Rechnungs-XML vorliegt;
  dieses separat unverändert behandeln, statt Daten unnötig aus der Darstellung zu rekonstruieren.
- [ ] Text, Positionen und Seitenbezüge extrahieren; Tabellen, Umbrüche, wiederholte
  Kopf-/Fußzeilen und mehrdeutige Leserichtung anhand unabhängiger Beispiele prüfen.
- [ ] Erfasste Felder neben dem Original anzeigen, mit genauer Fundstelle und klar
  erkennbarer Unsicherheit. Nicht zugeordnete Inhalte separat sichtbar lassen.

### M4b — Scans/Bilder ohne brauchbaren Text-Layer

- [ ] OCR separat evaluieren: Schräglage, Auflösung, Schatten, Sprach-/Schriftwechsel,
  Dezimal-/Tausendertrennzeichen, verwechselte Zeichen, negative Beträge und Tabellen.
- [ ] Originalbild immer zur Gegenprüfung anbieten; OCR-Ergebnisse sind Vorschläge.
  Widersprüche und fehlende Werte nicht durch plausible Ersatzwerte verdecken.
- [ ] Versionierte Referenzbelege mit unabhängig erfasster Ground Truth und Lizenz/
  Nutzungsfreigabe; Feldfehler und übersehene Informationen gesondert ausweisen.

### M4c — Fachliche Prüfung und neues XML

- [ ] Zielprofil und Syntax (z. B. UBL/CII) explizit festlegen. Offizielle Bindungen/
  Regelpakete versionieren; der existierende Viewer ist kein XML-Autorensystem.
- [ ] Fehlende Pflichtangaben gezielt beim Nutzer erheben. Datenherkunft und jede
  manuelle Korrektur nachvollziehbar halten; unsichere Werte vor Export bestätigen.
- [ ] Keine automatischen Geldberechnungen oder Summen-/Steuerrekonstruktionen.
  Die Decimal-/Bestätigungsregel aus AGENTS.md gilt vollständig weiter.
- [ ] Aus dem geprüften Entwurf ein neues XML erzeugen. Eingangs-PDF/Scan und etwaige
  eingebettete XML-Originale unverändert behalten; Ausgabe als erzeugtes Dokument kennzeichnen.
- [ ] Erzeugtes XML vor Freigabe mit dem passenden Schema und den freigegebenen
  Geschäftsregeln validieren; anschließend mit dem Viewer gegen die Eingangsquelle prüfen.
- [ ] Mehrdeutige, fehlende oder widersprüchliche Angaben sperren eine automatische
  Freigabe. Keine Zertifizierung oder rechtliche Gleichwertigkeit automatisch behaupten.

Abnahme: unabhängige Sollwerte und Negativfälle, kein Test-Golden aus der eigenen
Extraktionsimplementierung. OCR, fachliche Zuordnung, Benutzerfreigabe und XML-
Validierung getrennt nachweisen. Originalerhaltung ist unabhängig davon testbar.


## Ergänzung 09.11.2026 — Lesedarstellung und PDF-Vorbereitung

Die vorhandene Papieransicht gestalterisch beibehalten. Zuerst konkrete
Zuordnungslücken und fachliche Darstellung untersuchen; keine vorgezogene Neugestaltung.

- [ ] Für XRechnung → PDF/Papier eine nachvollziehbare Feldmatrix führen:
  Hauptansicht, aufgeklappte Details, PDF einschließlich Fortsetzungsseiten,
  Quelldaten und nicht dargestellte Inhalte getrennt erfassen. Zugeordnete Daten
  können trotzdem in der Hauptansicht fehlen oder missverständlich verkürzt sein.
- [ ] Preisbasismenge/-einheit neben dem Einzelpreis, positionsbezogene Steuern,
  Befreiungs-/Reverse-Charge-Hinweise, Nachlässe/Zuschläge, Referenzen und
  Zahlungsangaben fachlich auf verständliche und vollständige Darstellung prüfen.
  Keine Beträge rekonstruieren oder berechnen.
- [ ] Normkonzept festhalten: EN 16931-1 beschreibt Rechnungssemantik,
  DIN 5008 Schreib-/Gestaltungsregeln. Keine konkurrierenden Datenformate;
  DIN-orientierte Gestaltung darf keine relevanten Rechnungsinformationen verdrängen.
  Genaue DIN-Konformität erst anhand einer autorisierten Normfassung prüfen.
- [ ] Später zusätzliche positionsorientierte Ansicht zwischen Papier und Kompakt:
  Positionen im Fokus, übersichtliche Kopfdaten/Summen, vollständige Details erreichbar.
  Bestehende Papier- und Kompaktansicht erhalten; zunächst Konzept und Abnahmefälle.
- [ ] CII: statische Quellenverweise für BT-9/BT-20 bei alternativen Namespace-Präfixen
  prüfen. Die neuen Tests decken Präfixunabhängigkeit der Preisbasis ab, nicht alle Felder.
