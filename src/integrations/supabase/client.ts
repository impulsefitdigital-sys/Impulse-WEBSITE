import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { demoClient, snapshotQuery } from '../demo/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Source des données du site.
 * - Clés absentes, ou VITE_DATA_MODE=demo -> mode démo local (src/integrations/demo),
 *   alimenté par l'export de la base. Permet de voir le site sans backend.
 * - Clés présentes -> Supabase, avec économie de bande passante (plan gratuit) :
 *     • pages publiques : lectures du contenu dans la copie /api/content, mise en cache 5 min
 *       par Netlify (netlify/functions/content.mjs) — Supabase n'est presque plus sollicité ;
 *     • admin, connexion, formulaires, statistiques, fonctions (rpc) : Supabase en direct.
 */
export const IS_DEMO =
  import.meta.env.VITE_DATA_MODE === 'demo' || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY;

// tables du contenu public servies par /api/content (même liste que la fonction Netlify)
const CACHED_TABLES = new Set([
  'about_sections', 'blog_posts', 'category_cards', 'consulting_services', 'contact_settings',
  'equipment_categories', 'equipment_subcategories', 'faqs', 'hero_slides', 'home_sections',
  'product_images', 'product_ranges', 'products', 'realisation_images', 'realisations', 'testimonials',
]);

type Rows = Record<string, Record<string, unknown>[]>;
const BUST_KEY = 'impulse-content-modifie';

const createLiveClient = () => {
  const live = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  // copie publique : chargée une fois par page ; si /api/content est indisponible (dév. local,
  // fonction en erreur), lecture directe des mêmes tables dans Supabase
  let snapshot: Promise<Rows> | null = null;
  const loadSnapshot = (): Promise<Rows> => {
    // juste après une modification admin, ne pas reprendre la copie gardée par le navigateur
    let fresh = false;
    try { fresh = Date.now() - Number(localStorage.getItem(BUST_KEY) || 0) < 10 * 60 * 1000; } catch { /* stockage indisponible */ }
    snapshot ??= fetch('/api/content', { headers: { accept: 'application/json' }, cache: fresh ? 'reload' : 'default' })
      .then(async (res) => {
        const type = res.headers.get('content-type') || '';
        if (!res.ok || !type.includes('json')) throw new Error(`HTTP ${res.status}`);
        return ((await res.json()) as { tables: Rows }).tables;
      })
      .catch(async () => {
        const entries = await Promise.all([...CACHED_TABLES].map(async (t) => {
          const { data, error } = await live.from(t as 'products').select('*').range(0, 4999);
          if (error) throw error;
          return [t, (data || []) as Record<string, unknown>[]] as const;
        }));
        return Object.fromEntries(entries);
      });
    return snapshot;
  };

  // l'admin et la page de connexion lisent toujours les données en direct
  const isBackOffice = () => typeof window !== 'undefined' && /^\/(admin|login)/.test(window.location.pathname);

  // Après une modification admin d'une table publique : vider le cache Netlify de /api/content
  // (fonction /api/purge-content, réservée à l'admin) et oublier la copie de cet onglet.
  // Regroupé : plusieurs enregistrements rapprochés = un seul vidage.
  let purgeTimer: ReturnType<typeof setTimeout> | undefined;
  const schedulePurge = () => {
    snapshot = null;
    try { localStorage.setItem(BUST_KEY, String(Date.now())); } catch { /* stockage indisponible */ }
    clearTimeout(purgeTimer);
    purgeTimer = setTimeout(async () => {
      try {
        const { data } = await live.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        await fetch('/api/purge-content', { method: 'POST', headers: { authorization: `Bearer ${token}` } });
      } catch { /* sans gravité : le cache expire seul en 5 min */ }
    }, 1500);
  };
  const WRITES = new Set(['insert', 'update', 'upsert', 'delete']);
  const watchWrites = <T extends object>(builder: T): T =>
    new Proxy(builder, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof prop === 'string' && WRITES.has(prop) && typeof value === 'function') {
          return (...args: unknown[]) => {
            const query = (value as (...a: unknown[]) => PromiseLike<{ error: unknown }>).apply(target, args);
            const then = query.then.bind(query);
            // le vidage part quand la requête a réussi (les filtres .eq() renvoient le même objet)
            (query as { then: unknown }).then = (ok?: (v: { error: unknown }) => unknown, ko?: (e: unknown) => unknown) =>
              then((res) => { if (!res.error) schedulePurge(); return ok ? ok(res) : res; }, ko);
            return query;
          };
        }
        return value;
      },
    });

  return new Proxy(live, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string) =>
          CACHED_TABLES.has(table) && !isBackOffice()
            ? snapshotQuery(table, loadSnapshot as () => Promise<Record<string, never[]>>)
            : CACHED_TABLES.has(table)
              ? watchWrites(target.from(table as 'products'))
              : target.from(table as 'products');
      }
      return Reflect.get(target, prop, receiver);
    },
  });
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase: SupabaseClient<Database> = IS_DEMO
  ? (demoClient as unknown as SupabaseClient<Database>)
  : (createLiveClient() as unknown as SupabaseClient<Database>);
