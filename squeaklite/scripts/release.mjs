import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { zipSync } from "fflate";
const root = resolve(import.meta.dirname, ".."),
  files = {};
async function add(path) {
  const full = resolve(root, path),
    entries = await readdir(full, { withFileTypes: true });
  for (const entry of entries) {
    const p = path + "/" + entry.name;
    if (entry.isDirectory()) await add(p);
    else if (entry.isFile())
      files["squeaklite/" + p] = new Uint8Array(
        await readFile(resolve(root, p)),
      );
  }
}
for (const dir of [
  "src",
  "scripts",
  "tests",
  "tests-ui",
  "tests-built",
  "licenses",
  "dist",
])
  await add(dir);
for (const path of [
  "tsconfig.json",
  ".nvmrc",
  "package.json",
  "package-lock.json",
  "vite.config.js",
  "index.html",
  "README.md",
  "ROADMAP.md",
  "CHANGELOG.md",
  "LICENSE",
  "THIRD-PARTY-NOTICES.txt",
  ".gitignore",
  ".npmrc",
  "releases/squeaklite.html",
])
  files["squeaklite/" + path] = new Uint8Array(
    await readFile(resolve(root, path)),
  );
await mkdir(resolve(root, "releases"), { recursive: true });
const output = resolve(root, "releases/squeaklite-source.zip");
await writeFile(output, zipSync(files, { level: 6 }));
console.log(
  relative(root, output) +
    " · " +
    Object.keys(files).length +
    " files · source, tests and both builds",
);
