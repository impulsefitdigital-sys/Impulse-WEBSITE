/**
 * /sitemap.xml — généré à partir de la base (produits publiés, articles, réalisations, pages
 * de catégories et de gammes). Toujours à jour quand un produit est ajouté dans l'admin.
 * Mis en cache 1 h par Netlify (vidé aussi par /api/purge-content).
 * En cas d'erreur : le sitemap statique public/sitemap-fallback.xml est renvoyé.
 */
const env = (k) => (typeof Netlify !== "undefined" ? Netlify.env.get(k) : undefined) ?? process.env[k];
// même valeur que SITE_URL dans src/lib/seo-config.ts (variable Netlify SITE_URL_CANONIQUE pour la changer)
const SITE = (env("SITE_URL_CANONIQUE") || "https://www.impulsefitness.ma").replace(/\/$/, "");

const STATIC = [
  ["/", "1.0", "weekly"], ["/professionnel", "0.9", "weekly"], ["/residentiel", "0.9", "weekly"],
  ["/consulting", "0.8", "monthly"], ["/realisations", "0.7", "monthly"], ["/blog", "0.7", "weekly"],
  ["/a-propos", "0.6", "yearly"], ["/contact", "0.6", "yearly"], ["/devis", "0.5", "yearly"],
  ["/politique-de-confidentialite", "0.3", "yearly"],
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const day = (d) => (d ? String(d).slice(0, 10) : undefined);

const get = async (url, key, path) => {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) },
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
};

export default async (req) => {
  const url = env("VITE_SUPABASE_URL")?.replace(/\/$/, "");
  const key = env("VITE_SUPABASE_PUBLISHABLE_KEY");
  try {
    if (!url || !key) throw new Error("Supabase non configuré");
    const [products, posts, reals, cats, subs, ranges] = await Promise.all([
      get(url, key, "products?select=id,updated_at&is_published=eq.true&limit=5000"),
      get(url, key, "blog_posts?select=slug,updated_at,published_at&is_published=eq.true"),
      get(url, key, "realisations?select=slug,updated_at&is_active=eq.true"),
      get(url, key, "equipment_categories?select=slug,usage_type&is_active=eq.true"),
      get(url, key, "equipment_subcategories?select=slug,category_slug,usage_type&is_active=eq.true"),
      get(url, key, "product_ranges?select=code,usage_type,category,subcategory&is_active=eq.true"),
    ]);
    const urls = STATIC.map(([loc, priority, changefreq]) => ({ loc, priority, changefreq }));
    for (const c of cats) urls.push({ loc: `/${c.usage_type}/${c.slug}`, priority: "0.8", changefreq: "weekly" });
    for (const s of subs) urls.push({ loc: `/${s.usage_type}/${s.category_slug}/${s.slug}`, priority: "0.8", changefreq: "weekly" });
    const seen = new Set();
    for (const r of ranges) {
      const loc = `/${r.usage_type}/${r.category}/${r.subcategory}/${String(r.code).toLowerCase()}`;
      if (!seen.has(loc)) { seen.add(loc); urls.push({ loc, priority: "0.7", changefreq: "weekly" }); }
    }
    for (const p of products) urls.push({ loc: `/produit/${p.id}`, lastmod: day(p.updated_at), priority: "0.7", changefreq: "monthly" });
    for (const b of posts) urls.push({ loc: `/blog/${b.slug}`, lastmod: day(b.updated_at || b.published_at), priority: "0.6", changefreq: "monthly" });
    for (const r of reals) urls.push({ loc: `/realisations/${r.slug}`, lastmod: day(r.updated_at), priority: "0.6", changefreq: "monthly" });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${esc(SITE + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
      .join("\n")}\n</urlset>\n`;
    return new Response(xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
        "netlify-cdn-cache-control": "public, durable, s-maxage=3600, stale-while-revalidate=86400",
        "netlify-cache-tag": "impulse-content",
      },
    });
  } catch {
    const res = await fetch(new URL("/sitemap-fallback.xml", req.url));
    return new Response(await res.text(), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store" } });
  }
};
