// Serves dist/ locally with the same headers vercel.json sets in production,
// so the Content-Security-Policy is exercised before deploying.
//   npm run serve            -> http://127.0.0.1:4173
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

export async function vercelHeaders() {
  const config = JSON.parse(await readFile(join(root, "vercel.json"), "utf8"));
  return Object.fromEntries(config.headers.flatMap((rule) => rule.headers.map((h) => [h.key, h.value])));
}

// base mounts dir under a subpath, the way GitHub Pages serves a project site
export function startServer({ dir, port = 0, headers = {}, base = "/" }) {
  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");
    if (!pathname.startsWith(base)) {
      res.writeHead(404, headers).end("Not found");
      return;
    }
    let file = normalize(join(dir, decodeURIComponent(pathname.slice(base.length))));
    if (!file.startsWith(dir)) {
      res.writeHead(403).end();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      const body = await readFile(file);
      res.writeHead(200, { ...headers, "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404, headers).end("Not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173);
  await startServer({ dir: join(root, "dist"), port, headers: await vercelHeaders() });
  console.log(`Serving dist/ at http://127.0.0.1:${port}`);
}
