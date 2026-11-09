#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if [ -n "${JAVA_HOME:-}" ]; then JAVA="$JAVA_HOME/bin/java"; else JAVA=java; fi
rm -rf build/classes build/test-classes
mkdir -p build/classes build/test-classes build/test-temp dist
# Run the JDK tools as modules; this also supports JDKs without separate javac/jar launchers.
find src/main/java -name '*.java' -print > build/main-sources.txt
find src/test/java -name '*.java' -print > build/test-sources.txt
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) SEP=';';; *) SEP=':';; esac
LIBS="vendor/lib/Saxon-HE-12.5.jar${SEP}vendor/lib/xmlresolver-5.2.2.jar${SEP}vendor/lib/xmlresolver-5.2.2-data.jar${SEP}vendor/lib/pdfbox-app-3.0.8.jar"
"$JAVA" --module jdk.compiler/com.sun.tools.javac.Main --release 17 -encoding UTF-8 -cp "$LIBS" -d build/classes @build/main-sources.txt
cp -R src/main/resources/. build/classes/
CP="build/classes${SEP}build/test-classes${SEP}${LIBS}"
"$JAVA" --module jdk.compiler/com.sun.tools.javac.Main --release 17 -encoding UTF-8 -cp "$CP" -d build/test-classes @build/test-sources.txt
"$JAVA" -Djava.awt.headless=true -Djava.io.tmpdir=build/test-temp -cp "$CP" de.xrechnung.viewer.ContractTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.ViewTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.FixtureTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.SemanticTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.InvoiceWorkspaceTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.FormatTests
"$JAVA" -Djava.awt.headless=true -Djava.io.tmpdir=build/test-temp -cp "$CP" de.xrechnung.viewer.DocumentTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.CompactDataTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.FullTextTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.InteractionTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.AsyncLoadTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.RecoveryTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.PdfNavigationTests
"$JAVA" -Djava.awt.headless=true -cp "$CP" de.xrechnung.viewer.PdfTests
mkdir -p dist/lib
cp vendor/lib/*.jar dist/lib/
mkdir -p dist/licenses
cp vendor/licenses/* dist/licenses/
cp LICENSE dist/licenses/Project-Apache-2.0.txt
cp THIRD-PARTY-NOTICES.md dist/
printf 'Manifest-Version: 1.0\nMain-Class: de.xrechnung.viewer.App\nClass-Path: lib/Saxon-HE-12.5.jar lib/xmlresolver-5.2.2.jar lib/xmlresolver-5.2.2-data.jar lib/pdfbox-app-3.0.8.jar\n\n' > build/MANIFEST.MF
"$JAVA" --module jdk.jartool/sun.tools.jar.Main --create --file dist/xrechnung-viewer.jar --manifest build/MANIFEST.MF -C build/classes .
printf '%s\n' 'Build and tests successful: dist/xrechnung-viewer.jar'
