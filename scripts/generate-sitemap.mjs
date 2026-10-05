// Generates public/sitemap.xml from the newest data backup and injects a
// Sitemap: line into public/robots.txt. Re-run after content changes.
//
//   node scripts/generate-sitemap.mjs
//
// SITE_URL is read from src/lib/seo-config.ts so there is a single source.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- Resolve SITE_URL from seo-config (fallback if not found) ---
function siteUrl() {
  try {
    const cfg = readFileSync(resolve(ROOT, "src/lib/seo-config.ts"), "utf8");
    const m = cfg.match(/SITE_URL\s*=\s*"([^"]+)"/);
    if (m) return m[1].replace(/\/$/, "");
  } catch {}
  return "https://www.impulsefitness.ma";
}
const BASE = siteUrl();

// --- Locate newest backup dir ---
function newestBackup() {
  const base = resolve(ROOT, "backup");
  if (!existsSync(base)) return null;
  const dirs = readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  return dirs.length ? resolve(base, dirs[dirs.length - 1]) : null;
}
const backupDir = newestBackup();
const readTable = (name) => {
  if (!backupDir) return [];
  const f = join(backupDir, `${name}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : [];
};

// --- Static routes (indexable only) ---
const staticRoutes = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/professionnel", priority: "0.9", changefreq: "weekly" },
  { loc: "/residentiel", priority: "0.9", changefreq: "weekly" },
  { loc: "/consulting", priority: "0.8", changefreq: "monthly" },
  { loc: "/realisations", priority: "0.7", changefreq: "monthly" },
  { loc: "/a-propos", priority: "0.6", changefreq: "yearly" },
  { loc: "/blog", priority: "0.7", changefreq: "weekly" },
  { loc: "/contact", priority: "0.6", changefreq: "yearly" },
  { loc: "/politique-de-confidentialite", priority: "0.3", changefreq: "yearly" },
];

// Garde-fou : sans données de sauvegarde JSON, on ne touche pas au sitemap existant
// (sinon il serait écrasé par une version réduite aux seules pages statiques).
if (!["products", "blog_posts"].some((t) => readTable(t).length)) {
  console.log("⚠️  Aucune donnée JSON trouvée dans backup/ — sitemap.xml conservé tel quel.");
  process.exit(0);
}

const urls = [...staticRoutes];

// Products
for (const p of readTable("products")) {
  if (p.is_published) urls.push({ loc: `/produit/${p.id}`, priority: "0.8", changefreq: "monthly", lastmod: p.updated_at });
}
// Equipment categories -> /{usage_type}/{slug}
for (const c of readTable("equipment_categories")) {
  if (c.is_active && c.usage_type && c.slug) urls.push({ loc: `/${c.usage_type}/${c.slug}`, priority: "0.8", changefreq: "monthly", lastmod: c.updated_at });
}
// Subcategories -> /{usage_type}/{category_slug}/{slug}
for (const s of readTable("equipment_subcategories")) {
  if (s.is_active && s.usage_type && s.category_slug && s.slug) urls.push({ loc: `/${s.usage_type}/${s.category_slug}/${s.slug}`, priority: "0.7", changefreq: "monthly", lastmod: s.updated_at });
}
// Blog posts
for (const b of readTable("blog_posts")) {
  if (b.is_published && b.slug) urls.push({ loc: `/blog/${b.slug}`, priority: "0.6", changefreq: "monthly", lastmod: b.updated_at || b.published_at });
}

// --- De-dup by loc ---
const seen = new Set();
const unique = urls.filter((u) => (seen.has(u.loc) ? false : (seen.add(u.loc), true)));

// --- Build XML ---
const iso = (d) => {
  if (!d) return null;
  const s = String(d);
  return s.length >= 10 ? s.slice(0, 10) : null;
};
const body = unique
  .map((u) => {
    const lastmod = iso(u.lastmod);
    return `  <url>
    <loc>${BASE}${u.loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
  })
  .join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
writeFileSync(resolve(ROOT, "public/sitemap.xml"), xml);

// --- Ensure robots.txt has the Sitemap line ---
const robotsPath = resolve(ROOT, "public/robots.txt");
let robots = existsSync(robotsPath) ? readFileSync(robotsPath, "utf8") : "User-agent: *\nAllow: /\n";
robots = robots.replace(/\n?Sitemap:.*$/gm, "").trimEnd();
robots += `\n\nSitemap: ${BASE}/sitemap.xml\n`;
writeFileSync(robotsPath, robots);

console.log(`✅ sitemap.xml written with ${unique.length} URLs (base ${BASE})`);
console.log(`   static: ${staticRoutes.length} | products/categories/blog: ${unique.length - staticRoutes.length}`);
console.log(`✅ robots.txt updated with Sitemap directive`);
