import {defineConfig} from 'vite';
import {cpSync, existsSync, mkdirSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import './scripts/verify-vendor.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));

// Keep optional presets outside the module graph. Preserve licenses, documentation,
// and the legacy redirect in a complete, independently serveable distribution.
function copyDistributionFiles() {
  let outDir;
  return {
    name: 'avs-distribution-files',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = readdirSync(root).filter(name => /^LICENSE.*\.txt$/.test(name));
      files.push('README.md', 'CREDITS.txt', 'SOURCE-NOTICE.txt', 'THIRD-PARTY-NOTICES.txt',
        'app', 'docs', 'presets');
      for (const name of files) {
        const source = resolve(root, name);
        if (existsSync(source)) cpSync(source, resolve(outDir, name), {recursive: true});
      }
      cpSync(resolve(root, 'build/native/provenance.json'), resolve(outDir, 'renderer-provenance.json'));
      mkdirSync(resolve(outDir, 'native'), {recursive: true});
      cpSync(resolve(root, 'native/README.md'), resolve(outDir, 'native/README.md'));
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  server: {host: '127.0.0.1', port: 8080, strictPort: true},
  preview: {host: '127.0.0.1', port: 8080, strictPort: true},
  build: {target: 'es2022', assetsInlineLimit: 0},
  worker: {format: 'es'},
  plugins: [copyDistributionFiles()],
});
