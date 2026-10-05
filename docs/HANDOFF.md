# Passation — Impulse Fitness Maroc

> Document de reprise pour continuer le projet dans Claude Code.
> Rédigé le 29/09/2026 à partir du travail fait dans Cowork (27/09/2026).

## 1. Mise en situation

- **Agence :** DMC – Design, Managing & Communication (Casablanca). Interlocuteur : Adil.
- **Client :** Impulse Fitness Maroc — distributeur exclusif Impulse au Maroc,
  showroom centre commercial OLINO, Bouskoura. Domaine : `impulsefitness.ma`
  (registrar inconnu pour l'instant).
- **Historique :** une autre agence a créé le site avec **Lovable** (IA), hébergé
  sur **Vercel**, données sur **Supabase** (projet `cxeafynonjezukddtpxg`, pas au nom
  du client). Le client a récupéré le code source + une sauvegarde complète de la base.
- **Premier essai d'Adil :** publier le zip tel quel sur Netlify → page blanche.
- **Décision (mise à jour 29/09/2026) :** écosystème DMC — **GitHub + Netlify + Supabase**,
  avec un **nouveau projet Supabase au nom du client**. Le plan Firebase initial est
  abandonné : le code est déjà écrit pour Supabase et DMC maîtrise cet outil.

## 2. Audit du code reçu

**Verdict : code sain.** Compile, TypeScript sans erreur.

Pourquoi Netlify affichait une page blanche :
1. Le code source brut avait été publié (le navigateur ne lit pas `/src/main.tsx`) :
   il faut `npm run build` → `dist/`.
2. Les variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` manquaient
   → erreur `supabaseUrl is required` → page blanche.

Constats :
- **Tout le contenu est en base**, rien dans le code : 199 produits, 659 images de
  galerie, 50 gammes, 6 catégories / 22 sous-catégories, 3 slides, 4 cartes accueil,
  8 sections « à propos », 7 FAQ, 4 réalisations, 3 services consulting, 3 articles,
  1 témoignage, 20 réglages (coordonnées, réseaux, libellés de menu).
  1 068 images WebP (28 Mo).
- **Le back-office est dans le code** : `/login` → `/admin`, 14 écrans
  (`src/components/admin/`), auth email/mot de passe + rôle `admin` (table `user_roles`).
- **Sécurité (ancienne base)** : bucket `product-images` modifiable par tout
  utilisateur connecté, pas seulement l'admin ; Supabase autorise l'inscription
  publique par défaut. → **Corrigé** par la migration
  `20260929120000_securite_storage_admin.sql` + inscriptions à désactiver dans le projet.
- **Piège corrigé** : `scripts/generate-sitemap.mjs` écrasait le sitemap (238 URL)
  par 9 URL faute de données JSON → garde-fou ajouté.
- **SEO** : rendu 100 % côté client ; seules les pages statiques peuvent être
  pré-rendues (`scripts/prerender.mjs`, Windows + Chrome, optionnel).
- **Divers** : bundle principal lourd (~440 Ko), 3 vulnérabilités npm (1 haute),
  3 images de réalisations chargées depuis Unsplash, 2 images manquantes dans la
  sauvegarde (produit non publié « Butterfly IT9504-235-PL »).

## 3. Ce qui a déjà été fait (commit « Reprise du projet Impulse »)

- **Mode démo** `src/integrations/demo/client.ts` : imite la partie de l'API Supabase
  utilisée (`from/select/eq/neq/in/is/or(ilike)/order/limit/single/maybeSingle`,
  `insert/update/upsert/delete`, `auth`, `storage`) sur `data.json` (export de la base).
  - Lecture publique filtrée comme les politiques RLS (produits publiés, éléments actifs…).
  - Admin démo : n'importe quel email/mot de passe ; écritures en mémoire (perdues au rechargement).
  - Activé automatiquement si aucune clé Supabase, ou `VITE_DATA_MODE=demo`.
  - Bandeau « Mode démo » + `noindex` pour ne pas concurrencer le vrai site sur Google.
- Images copiées dans `public/storage/<bucket>/…`, URLs réécrites en `/storage/…`.
- `netlify.toml` (build `npm run build`, publish `dist`, SPA redirect, cache assets,
  `PUPPETEER_SKIP_DOWNLOAD`), `.gitignore` (exclut `.env`, `backup/`), `.env.example`, README.
- Suppression de `bun.lock(b)`, `vercel.json`, fichier orphelin.
- Testé en navigateur (Playwright) : accueil, catalogue, fiche produit, recherche,
  blog, réalisations, login, admin (changement de statut d'un produit) — OK.

### Modifications client du 30/09/2026 (PDF « ca.pdf »)
- Recherche : titre « Que cherchez-vous ? » centré. En-tête : texte et espacement +20 % sur grand écran,
  menu centré entre logo et boutons (plus de chevauchement), burger sous 1240 px.
- Musculation professionnelle : chaque sous-catégorie affiche des **cartes gamme** (IT95, IF93…),
  puis `/professionnel/musculation/<sous-cat>/<gamme>` liste les produits de la gamme.
  Nouvel écran **Admin → Gammes** (image, texte, ordre, visibilité). Migration `20260930100000`.
- 3 articles de blog SEO (migration `20260930100200`), liens internes `[texte](/chemin)` dans les articles.
- Liens Instagram / Facebook officiels (migration `20260930100100` + `seo-config.ts`).
- Devis mobile : panneau bas (75 % max) au lieu de plein écran ; « Vos équipements » : quantités
  modifiables, suppression, lien vers le produit.
- Blog : « Le journal » → « Le blog ».
- Mise en page fluide : conteneur jusqu'à 1760 px (au lieu de 1240), marges proportionnelles,
  4 colonnes produits au-delà de 1500 px.

### Pages de réalisation (30/09/2026)
- `/realisations/<slug>` (`src/pages/RealisationDetail.tsx`) : photo + titre, chiffres clés, texte du
  projet (Markdown, `src/lib/markdown.tsx`), blocs d'images 3D / installation / résultat, témoignage,
  appel à l'action, lien vers la réalisation suivante. Pas de vidéo, images en chargement différé.
- Base : `realisations.content`, `realisations.key_facts` (JSON), table `realisation_images`
  (migration `20260930110000`). Admin → Réalisations → « Page de la réalisation ».
- Les 4 réalisations ont un texte de départ et des blocs d'images vides (maquette) **à valider
  avec le client** ; leurs anciennes descriptions (générées par Lovable) sont incohérentes avec les villes.
- Articles SEO : datés 30/09, 16/09 et 01/09/2026, couvertures dédiées `public/storage/blog-images/<slug>.webp`.

### Back-office : data, suivi commercial, Google Sheets (30/09/2026)
Décisions d'Adil : pas d'email automatique pour l'instant (plus tard), pas de Calendly, pas de
rapport hebdo, pas de rôles (un seul utilisateur : le propriétaire), pas d'import CSV, newsletter
laissée telle quelle. Validés : historique des modifications ; « référencement modifiable » à expliquer.
- **Admin réorganisé** : Tableau de bord · Commercial (Demandes, Newsletter) · Data (Statistiques)
  · Contenu du site · Paramètres (Coordonnées, Intégrations, Historique). Onglet dans l'URL (`#requests/<id>`).
- **Demandes** (`AdminRequests.tsx`, migration `20260930120000`) : n° DEV-AAAA-0001, statuts
  nouveau → contacté → devis envoyé → gagné/perdu, notes, relance, montant, export CSV, PDF
  récapitulatif (`src/lib/requests.ts`, jsPDF, généré dans le navigateur). Les formulaires passent par
  `submit_request()` (plus d'insertion directe publique) ; le client voit son numéro.
- **Statistiques** (`AdminStats.tsx`, `src/lib/analytics.ts`, migration `20260930120100`) : mesure maison
  anonyme (session aléatoire, sessionStorage), visiteur identifié seulement avec consentement ;
  parcours visite → produit → ajout → formulaire → envoi, abandons, provenance UTM/réseaux, produits,
  recherches (dont sans résultat), appareils ; générateur de liens de campagne.
- **Cookies** : `CookieBanner.tsx` + `src/lib/consent.ts` (stats / publicité), lien « Gérer les cookies »
  dans le pied de page, politique de confidentialité mise à jour.
- **Meta Pixel / GA4 / Clarity** : identifiants dans Admin → Intégrations (clés `tracking_*` de
  contact_settings), chargés selon le consentement (`SiteTracking.tsx`). Conversions API Meta :
  non faite (nécessite un jeton serveur + Edge Function).
- **Google Sheets** : déclencheur pg_net → Apps Script (`integrations/google-sheets/`), secret dans
  `private_settings` (admin seul). Insert/update/delete ; « Renvoyer toutes les demandes ».
- **Historique** (`AdminHistory.tsx`, migration `20260930120300`) : avant/après par champ, restauration,
  12 mois. `private_settings` volontairement non tracée (secret).
- Mode démo : ces fonctions sont simulées dans `src/integrations/demo/client.ts` (données gardées dans
  le localStorage du navigateur) + bouton « Données fictives (démo) ».

### Économies : Supabase gratuit + Netlify payant (05/10/2026)
Constat : chaque vue du catalogue téléchargeait toute la table `products` (≈ 635 Ko) et les images
depuis Supabase → dépassement du plan gratuit (5 Go/mois). Désormais :
- **Images** servies par Netlify : `images/images-1-galerie.zip` + `images-2-autres.zip` (envoi web
  GitHub : 100 fichiers / 25 Mo max), décompressées au build ; liens en base = `/storage/…`.
- **Contenu public** via `netlify/functions/content.mjs` (`/api/content`) : 16 tables publiques lues
  avec la clé publique (RLS), cache CDN Netlify 5 min + stale-while-revalidate. Côté site,
  `src/integrations/supabase/client.ts` route les lectures de ces tables vers cette copie
  (moteur de requêtes du mode démo, `snapshotQuery`) ; admin/login, formulaires, stats, rpc =
  Supabase en direct. Repli automatique sur Supabase si `/api/content` échoue.
  → une modification admin est visible sur le site en ≤ 5 min.
- Statistiques conservées 13 mois (`purge_analytics_events`).
- Dépôt GitHub alimenté à la main (envoi web) : paquet prêt dans `Bureau/IMPULSE - MISE EN LIGNE`.

## 4. Architecture cible

```
GitHub (repo privé, branche main)
   │  push / PR
   ▼
Netlify  ── build `npm run build` ── dist/  ── impulsefitness.ma (DNS à basculer)
   │  aperçus de PR automatiques
   ▼
Supabase (NOUVEAU projet AU NOM DU CLIENT)
   ├─ Postgres : mêmes 18 tables, mêmes règles RLS (restaurées depuis backup/)
   ├─ Storage  : product-images/…, blog-images/… (mêmes chemins)
   └─ Auth     : email/mot de passe, inscriptions désactivées, admin = table user_roles
```

Workflow client :
| Demande | Où | Code ? |
|---|---|---|
| Photo, texte, prix, produit, article, FAQ, carrousel, coordonnées | `/admin` | Non |
| Nouvelle page / section / design | Branche → PR → aperçu Netlify → merge | Oui |

## 5. Plan de mise en place Supabase (à faire)

Procédure détaillée, pas à pas : **`supabase/restauration/README.md`**.

1. **Repo & déploiement**
   - Installer Git, `git init`, repo GitHub **privé**, push ; site Netlify relié au repo.
   - Déployer d'abord en mode démo (URL Netlify) pour recette visuelle.
2. **Nouveau projet Supabase** (organisation du client), inscriptions publiques désactivées.
3. **Schéma + données** : `backup/supabase-2026-09-24.sql`, puis le correctif
   `supabase/migrations/20260929120000_securite_storage_admin.sql`.
4. **Images** : `scripts/upload-storage.mjs` (clé service_role en local uniquement),
   puis `supabase/restauration/03-reecriture-urls.sql`.
5. **Compte admin** : créé dans Auth + `supabase/restauration/04-compte-admin.sql`.
6. **Brancher le site** : `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
   (local `.env` + Netlify). Garder le mode démo pour les aperçus de PR
   (`VITE_DATA_MODE=demo` dans le contexte *Deploy Previews* de Netlify).
7. **Formulaires** contact / devis / newsletter : déjà enregistrés en base.
   Notification email à ajouter (Edge Function + Resend, webhook, ou Google Sheets).
8. **Nettoyage** (après recette) : sortir `public/storage/` du build de production
   (les images viennent du Storage), supprimer l'ancien projet côté ancienne agence.
9. **Mise en production** : recette complète, puis DNS `impulsefitness.ma` → Netlify,
   HTTPS, vérifier `sitemap.xml` / `robots.txt`, Search Console.

Points techniques restants :
- 3 vulnérabilités npm côté site (react-router 6, d3-color via react-simple-maps) :
  correctifs = montées de version majeures, risque faible (SPA sans SSR). À planifier.
- Bundle principal ~440 Ko : découpage par route (`React.lazy`) à envisager.
- 3 images de réalisations servies par Unsplash → à remplacer par des visuels du client.
### Inventaire des accès aux données (fichier → tables)
Public :
- `components/AboutImpulseSection` about_sections · `CategoryCardsSection` category_cards
- `ContactSection` contact_requests, contact_settings · `Footer` / `WhatsAppButton` contact_settings
- `FaqSection` faqs · `HeroCarousel` hero_slides · `HomeBlogSection` blog_posts
- `Navbar` contact_settings, products · `NewsletterSignup` newsletter_subscribers
- `ProductGrid` product_ranges, products · `TopBanner` contact_settings, newsletter_subscribers
- `TrendingProducts` products · `hooks/useHomeSections` home_sections
- `pages/Blog`, `BlogDetail` blog_posts · `CategoryPage` equipment_categories/subcategories
- `Consulting` consulting_services · `Devis` contact_requests · `ProductDetail` products, product_images
- `Realisations` realisations · `Recherche` products (`or ilike`)

Admin (`components/admin/`) :
- `AdminAbout` about_sections · `AdminBlogs` blog_posts + upload blog-images
- `AdminCategories` equipment_categories/subcategories + upload · `AdminCategoryCards` category_cards + upload
- `AdminConsulting` consulting_services + upload · `AdminContactSettings` contact_settings
- `AdminContacts` contact_requests · `AdminFaqs` faqs · `AdminHeroSlides` hero_slides, contact_settings + upload
- `AdminHomeSections` home_sections · `AdminNewsletter` newsletter_subscribers
- `AdminProducts` products, product_ranges · `ProductForm` products, product_images, product_ranges + upload
- `AdminRealisations` realisations, testimonials + upload
- `hooks/useAuth` auth + user_roles

## 6. Données privées (hors Git)

Livrées dans un zip séparé à extraire dans `backup/` (gitignoré) :
- `backup/export-json/` — 1 fichier JSON par table (URLs d'origine Supabase).
  `contact_requests.json` et `newsletter_subscribers.json` = données personnelles.
- `backup/supabase-2026-09-24.sql` + `backup/LISEZ-MOI.md` — sauvegarde de l'ancienne agence.
- Les 1 068 images d'origine ne sont pas dupliquées : elles sont déjà dans
  `public/storage/` (mêmes chemins que les buckets Supabase `product-images` / `blog-images`).

## 7. Questions ouvertes
- Chez qui est le domaine `impulsefitness.ma` ? Qui a les accès DNS ?
- Le client veut-il gérer l'admin lui-même, ou DMC s'en charge ?
- Email(s) de notification pour les demandes de contact / devis.
- Garder un mode démo après la migration (aperçus de PR sans toucher la prod) ?
