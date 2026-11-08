import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "#database-worker": fileURLToPath(
        new URL(
          mode === "standalone"
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
    outDir: mode === "standalone" ? "build-single" : "dist",
    assetsInlineLimit: mode === "standalone" ? Infinity : 4096,
    chunkSizeWarningLimit: 1800,
  },
}));
