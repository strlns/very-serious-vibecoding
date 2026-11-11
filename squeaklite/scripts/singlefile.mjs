import { readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, ".."),
  dir = resolve(root, "dist-singlefile");
let html = await readFile(resolve(dir, "index.html"), "utf8");
for (const match of [
  ...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g),
]) {
  const code = await readFile(resolve(dir, match[1]), "utf8");
  if (/\bimport\s*(?:\(|[^;]+?from\s*['"])/.test(code))
    throw new Error("Standalone build contains unresolved imports");
  html = html.replace(
    match[0],
    () =>
      `<script type="module">${code.replaceAll("</script", "<\\/script")}</script>`,
  );
}
for (const match of [...html.matchAll(/<link\b[^>]*href="([^"]+)"[^>]*>/g)]) {
  if (!match[0].includes("stylesheet")) continue;
  const css = await readFile(resolve(dir, match[1]), "utf8");
  html = html.replace(
    match[0],
    () => `<style>${css.replaceAll("</style", "<\\/style")}</style>`,
  );
}
// The standalone output directory must also be directly usable via file://,
// rather than exposing Vite's intermediate page with external module imports.
await writeFile(resolve(dir, "index.html"), html);
await rm(resolve(dir, "assets"), { recursive: true, force: true });
console.log(
  "Created dist-singlefile/index.html · " +
    (Buffer.byteLength(html) / 1024 / 1024).toFixed(2) +
    " MiB · self-contained",
);
