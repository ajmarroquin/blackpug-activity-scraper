// Builds the static site into dist/ for Vercel (or any static host).
//
//   web/*                      -> dist/*
//   exceljs.min.js             -> dist/vendor/exceljs.min.js  (served from our own origin)
//   web/bookmarklet.js         -> dist/bookmarklet-source.js  (minified function, exported as a string)
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "terser";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "web");
const dist = join(root, "dist");
const require = createRequire(import.meta.url);

await rm(dist, { recursive: true, force: true });
await cp(web, dist, {
  recursive: true,
  filter: (src) => !src.endsWith("bookmarklet.js"),
});

await mkdir(join(dist, "vendor"), { recursive: true });
await cp(
  require.resolve("exceljs/dist/exceljs.min.js"),
  join(dist, "vendor", "exceljs.min.js"),
);

// The bookmarklet ships as a minified function declaration. The app page
// calls it with its own URL and origin at runtime (see app.js), so the same
// build works locally, on GitHub Pages, on Vercel, or on a custom domain.
// Top-level names and function arguments survive minification by default.
const source = await readFile(join(web, "bookmarklet.js"), "utf8");
const { code } = await minify(source, {
  compress: { passes: 2 },
  mangle: true,
  format: { comments: false },
});
if (!/^function blackpugExport\([a-z],[a-z]\)\{/.test(code) || !code.endsWith("}")) {
  throw new Error(`unexpected minified bookmarklet shape: ${code.slice(0, 60)}…`);
}
await writeFile(
  join(dist, "bookmarklet-source.js"),
  `export const BOOKMARKLET_FUNCTION = ${JSON.stringify(code)};\n`,
);

console.log(`Built dist/ (bookmarklet is ${code.length} characters)`);
