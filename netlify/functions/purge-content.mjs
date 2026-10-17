/**
 * /api/purge-content — vide le cache Netlify de /api/content (et du sitemap) juste après
 * une modification dans l'admin : le site public est à jour en quelques secondes au lieu
 * d'attendre jusqu'à 5 minutes.
 *
 * Sécurité : seul un compte admin peut l'appeler. Le navigateur envoie le jeton de session
 * Supabase ; on vérifie auprès de Supabase que ce compte a bien le rôle « admin ».
 */
import { purgeCache } from "@netlify/functions";

const env = (k) => (typeof Netlify !== "undefined" ? Netlify.env.get(k) : undefined) ?? process.env[k];
const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST uniquement" });
  const url = env("VITE_SUPABASE_URL")?.replace(/\/$/, "");
  const key = env("VITE_SUPABASE_PUBLISHABLE_KEY");
  const auth = req.headers.get("authorization") || "";
  if (!url || !key) return json(503, { error: "Supabase non configuré" });
  if (!/^Bearer\s+\S+/.test(auth)) return json(401, { error: "Connexion requise" });

  try {
    // 1) le jeton correspond-il à un utilisateur connecté ?
    const u = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization: auth } });
    if (!u.ok) return json(401, { error: "Session invalide" });
    const user = await u.json();
    // 2) cet utilisateur est-il admin ? (même fonction que les règles RLS)
    const r = await fetch(`${url}/rest/v1/rpc/has_role`, {
      method: "POST",
      headers: { apikey: key, authorization: auth, "content-type": "application/json" },
      body: JSON.stringify({ _user_id: user.id, _role: "admin" }),
    });
    if (!r.ok || (await r.json()) !== true) return json(403, { error: "Réservé à l'admin" });

    await purgeCache({ tags: ["impulse-content"] });
    return json(202, { ok: true });
  } catch (e) {
    return json(500, { error: String(e?.message || e) });
  }
};
