import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// The portable build stays exactly one HTML file. The deployment script copies
// this policy beside it on Apache; the split build carries its own policy.
export function apacheCachePlugin() {
  let root;
  return {
    name: "squeaklite-apache-cache",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    async generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: ".htaccess",
        source: await readFile(
          resolve(root, "deployment/apache-cache.htaccess"),
        ),
      });
    },
  };
}
