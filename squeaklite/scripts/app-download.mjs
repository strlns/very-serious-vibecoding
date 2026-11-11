import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Serve the existing portable artifact without copying it into dist/ or
// letting Vite transform its HTML. Works in development and local preview.
export function appDownloadPlugin() {
  let artifact;
  const install = server => {
    server.middlewares.use((request, response, next) => {
      const path = new URL(request.url || '/', 'http://localhost').pathname;
      if (!path.endsWith('/dist-singlefile/index.html') || !['GET','HEAD'].includes(request.method)) return next();
      readFile(artifact).then(bytes => {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.setHeader('Content-Length', bytes.length);
        response.setHeader('Cache-Control', 'no-cache');
        response.end(request.method === 'HEAD' ? undefined : bytes);
      }).catch(() => {
        response.statusCode = 404;
        response.end('Single-file build not found.');
      });
    });
  };
  return {
    name: 'squeaklite-app-download',
    configResolved(config) { artifact = resolve(config.root, 'dist-singlefile/index.html'); },
    configureServer: install,
    configurePreviewServer: install,
  };
}
