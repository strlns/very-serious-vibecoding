#!/usr/bin/env python3
"""Optional targeted regression check (Python 3 + built JDK project). No production files are changed."""
from pathlib import Path
import os
import subprocess

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
java = str(Path(os.environ['JAVA_HOME']) / 'bin' / ('java.exe' if os.name == 'nt' else 'java')) if os.environ.get('JAVA_HOME') else 'java'
original = Path('src/main/java/de/xrechnung/viewer/InvoiceFile.java').read_text(encoding='utf-8')
mutants = [
    ('input-alias', 'byte[] original = input.clone();', 'byte[] original = input;', 'byte preservation and defensive ownership'),
    ('output-alias', 'public byte[] originalBytes() { return original.clone(); }', 'public byte[] originalBytes() { return original; }', 'byte preservation and defensive ownership'),
    ('trim-values', 'node.getNodeValue() == null ? "" : node.getNodeValue()', 'node.getNodeValue() == null ? "" : node.getNodeValue().trim()', 'no decimal/date/whitespace coercion'),
    ('ignore-root-namespace', 'String name = expanded(root);', 'if ("Invoice".equals(root.getLocalName())) return Syntax.UBL_INVOICE; String name = expanded(root);', 'root detection uses expanded names'),
    ('enable-dtd-and-skip-doctype', 'factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);', 'factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", false);', 'DTD, external and internal entities are refused'),
    ('drop-unknown-extension', 'int id = entries.size();', 'if ("urn:unknown".equals(node.getNamespaceURI())) return; int id = entries.size();', 'unknown extensions remain inspectable'),
]
for name, before, after, expected_failure in mutants:
    if original.count(before) != 1:
        raise SystemExit(f'Mutation anchor changed: {name}; review the test, do not silently skip')
    target = Path('build/mutations') / name
    target.mkdir(parents=True, exist_ok=True)
    source = target / 'InvoiceFile.java'
    changed = original.replace(before, after)
    if name == 'enable-dtd-and-skip-doctype':
        # A single disabled feature is equivalent here: inventory also refuses DocumentType.
        # Disable that second defence too, to exercise the externally observable contract.
        changed = changed.replace('int id = entries.size();', 'if (node.getNodeType() == Node.DOCUMENT_TYPE_NODE) return; int id = entries.size();')
    source.write_text(changed, encoding='utf-8')
    subprocess.run([java, '--module', 'jdk.compiler/com.sun.tools.javac.Main', '--release', '17', '-encoding', 'UTF-8', '-d', str(target), str(source)], check=True)
    cp = os.pathsep.join((str(target), 'build/classes', 'build/test-classes'))
    run = subprocess.run([java, '-Djava.awt.headless=true', '-Djava.io.tmpdir=build/test-temp', '-cp', cp, 'de.xrechnung.viewer.ContractTests'], capture_output=True, text=True, encoding='utf-8')
    (target / 'result.log').write_text(run.stdout + run.stderr, encoding='utf-8')
    if run.returncode == 0 or 'FAIL ' + expected_failure + ':' not in run.stdout or 'RESULT:' not in run.stdout:
        raise SystemExit(f'Mutant survived or infrastructure failed: {name}\n{run.stdout}\n{run.stderr}')
    print(f'KILLED {name}: {expected_failure}', flush=True)
print('RESULT: 6 targeted mutants rejected; not an exhaustive mutation analysis')
