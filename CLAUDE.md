# CLAUDE.md — Impulse Fitness Maroc

Contexte complet et historique : **`docs/HANDOFF.md`** (à lire en premier).

## Le projet
Site vitrine + catalogue (≈200 produits d'équipement fitness) + blog + back-office
pour **Impulse Fitness Maroc** (distributeur Impulse, showroom Bouskoura, Casablanca).
Client de l'agence **DMC – Design, Managing & Communication** (Casablanca).
Repris d'une autre agence qui l'avait généré avec **Lovable** (Vercel + Supabase).

**Objectif :** écosystème standard de DMC — **GitHub → Netlify → Supabase**, avec un
**nouveau projet Supabase au nom du client** (l'ancien `cxeafynonjezukddtpxg` appartient
à l'ancienne agence). Extensions possibles : Google Sheets, Calendly.
Décision du 29/09/2026 : on reste sur Supabase (le plan Firebase est abandonné).

## Stack
- React 18 + Vite 5 + TypeScript, React Router 6, TanStack Query 5
- Tailwind 3 + shadcn/ui (`src/components/ui`, ne pas retoucher sans raison)
- react-helmet-async (SEO), framer-motion, react-simple-maps
- Données : `src/integrations/supabase/client.ts` renvoie soit le **client démo local**
  (`src/integrations/demo/`, si pas de clés), soit Supabase.

## Commandes
```bash
npm install
npm run dev      # http://localhost:8080 — sans .env = mode démo
npm run build    # sortie dist/ (utilisé par Netlify, cf. netlify.toml)
npm run lint
npx tsc -p tsconfig.app.json --noEmit
```

## Carte du code
- `src/pages/` — une page = un fichier ; routes dans `src/App.tsx`
- `src/components/` — sections publiques (Navbar, Footer, HeroCarousel, ProductGrid…)
- `src/components/admin/` — écrans du back-office (`/login` → `/admin`), menu en 4 espaces
  défini dans `src/pages/Admin.tsx` (Commercial, Data, Contenu du site, Paramètres)
- `src/lib/analytics.ts` + `src/lib/consent.ts` — mesure d'audience maison + consentement cookies
- `src/lib/requests.ts` — statuts des demandes, export CSV, PDF récapitulatif
- `integrations/google-sheets/` — script Apps Script de l'archive des demandes
- `src/hooks/useAuth.tsx` — session + rôle admin (table `user_roles`, fonction `has_role`)
- `src/integrations/demo/` — client démo (imite l'API Supabase) + `data.json`
- `src/integrations/supabase/types.ts` — types générés de la base
- `src/lib/seo-config.ts` — domaine, coordonnées, JSON-LD
- `public/storage/` — 1 068 images de l'ancien stockage (mode démo + source de l'import)
- `supabase/migrations/` — schéma ; toute évolution de la base = nouvelle migration datée
- `supabase/restauration/` — procédure de mise en place du projet du client
- `scripts/upload-storage.mjs` — envoi des images vers le Storage du client
- `backup/` — **gitignoré**, données privées (export JSON, SQL) — voir HANDOFF

## Règles
- Langue : interface, contenus, commits et docs **en français**.
- **Jamais** de données personnelles dans Git ni sur Netlify : `backup/`,
  `contact_requests`, `newsletter_subscribers` restent hors dépôt.
- Jamais de secrets dans le code. `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
  sont publiques (navigateur) ; la sécurité repose sur les **règles RLS**.
  La clé **service_role** ne va jamais en `VITE_*` ni sur Netlify (seulement
  `.env.restauration`, local, gitignoré).
- Toute écriture en base doit être protégée par `public.has_role(auth.uid(), 'admin')`
  (tables ET buckets Storage). Inscriptions publiques désactivées.
- Ne pas casser le mode démo : il sert d'aperçu (PR Netlify) et de filet de sécurité.
- Le contenu (textes, photos, prix) se gère dans l'admin, pas en dur dans le code.
- Ne pas utiliser `npm run build:seo` sur Netlify (pré-rendu nécessite Chrome local).
- Vérifier `tsc` + `npm run build` avant chaque commit ; travailler par branches/PR.
