import { copyFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const monorepo = resolve(root, '..');
await access(resolve(monorepo, '.git'));
await copyFile(resolve(root, 'releases/squeaklite.html'), resolve(monorepo, 'squeaklite.html'));
console.log('Updated ../squeaklite.html');
