// Builds the static site into dist/ for Vercel (or any static host).
//
//   web/*                      -> dist/*
//   exceljs.min.js             -> dist/vendor/exceljs.min.js  (served from our own origin)
//   web/bookmarklet.js         -> dist/bookmarklet-source.js  (minified, exported as a string)
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

// A bookmarklet is a javascript: URL, so it has to be one compact expression,
// and it must evaluate to undefined or the browser replaces the page with the
// result. Hence no negate_iife and the leading void.
// The app page swaps __APP_ORIGIN__ for its own origin at runtime, so the same
// build works on preview URLs, production, or a custom domain.
const source = await readFile(join(web, "bookmarklet.js"), "utf8");
const minified = await minify(source, {
  compress: { passes: 2, negate_iife: false },
  mangle: true,
  format: { comments: false },
});
const code = `void ${minified.code}`;
if (!code.includes("__APP_ORIGIN__")) {
  throw new Error("bookmarklet lost its __APP_ORIGIN__ placeholder during minification");
}
await writeFile(
  join(dist, "bookmarklet-source.js"),
  `export const BOOKMARKLET_SOURCE = ${JSON.stringify(code)};\n`,
);

console.log(`Built dist/ (bookmarklet is ${code.length} characters)`);
