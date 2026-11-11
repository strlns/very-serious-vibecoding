import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {appDownloadPlugin} from "./scripts/app-download.mjs";
import { fileURLToPath } from "node:url";
export default defineConfig(({ mode }) => ({
  plugins: [react(), appDownloadPlugin()],
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
