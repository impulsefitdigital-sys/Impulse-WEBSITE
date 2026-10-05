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
    snapshot ??= fetch('/api/content', { headers: { accept: 'application/json' } })
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

  return new Proxy(live, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string) =>
          CACHED_TABLES.has(table) && !isBackOffice()
            ? snapshotQuery(table, loadSnapshot as () => Promise<Record<string, never[]>>)
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
