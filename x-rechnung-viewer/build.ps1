param()
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$java = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin/java.exe' } else { 'java' }
foreach ($output in @('build/classes','build/test-classes')) {
    if (Test-Path $output) { Remove-Item -Recurse -Force $output }
}
New-Item -ItemType Directory -Force build/classes,build/test-classes,build/test-temp,dist | Out-Null
$main = @(Get-ChildItem src/main/java -Filter *.java -Recurse | ForEach-Object { $_.FullName })
$tests = @(Get-ChildItem src/test/java -Filter *.java -Recurse | ForEach-Object { $_.FullName })
$libs = 'vendor/lib/Saxon-HE-12.5.jar;vendor/lib/xmlresolver-5.2.2.jar;vendor/lib/xmlresolver-5.2.2-data.jar;vendor/lib/pdfbox-app-3.0.8.jar'
& $java --module jdk.compiler/com.sun.tools.javac.Main --release 17 -encoding UTF-8 -cp $libs -d build/classes @main
if ($LASTEXITCODE -ne 0) { throw 'Main compilation failed' }
Copy-Item src/main/resources/* -Destination build/classes -Recurse -Force
& $java --module jdk.compiler/com.sun.tools.javac.Main --release 17 -encoding UTF-8 -cp "build/classes;$libs" -d build/test-classes @tests
if ($LASTEXITCODE -ne 0) { throw 'Test compilation failed' }
$cp = "build/classes;build/test-classes;$libs"
foreach ($suite in @('ContractTests','ViewTests','FixtureTests','SemanticTests','InvoiceWorkspaceTests','FormatTests','DocumentTests','CompactDataTests','FullTextTests','InteractionTests','AsyncLoadTests','RecoveryTests','PdfNavigationTests','PdfTests')) {
    & $java '-Djava.awt.headless=true' '-Djava.io.tmpdir=build/test-temp' -cp $cp "de.xrechnung.viewer.$suite"
    if ($LASTEXITCODE -ne 0) { throw "Test failure: $suite" }
}
New-Item -ItemType Directory -Force dist/lib | Out-Null
Copy-Item vendor/lib/*.jar -Destination dist/lib -Force
New-Item -ItemType Directory -Force dist/licenses | Out-Null
Copy-Item vendor/licenses/* -Destination dist/licenses -Force
Copy-Item LICENSE -Destination dist/licenses/Project-Apache-2.0.txt -Force
Copy-Item THIRD-PARTY-NOTICES.md -Destination dist -Force
"Manifest-Version: 1.0`nMain-Class: de.xrechnung.viewer.App`nClass-Path: lib/Saxon-HE-12.5.jar lib/xmlresolver-5.2.2.jar lib/xmlresolver-5.2.2-data.jar lib/pdfbox-app-3.0.8.jar`n`n" | Set-Content -Encoding ascii build/MANIFEST.MF
& $java --module jdk.jartool/sun.tools.jar.Main --create --file dist/xrechnung-viewer.jar --manifest build/MANIFEST.MF -C build/classes .
if ($LASTEXITCODE -ne 0) { throw 'JAR creation failed' }
Write-Output 'Build and tests successful: dist/xrechnung-viewer.jar'
