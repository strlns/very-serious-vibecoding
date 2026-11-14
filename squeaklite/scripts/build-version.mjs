import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

// Shared by both Vite targets. Hash inputs rather than generated output to avoid
// a circular dependency when the portable HTML embeds its own download version.
export async function buildVersion(root) {
  const paths = [
    "index.html",
    "package.json",
    "package-lock.json",
    "vite.config.js",
  ];
  async function walk(directory) {
    for (const entry of await readdir(resolve(root, directory), {
      withFileTypes: true,
    })) {
      if (entry.name.startsWith(".")) continue;
      const path = directory + "/" + entry.name;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) paths.push(path);
    }
  }
  for (const directory of ["src", "scripts", "deployment"])
    await walk(directory);
  const hash = createHash("sha256");
  for (const path of paths.sort()) {
    hash
      .update(path)
      .update("\0")
      .update(await readFile(resolve(root, path)))
      .update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}
