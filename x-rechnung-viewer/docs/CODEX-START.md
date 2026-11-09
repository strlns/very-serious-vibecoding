# Lokaler Einstieg in Codex

Aktueller Versionsplan: [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md).
Version 1.0 = XRechnung/EN 16931-1 → DIN-5008-Papier-/PDF-Darstellung mit
nachvollziehbaren Restlücken; unstrukturierter PDF-/Bildimport und XML-Erzeugung
gehören zu Version 2. Die nachfolgenden Befunde beschreiben den Implementierungsstand.

Geprüft am 09.11.2026 im Unterordner `x-rechnung-viewer` des bestehenden
Monorepos. Kein separates Repository und kein Submodul erforderlich.
Änderungen, Builds und projektbezogene Git-Pfade auf diesen Unterordner begrenzen.
Die übergeordnete Deployment-Konfiguration wurde nicht verändert.

## Verifizierter Ausgangspunkt

- Ausgangspunkt Alpha 0.7; Java-17-kompatible Quellen, lokales OpenJDK 27 (macOS arm64).
- `sh build.sh`: 92 Tests erfolgreich; erstellt `dist/xrechnung-viewer.jar`.
- Vor Abschluss des Builds: alle 146 vorhandenen Dateien aus `SHA256SUMS.txt`
  stimmen mit den mitgelieferten Hashes überein.
- Im übertragenen Paket fehlen `.gitignore` und `.github/workflows/build.yml`,
  obwohl die Prüfsummenliste sie nennt. Die lokale `.gitignore` wurde neu ergänzt;
  sie ist keine Wiederherstellung der ursprünglichen Datei. Der alte Workflow
  wurde nicht rekonstruiert, da das Monorepo bereits Deployment verwaltet.
- Die mitgelieferte Prüfsummenliste bleibt als Herkunftsnachweis unverändert;
  neu gebaute JARs können wegen Build-Metadaten andere Hashes haben.
- Git-Aufrufe scheitern lokal an der noch nicht akzeptierten Xcode-Lizenz.
  Kein Commit erstellt; keine Systemeinstellungen verändert.

## Fortsetzen

Zuerst `AGENTS.md`, `docs/HANDOFF.md` und `docs/MILESTONES.md` lesen.

```sh
sh build.sh
java -jar dist/xrechnung-viewer.jar fixtures/kosit-01.01a-INVOICE_ubl.xml
```

Den vollständigen `dist`-Ordner einschließlich Bibliotheken und Lizenzen behalten.
Build-Ausgaben unter `build` sind lokal ignoriert. Quellen, Fixtures, Bibliotheken
und die mitgelieferte Distribution bleiben verfügbar.

Die Tests liefen headless. Native Bedienung, Intel-Mac-Leerlaufverhalten und
Plattformpakete sind weiterhin offen. PDF-Vorschau/-Export sind seit Alpha 0.8
vorhanden; Bild-/PDF-Import bleibt Version 2. Siehe [PDF-Stand](PDF-0.8.md). Als nächster begrenzter Entwicklungsschritt bietet
sich M0 an: Darstellungsfehler pro Dokument isolieren und den UI-Aufbau atomar
zurückrollen, damit weitere Dokumente eines Stapels geladen werden können.
Geld-Arithmetik bleibt entsprechend `AGENTS.md` ausgeschlossen.
