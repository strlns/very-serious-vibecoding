#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
sh ./build.sh
if [ -n "${JAVA_HOME:-}" ]; then JPACKAGE="$JAVA_HOME/bin/jpackage"; else JPACKAGE=jpackage; fi
rm -rf build/package-input
mkdir -p build/package-input
cp -R dist/. build/package-input/
"$JPACKAGE" --type app-image --name XRechnungViewer --app-version 0.8.0 \
  --vendor 'XRechnung Viewer Contributors' --description 'Menschenlesbare Rechnungsansicht, Alpha, nicht zertifiziert' \
  --input build/package-input --main-jar xrechnung-viewer.jar --main-class de.xrechnung.viewer.App \
  --dest build/native --add-modules java.base,java.desktop,java.xml,java.logging,java.net.http,java.sql,jdk.charsets --java-options '-Xmx512m'
printf '%s\n' 'Portable app image in build/native (keep the entire folder / .app bundle together).'
