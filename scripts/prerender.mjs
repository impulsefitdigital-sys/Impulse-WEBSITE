// Post-build pre-rendering for the main static pages.
// Run AFTER `vite build`:  node scripts/prerender.mjs
//
// It serves ./dist locally (with SPA fallback), loads each route in headless
// Chromium so React + Helmet + Supabase data render, then writes the fully
// rendered HTML to dist/<route>/index.html. Visitors and crawlers hitting
// view-source now get real semantic HTML instead of an empty shell.
//
// Only STATIC landing pages are prerendered here. Dynamic pages (products,
// blog posts, categories) still render client-side and rely on Google's JS
// rendering until the database migration is finalised.

import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const PORT = 5055;

const ROUTES = [
  "/",
  "/professionnel",
  "/residentiel",
  "/consulting",
  "/realisations",
  "/a-propos",
  "/blog",
  "/contact",
  "/politique-de-confidentialite",
];

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2",
  ".txt": "text/plain", ".xml": "application/xml",
};

if (!existsSync(join(DIST, "index.html"))) {
  console.error("❌ dist/index.html not found. Run `npm run build` first.");
  process.exit(1);
}

// --- Tiny static server with SPA fallback to index.html ---
const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = join(DIST, urlPath);
    if (urlPath.endsWith("/")) filePath = join(filePath, "index.html");
    if (existsSync(filePath) && extname(filePath)) {
      const data = await readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
      return res.end(data);
    }
    // SPA fallback
    const html = await readFile(join(DIST, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  } catch (e) {
    res.writeHead(500);
    res.end("err");
  }
});

await new Promise((r) => server.listen(PORT, r));
console.log(`🌐 Serving dist/ on http://localhost:${PORT}`);

// Prefer an already-installed browser (Chrome/Edge) so no Chromium download is
// required. Override with PUPPETEER_EXECUTABLE_PATH if needed.
function findBrowser() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return candidates.find((p) => existsSync(p));
}
const executablePath = findBrowser();
if (executablePath) console.log(`🧭 Using browser: ${executablePath}`);

const browser = await puppeteer.launch({
  headless: "new",
  executablePath, // undefined => puppeteer's bundled Chromium (if present)
  args: ["--no-sandbox"],
});
let ok = 0;
try {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "networkidle0", timeout: 45000 });
    // Give React a beat to flush Helmet tags + any late renders.
    await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
    let html = await page.content();
    if (!html.startsWith("<!DOCTYPE") && !html.startsWith("<!doctype")) {
      html = "<!doctype html>\n" + html;
    }
    const outDir = route === "/" ? DIST : join(DIST, route);
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "index.html"), html);
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    console.log(`  ✅ ${route.padEnd(30)} → ${outDir.replace(ROOT, ".")}\\index.html  (“${title.slice(0, 45)}”)`);
    ok++;
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n📄 Prerendered ${ok}/${ROUTES.length} static routes into dist/.`);
