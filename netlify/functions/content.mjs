/**
 * /api/content — tout le contenu PUBLIC du site en un seul fichier JSON, mis en cache par Netlify.
 *
 * Pourquoi : chaque visite interrogeait directement Supabase (≈ 635 Ko rien que pour les produits),
 * ce qui épuisait la bande passante du plan gratuit. Ici, Supabase n'est lu qu'au plus une fois
 * toutes les 5 minutes ; tous les visiteurs reçoivent la copie servie par le CDN de Netlify.
 * Une modification faite dans l'admin apparaît donc sur le site en moins de 5 minutes.
 *
 * Lecture avec la clé publique : les règles RLS de Supabase s'appliquent, donc seules les lignes
 * publiques (produits publiés, éléments actifs…) sont renvoyées — exactement ce qu'un visiteur voit.
 */

// tables lues par les pages publiques (jamais les demandes, la newsletter, les stats…)
const TABLES = [
  "about_sections", "blog_posts", "category_cards", "consulting_services", "contact_settings",
  "equipment_categories", "equipment_subcategories", "faqs", "hero_slides", "home_sections",
  "product_images", "product_ranges", "products", "realisation_images", "realisations", "testimonials",
];
const PAGE = 1000; // limite par requête de l'API Supabase

const env = (k) => (typeof Netlify !== "undefined" ? Netlify.env.get(k) : undefined) ?? process.env[k];

const fetchTable = async (url, key, table) => {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: key,
        ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}), // ancienne clé « anon »
        Range: `${from}-${from + PAGE - 1}`,
        "Range-Unit": "items",
      },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
};

export default async () => {
  const url = env("VITE_SUPABASE_URL")?.replace(/\/$/, "");
  const key = env("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "Supabase non configuré" }), {
      status: 503, headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
  try {
    const entries = await Promise.all(TABLES.map(async (t) => [t, await fetchTable(url, key, t)]));
    const body = JSON.stringify({ generated_at: new Date().toISOString(), tables: Object.fromEntries(entries) });
    return new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        // navigateur : 2 min ; CDN Netlify (partagé entre tous les visiteurs) : 5 min, puis ancienne
        // copie servie pendant le rafraîchissement en arrière-plan (jamais de visiteur qui attend)
        "cache-control": "public, max-age=120",
        "netlify-cdn-cache-control": "public, durable, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    // pas de mise en cache d'une erreur : le site bascule alors sur une lecture directe
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 502, headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
};
