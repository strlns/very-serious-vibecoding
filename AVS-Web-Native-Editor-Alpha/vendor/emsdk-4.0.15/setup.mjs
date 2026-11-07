import {cpSync, mkdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const sdk = fileURLToPath(new URL('../../.cache/emsdk/', import.meta.url));
mkdirSync(sdk, {recursive: true});
if (!existsSync(`${sdk}/emsdk.py`)) {
  cpSync(new URL('./upstream/', import.meta.url), sdk, {recursive: true});
}
for (const action of ['install', 'activate']) {
  const result = spawnSync(process.env.PYTHON || 'python3', [`${sdk}/emsdk.py`, action, '4.0.15'],
    {cwd: sdk, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
