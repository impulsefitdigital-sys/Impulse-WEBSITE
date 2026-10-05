# Impulse Fitness Maroc — site web

> Contexte, audit et plan de migration : [`docs/HANDOFF.md`](docs/HANDOFF.md) · Règles pour Claude Code : [`CLAUDE.md`](CLAUDE.md)
> Restauration de la base : [`supabase/restauration/README.md`](supabase/restauration/README.md)

Site vitrine + catalogue (≈200 produits) + blog + back-office d'administration.
Repris de l'ancienne agence (généré avec Lovable, hébergé sur Vercel + Supabase)
et en cours d'adaptation à l'écosystème DMC **GitHub → Netlify → Supabase**
(nouveau projet Supabase au nom du client).

## Architecture en 30 secondes

```
            ┌──────────────── ce dépôt (React + Vite) ────────────────┐
Visiteur →  │  pages publiques   /  /professionnel  /produit/:id  /blog │
            │  back-office       /login  →  /admin                      │
            └───────────────┬───────────────────────────────────────────┘
                            │ toutes les lectures / écritures passent par
                            ▼ src/integrations/supabase/client.ts
          ┌─────────────────┴──────────────────┐
          │ MODE DÉMO (aujourd'hui)            │  → src/integrations/demo/
          │ Supabase du client (cible)         │  → clés VITE_SUPABASE_*
          └────────────────────────────────────┘
```

- **Le code** (pages, design, back-office) est dans ce dépôt.
- **Le contenu** (produits, textes, photos, articles) n'est PAS dans le code :
  il vit dans une base de données. L'admin `/admin` modifie cette base,
  sans toucher au code.

## Démarrer en local

```bash
npm install
npm run dev        # http://localhost:8080
```

Sans fichier `.env`, le site démarre en **mode démo** : données de la sauvegarde
du 24/09/2026 (`src/integrations/demo/data.json`) et images dans `public/storage/`.
Admin : `/login`, n'importe quel email / mot de passe. Les modifications faites
dans l'admin en mode démo sont perdues au rechargement.

## Déployer

Netlify lit `netlify.toml` (build `npm run build`, dossier `dist`).
Chaque `git push` sur `main` redéploie le site.

## Qui modifie quoi

| Demande du client | Où ça se fait | Déploiement |
|---|---|---|
| Changer une photo, un prix, un texte produit, un article, une FAQ, le carrousel, les coordonnées | Back-office `/admin` (le client ou nous) | Immédiat, aucun code |
| Ajouter / masquer un produit, une catégorie, une réalisation | Back-office `/admin` | Immédiat |
| Nouvelle page, nouvelle section, changement de mise en page / design | Code (`src/pages`, `src/components`) → branche → PR | Aperçu Netlify, puis fusion sur `main` |

Nouvelle page = créer `src/pages/MaPage.tsx` + ajouter la route dans `src/App.tsx`
(+ le lien dans `src/components/Navbar.tsx` / `Footer.tsx`, et l'URL dans `public/sitemap.xml`).

## Structure utile

```
src/pages/               une page = un fichier (Index = accueil)
src/components/          blocs réutilisables (Navbar, Footer, HeroCarousel…)
src/components/admin/    écrans du back-office
src/components/ui/       composants de base (shadcn/ui) — rarement à modifier
src/integrations/        accès aux données (démo / Supabase)
src/lib/seo-config.ts    domaine, coordonnées, SEO global
public/storage/          images du mode démo (copie de l'ancien stockage)
supabase/migrations/     schéma de la base (+ correctif sécurité du 29/09/2026)
supabase/restauration/   procédure et scripts SQL pour le projet du client
```

## Scripts

- `npm run build` — build de production (utilisé par Netlify)
- `node --env-file=.env.restauration scripts/upload-storage.mjs` — envoie les images vers le Storage du client (une fois)
- `npm run build:seo` — build + sitemap + pré-rendu (nécessite Chrome en local, optionnel)
- `npm run lint`, `npm test`
