# Nachweisstand dieser Alpha

Historischer Nachweis zum angegebenen Alpha-Stand. Für die weitere Entwicklung
gilt [Produktziel und Versionsgrenzen](PRODUCT-GOAL.md): Papier-/PDF-Ausgabe nach
DIN 5008 aus XRechnung/EN 16931-1 für Version 1.0; PDF-/Bildimport/OCR für Version 2.

Datum: 08.11.2026. Umgebung: Linux x64 in der Cloud, ohne interaktiven Desktop.
JDK: OpenJDK 17.0.20; finaler Build mit `jdk.compiler/com.sun.tools.javac.Main`,
Ziel Java 17. JAR mit `jdk.jartool/sun.tools.jar.Main` erzeugt.

## TDD-Ablauf

- Zuerst wurden die Kernverträge gegen eine absichtlich noch nicht implementierte
  API ausgeführt. Positive Verträge schlugen fehl; ablehnende Tests konnten gegen
  den alles ablehnenden Stub zunächst bereits grün sein. Dieser Zwischenstand war
  ausdrücklich kein Funktionsnachweis. Der Test-Tempordner wurde anschließend in
  den beschreibbaren Projekt-Buildordner gelegt.
- Danach wurden Snapshot, Parser, Inventar, Syntaxerkennung und Originalkopie
  implementiert. Alle 19 Kernverträge wurden grün.
- Die UI-Verträge wurden vor der UI-Implementierung ausgeführt: der erste Test
  schlug wegen des fehlenden Disclaimers fehl. Nach Umsetzung bestanden alle sechs
  UI-Verträge. Ein wirkliches Betriebssystemfenster wird dabei nicht geöffnet.
- Die zwei eingefrorenen KoSIT-Dateien wurden zusätzlich gegen ihre Hashes und
  unabhängig mit Python `xml.dom.minidom` ermittelte Knotenzahlen geprüft.
- Sechs gezielte Mutanten wurden danach im separaten Buildverzeichnis kompiliert;
  die passenden Verträge erkannten jede dieser eingeführten Regressionen.
  Produktionsquellen und ausgelieferte JAR wurden dabei nicht verändert.

## Finaler grüner Build

| Suite | Ergebnis | Aussage |
|---|---|---|
| `ContractTests` | 19 bestanden | konkrete Zusagen für Originalbytes, Syntaxerkennung, Werte, Inventar und Ablehnung unsicherer/zu großer Eingaben |
| `ViewTests` | 6 bestanden | Disclaimer in vier Ansichten, wörtlicher Filter, vollständiger Einzelwert, Quelltext und keine HTML-Interpretation von Werten |
| `FixtureTests` | 2 bestanden | SHA-256 und unabhängige Inventarzählung für je ein offizielles UBL-/CII-Beispiel |

In einem Kernvertrag wurden zusätzlich 100 deterministische Namespace-Präfixvarianten geprüft.
Vollständige Ausgabe: `build-verification.log`.

Offizielle Beispiele, Tag `v2026-08-31`:

| Datei | Bytes | Inventareinträge | SHA-256 |
|---|---:|---:|---|
| `kosit-01.01a-INVOICE_ubl.xml` | 6742 | 330 | `74fb09c609d5fba15a8c543060998d3b92858f56a81fb5b0ed244d6794e498d1` |
| `kosit-01.01a-INVOICE_uncefact.xml` | 9622 | 363 | `727b51982a84c9b406599a7384783570910440ed405c9bb6d918b22442636886` |

Die gebaute JAR wurde mit `--inspect` ausgeführt. Sie meldete die erwartete technische
Syntax, den Originalhash, die Inventarzahl und ausdrücklich **NICHT VALIDIERT**.
Ausgabe für CII: `inspect-verification.log`.

## Gezielte Regressionsprüfung

Aufruf nach dem Build: `python3 mutation-smoke.py` (zusätzliche Python-3-Voraussetzung
nur für diesen optionalen Entwicklungstest). Ausgabe: `mutation-verification.log`.

Die Verträge müssen folgende künstliche Fehler erkennen:

1. Eingabearray ohne defensive Kopie behalten.
2. Internes Originalarray direkt zurückgeben.
3. XML-Werte durch `trim()` verändern.
4. Beim Invoice-Wurzelelement den Namespace ignorieren.
5. DTD-Verarbeitung erlauben **und** den zweiten Schutz gegen DocumentType-Inventare entfernen.
6. Unbekannte Erweiterungen mit dem Test-Namespace aus dem Inventar entfernen.

Eine anfängliche einfache DTD-Mutation änderte das beobachtete Verhalten nicht:
das Inventar lehnte den DocumentType weiterhin ab. Deshalb prüft Nummer 5
ausdrücklich die kombinierte Entfernung beider Schutzmechanismen. Das ist keine
vollständige Mutationstest-Abdeckung und kein Sicherheitszertifikat.

## Weitere Prüfungen und offene Nachweise

- Shell-Skripte mit `sh -n` geprüft; Workflow-YAML geparst.
- Vier Headless-Swing-Ansichten gerendert und visuell geprüft; Spaltenreihenfolge
  für sichtbare XML-Werte verbessert und der geladene Baum aufgeklappt.
- Noch nicht ausgeführt: PowerShell-Skripte, GitHub-Actions-Workflow, native Pakete,
  Windows-/macOS-Fensterbedienung und GUI-Abnahme auf Linux.
- Kein KoSIT-Validator ausgeführt. Keine allgemeine XRechnung-Konformität,
  semantische Vollständigkeit, DIN-5008-Konformität oder PDF-Konformität nachgewiesen.
- Quellen und JAR sind vorhanden. Ein byteidentischer Rebuild mit beliebigem JDK
  wird nicht zugesagt; JAR-Zeitstempel und Compiler können sich unterscheiden.

Die Hashliste `SHA256SUMS.txt` im Projektwurzelordner dokumentiert die ausgelieferten
Dateien. Sie ist eine Integritätsliste, keine digitale Signatur.
