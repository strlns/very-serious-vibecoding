import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root = new URL('../vendor/emsdk-4.0.15/', import.meta.url);
const {sha256} = JSON.parse(readFileSync(new URL('provenance.json', root), 'utf8'));
for (const [file, expected] of Object.entries(sha256)) {
  const actual = createHash('sha256').update(readFileSync(new URL(file, root))).digest('hex');
  if (actual !== expected) throw new Error(`Vendored SDK installer checksum mismatch: ${file}`);
}
console.log('Vendored SDK installer SHA256 checks passed.');
