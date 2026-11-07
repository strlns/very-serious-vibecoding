#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {basename} from 'node:path';

const sdk = fileURLToPath(new URL('../../.cache/emsdk/', import.meta.url));
const tool = basename(process.argv[1]).startsWith('avs-empp') ? 'em++' : 'emcc';
if (!existsSync(`${sdk}/.emscripten`)) throw new Error('Run npm run setup:wasm first.');
const result = spawnSync(process.env.PYTHON || 'python3', [`${sdk}/upstream/emscripten/${tool}.py`, ...process.argv.slice(2)], {
  stdio: 'inherit', env: {...process.env, EM_CONFIG: `${sdk}/.emscripten`},
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
