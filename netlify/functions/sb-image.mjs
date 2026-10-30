/**
 * /img/sb/<bucket>/<chemin> — images publiques de Supabase Storage servies par Netlify.
 *
 * Pourquoi : les images envoyées depuis l'admin (carrousel, catégories, gammes…) étaient téléchargées
 * directement chez Supabase par chaque visiteur, ce qui use la bande passante du plan gratuit
 * (5 Go / mois). Ici, Supabase n'est lu qu'une fois par image : la copie est ensuite gardée par le
 * CDN de Netlify (les noms de fichiers envoyés par l'admin sont uniques, donc jamais modifiés).
 * /api/content remplace automatiquement les adresses Supabase par /img/sb/….
 */
const env = (k) => (typeof Netlify !== "undefined" ? Netlify.env.get(k) : undefined) ?? process.env[k];
// chemin relatif « bucket/dossier/fichier.ext » : pas de « .. », pas de caractères de contrôle
const SAFE = /^[^/\\\0-\x1f][^\\\0-\x1f]*\.(webp|avif|jpe?g|png|gif|svg)$/i;
const badSegment = (path) => path.split("/").some((s) => s === "" || s === "." || s === "..");

export default async (req) => {
  const base = env("VITE_SUPABASE_URL")?.replace(/\/$/, "");
  let path = "";
  try {
    path = decodeURIComponent(new URL(req.url).pathname)
      .replace(/^\/img\/sb\//, "")
      .replace(/^\/\.netlify\/functions\/sb-image\/?/, "");
  } catch { /* adresse mal encodée : 404 ci-dessous */ }
  if (!base || !SAFE.test(path) || badSegment(path)) {
    return new Response("Image introuvable", { status: 404, headers: { "cache-control": "no-store" } });
  }
  const res = await fetch(`${base}/storage/v1/object/public/${path.split("/").map(encodeURIComponent).join("/")}`);
  if (!res.ok) {
    return new Response("Image introuvable", { status: res.status === 404 ? 404 : 502, headers: { "cache-control": "no-store" } });
  }
  return new Response(res.body, {
    headers: {
      "content-type": res.headers.get("content-type") || "image/webp",
      // navigateur : 30 jours ; CDN Netlify (partagé) : 1 an
      "cache-control": "public, max-age=2592000",
      "netlify-cdn-cache-control": "public, durable, s-maxage=31536000, immutable",
      // une image (même SVG) ouverte seule ne peut exécuter aucun script
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
};

export const config = { path: "/img/sb/*" };
