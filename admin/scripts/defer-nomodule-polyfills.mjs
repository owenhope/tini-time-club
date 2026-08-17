import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const outputDirs = [
  join(process.cwd(), ".next/server"),
  join(process.cwd(), ".vercel/output"),
  "/vercel/output",
];
const noModuleScriptPattern =
  /<script(?=[^>]*\bnoModule="")(?=[^>]*\bsrc="\/_next\/static\/chunks\/[^"]+\.js[^"]*")(?![^>]*\bdefer\b)([^>]*)>/g;

async function getHtmlFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = error.code;
      if (code === "ENOENT") return [];
    }

    throw error;
  }

  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return getHtmlFiles(path);
      }
      return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
    })
  );

  return files.flat();
}

const htmlFiles = (await Promise.all(outputDirs.map(getHtmlFiles))).flat();
let updatedCount = 0;

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const patched = html.replace(noModuleScriptPattern, "<script defer$1>");

  if (patched !== html) {
    await writeFile(file, patched);
    updatedCount += 1;
  }
}

console.log(
  `Deferred nomodule polyfill scripts in ${updatedCount} HTML files.`
);
