param()
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
& ./build.ps1
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'Build failed' }
$packager = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin/jpackage.exe' } else { 'jpackage' }
if (Test-Path build/package-input) { Remove-Item build/package-input -Recurse -Force }
New-Item -ItemType Directory -Force build/package-input | Out-Null
Copy-Item dist/* -Destination build/package-input -Recurse -Force
& $packager --type app-image --name XRechnungViewer --app-version 0.8.0 --vendor 'XRechnung Viewer Contributors' --description 'Rechnungsansicht, Alpha, nicht zertifiziert' --input build/package-input --main-jar xrechnung-viewer.jar --main-class de.xrechnung.viewer.App --dest build/native --add-modules java.base,java.desktop,java.xml,java.logging,java.net.http,java.sql,jdk.charsets --java-options '-Xmx512m'
if ($LASTEXITCODE -ne 0) { throw 'Packaging failed' }
Write-Output 'Portable application: build/native/XRechnungViewer/XRechnungViewer.exe (keep the complete directory).'
