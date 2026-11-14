import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { appDownloadPlugin } from "./scripts/app-download.mjs";
import { apacheCachePlugin } from "./scripts/apache-cache.mjs";
import { buildVersion } from "./scripts/build-version.mjs";
import { fileURLToPath } from "node:url";
export default defineConfig(async ({ mode }) => ({
  define: {
    "import.meta.env.VITE_APP_BUILD": JSON.stringify(
      await buildVersion(fileURLToPath(new URL(".", import.meta.url))),
    ),
  },
  plugins: [
    react(),
    appDownloadPlugin(),
    ...(mode === "singlefile" ? [] : [apacheCachePlugin()]),
  ],
  base: "./",
  resolve: {
    alias: {
      "#database-worker": fileURLToPath(
        new URL(
          mode === "singlefile"
            ? "./src/worker-inline.js"
            : "./src/worker-static.js",
          import.meta.url,
        ),
      ),
    },
  },
  worker: { format: "es" },
  build: {
    target: "es2022",
    outDir: mode === "singlefile" ? "dist-singlefile" : "dist",
    assetsInlineLimit: mode === "singlefile" ? Infinity : 4096,
    chunkSizeWarningLimit: 1800,
  },
}));
