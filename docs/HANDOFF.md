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

### Photos produits, couleurs et 120 nouvelles fiches (16/10/2026, travail fait dans Cowork)
Fait sur une copie de la sauvegarde du 24/09, puis **fusionné dans ce dépôt** le 16/10 (branche `fusion-photos`).
Rien d'autre n'a été modifié : CRM, statistiques, Google Sheets, historique, pages réalisations et `/api/content` sont conservés.
- **Photos** : 1 750 WebP dans `public/photos/<gamme>/<référence>/[couleur/]…` (servies par Netlify, cache 30 j).
  - 169 fiches existantes ont de nouvelles photos. L'image principale montre la machine entière, de face ou de trois quarts.
  - Sources et scripts : `scripts/photos/` (les photos originales restent hors dépôt).
- **Couleurs** : `products.default_color` + `product_images.color` (migration `20261016120000_couleurs_photos.sql`).
  - Sélecteur de couleur sur la fiche produit.
  - Couleur de chaque photo réglable dans le formulaire produit de l'admin.
- **120 nouvelles fiches** (IF93, IT95, Exoform, IFP, ITF8, ECP, SL, AC/RT, PS, I-Zone, MS, FF), publiées et rangées comme leur gamme.
  - Noms et caractéristiques tirés du catalogue Impulse (PDF client).
  - Corrections :
    - ITF8721/8722, auparavant mal référencées IFP ;
    - FE9710 noir/argent ;
    - 5 fiches MS-C qui avaient une catégorie mal écrite.
  - Le site passe de 199 à 314 produits publiés.
  - Noms à valider : IFP1607, ITF8803, ITF8901, MS42, MS7040, FF1001, IF9337.
- **Admin → « Gammes : rangement »** (`AdminRangeProducts.tsx`), en complément de « Gammes », qui gère les cartes :
  - par gamme : espace Pro/Résidentiel, catégorie et sous-catégorie, visibilité ;
  - actions groupées sur les produits ;
  - réglage produit par produit.
- **Cartes gamme aussi dans Professionnel › Fonctionnel › Cages & Rigs** : MS, FF, ZONE (`RANGE_CARD_SUBCATEGORIES` dans `Professionnel.tsx`).
- **Base en ligne** : la mise à jour se fait avec `scripts/supabase/sql_maj_produits.py`.
  - Le script produit 3 fichiers SQL.
  - Ils ne touchent que `products`, `product_images` et `product_ranges`.
  - Pour une fiche existante, seuls les champs modifiés sont mis à jour.
- Fichiers remis (`.gitignore`, `.npmrc`, `.env.example`) : ils manquaient, l'envoi web de GitHub ignore les fichiers commençant par un point.

### Corrections et check-up du 17/10/2026 (Cowork)
Retours d'Adil après la mise en ligne, et check-up de l'infrastructure.
- **Menu « Solutions » qui affichait « Consulting »** : le site utilisait des liens `<a href>` classiques.
  Chaque clic rechargeait donc toute l'application, avec le libellé par défaut avant celui de la base.
  - `src/components/SpaLinks.tsx` intercepte les liens internes : navigation sans rechargement, beaucoup plus rapide.
  - Libellé par défaut : « Solutions ».
- **Cartes gamme partout** (Pro et Résidentiel), dès qu'une sous-catégorie a au moins 2 gammes.
  - Route `/residentiel/:cat/:sub/:gamme` ajoutée.
  - Les produits sans carte (sans gamme, ou gamme non rangée là) s'affichent sous les cartes, dans « Autres équipements ».
  - 5 lignes de gamme manquantes ajoutées (AC4/AC8 rés., IT7 pro guidées, IT95 rés. mono, ITF rés. libres).
- **Admin → Produits** :
  - recherche + filtres espace / catégorie / sous-catégorie / gamme / statut ;
  - regroupement par gamme, repliable ;
  - compteur « à compléter » : fiche sans sous-catégorie, sans gamme ou sans image.
- **Images de l'admin** (`src/lib/images.tsx`) :
  - taille conseillée affichée sur chaque champ image ;
  - redimensionnement + conversion WebP avant l'envoi (ex. 670 Ko → 117 Ko) ;
  - cache navigateur d'un an pour les fichiers du Storage.
- **Carrousel** (migration `20261017100000_carrousel_boutons.sql`) :
  - un bouton par image (case « Afficher un bouton », texte, destination choisie dans la liste des pages / catégories / gammes : `LinkPicker.tsx`) ;
  - image « téléphone » facultative ;
  - enregistrement par mise à jour, au lieu de « tout supprimer puis réinsérer » ;
  - le choix « mode complet / simple », sans effet sur le site, a été retiré.
- **Délai de mise à jour du site après une modification admin** (jusqu'à 5 min avant) :
  - `netlify/functions/purge-content.mjs`, réservé à l'admin (jeton Supabase + `has_role`), vide le cache Netlify (étiquette `impulse-content`) ;
  - le client Supabase (`src/integrations/supabase/client.ts`) l'appelle après chaque écriture admin réussie sur une table publique ;
  - le site est à jour en quelques secondes.
- **Vitesse** :
  - pages chargées à la demande (`React.lazy`) : script principal 946 Ko → 324 Ko ;
  - vignettes 640 px des photos produits dans `public/photos-sm/` (16 Ko au lieu de 52 Ko en moyenne, `scripts/photos/vignettes.py`), avec repli automatique sur l'original ;
  - images de survol en chargement différé.
- **SEO** : `/sitemap.xml` est généré par `netlify/functions/sitemap.mjs` depuis la base (produits, gammes, articles, réalisations), cache 1 h.
  - Le sitemap statique devient le repli : `public/sitemap-fallback.xml`, 418 URL.
  - Domaine : `SITE_URL` = impulsefitness.ma, variable Netlify `SITE_URL_CANONIQUE` pour la changer.
- SQL à exécuter une fois sur la base : `supabase/mises-a-jour/2026-10-17.sql`.

### Domaine de production : impulsemorocco.com (17/10/2026)
- Décision d'Adil : le site vit sur **impulsemorocco.com**. impulsefitness.ma reste chez l'ancienne agence.
- `SITE_URL` (balises canonical, og:url, JSON-LD, sitemap, robots.txt) = `https://impulsemorocco.com`, sans www, comme le domaine principal Netlify.
- Les adresses e-mail affichées (…@impulsefitness.ma) sont inchangées : elles se modifient dans Admin → Coordonnées.
- Si impulsefitness.ma est récupéré : redirection 301 vers impulsemorocco.com, puis « Changement d'adresse » dans Google Search Console.

### Sécurité de l'admin (19/10/2026)
- Incident : les sous-catégories de Musculation (Pro) ont disparu. La sauvegarde de la page Catégories supprimait toutes les sous-catégories puis les réinsérait, sans vérifier les erreurs.
- Correctif :
  - la sauvegarde met à jour par identifiant et ne supprime que les lignes retirées à la main ;
  - une erreur stoppe tout, sans rien supprimer ;
  - même correction pour les Cartes d'accueil ;
  - une confirmation est demandée avant de supprimer une sous-catégorie ;
  - l'icône ✕ retire l'image, la corbeille supprime la ligne.
- Réparation : `supabase/mises-a-jour/2026-10-19-restaurer-sous-categories.sql`. Il reprend d'abord la dernière version dans l'historique (`audit_log`), sinon les valeurs d'origine.
- Ordre d'affichage : flèches ↑↓ sur les catégories et les sous-catégories (`sort_order` = position).
- **Bouton « Annuler la dernière action »** (`AdminUndo.tsx`, en bas de l'admin) :
  - il défait la dernière rafale d'écritures de l'utilisateur à partir de l'historique : recrée, remet les anciennes valeurs, retire ;
  - pour une action plus ancienne : Paramètres → Historique.

### Landing page des campagnes : /lp/musculation (19/10/2026)
- Page autonome, sans le menu du site et non indexée (`src/pages/LandingMusculation.tsx`, `src/styles/landing.css`).
  - Images et coordonnées lues dans l'admin : catégorie et sous-catégories Musculation Pro, gammes, Coordonnées, chiffres clés.
  - La gamme IT7 est exclue (`HIDDEN_RANGES`).
- Formulaire en 2 étapes (`src/components/landing/LeadForm.tsx`) :
  - étape 1 : type de projet et surface, à boutons ;
  - étape 2 : nom, téléphone (obligatoire), email (facultatif) ;
  - mention légale sous le bouton, sans case à cocher.
  - Présent en haut de page (ordinateur), dans le pop-up et en bas de page.
- Pop-up : après 60 s, ou si la souris quitte la page (ordinateur, après 10 s). Une fois par visite, jamais après un envoi.
- Demandes : `submit_request()` avec `source = 'landing'`, `project_type`, `surface` (migration `20261019120000_landing_page.sql`).
  - Admin → Demandes : filtre « Landing page », badge, projet et surface sur la fiche.
  - Google Sheet : type « Landing page ».
- Suivi : événement `Lead` (Pixel Meta) et `generate_lead` (GA4) à l'envoi, s'ils sont activés et acceptés dans le bandeau cookies.
  Plus `form_start` / `contact_submit` dans les statistiques internes.
- Promesses validées par Adil : rappel sous 24 h, livraison partout au Maroc. Ne pas ajouter de plan 3D offert ni de facilités de paiement sans son accord.

### Landing page « stock avec prix » (22/10/2026)
- La page ne montre plus que les **49 machines du stock**, tirées de l'offre revendeur n° 26-259 (validité 29/10/2026) : `src/data/stock-landing.ts`.
  - Prix affiché = PU HT de l'offre ; prix barré = PU × 1,20 (demande d'Adil).
  - Photo et nom viennent de la fiche du site retrouvée par la référence.
- Rangement par sous-catégorie du site ; une sous-catégorie sans machine en stock est masquée.
  - Résultat : Multi-stations 1, Mono-stations 4, Charges libres 8 (bancs), Charges guidées 36 (machines à disques, Smith).
  - Filtre par gamme et « voir plus » au-delà de 8 machines.
- Sections retirées : bandeau rouge, chiffres, 3 étapes, « Pourquoi Impulse » et références, carrousel des gammes. Tous les boutons WhatsApp sont retirés.
- Deux parcours :
  1. **Formulaire simple** (`LeadForm`) : nom et prénom, téléphone, email facultatif. Présent en haut de page, en pop-up et en bas de page.
  2. **Devis** (`DevisDrawer`) : ajout de machines, quantités, total HT, puis coordonnées → `submit_request` type `devis` (n° DEV-…), avec les lignes et prix dans le message.
  - Coordonnées partagées entre les deux (`src/components/landing/contact.ts`, localStorage) : le devis est pré-rempli.
  - Panier gardé dans le navigateur (`impulse-lp-devis`).
- Le pop-up ne s'ouvre pas si le visiteur a commencé un devis ou un formulaire.

### 22/10/2026 (soir) — Landing page : stock par gamme + fiches produit
- Le stock est rangé **par gamme** (IT95, ECP, SL, IFP, ITF) : cartes gamme du site (affiche = image de la gamme dans Admin → Gammes, sinon photo d'une machine), puis une section par gamme avec les **cartes produit du site** (photo au survol, bouton devis rond) + prix HT et prix barré +20 %.
- Clic sur une machine → **fiche produit complète** sur `/lp/musculation/:id` (même affichage que le site : galerie, couleurs, description, caractéristiques, garantie, autres machines en stock de la gamme), avec le prix du stock, « Ajouter au devis » / quantité et « Être rappelé ». « Retour au stock » revient sur la machine dans la liste.
- La fiche produit est maintenant un composant partagé : `src/components/ProductDetailView.tsx`, utilisé par `/produit/:id` (site, inchangé à l'écran) et par la landing.
- Route : `/lp/musculation/:id?` dans `src/App.tsx`. Aucun changement de base de données.
- Aucune date de validité ni numéro d'offre affichés (la date du PDF n'est pas à prendre en compte).

### 22/10/2026 (nuit) — Landing page : une page par gamme
- L'accueil de la landing ne montre plus toutes les machines : haut de page, machines les plus demandées, cartes « Nos gammes », showroom, formulaire, FAQ (page beaucoup plus courte).
- Clic sur une gamme → page de la gamme `/lp/musculation/gamme/<code>` (ex. `/gamme/ecp`) : ses machines, onglets pour passer d'une gamme à l'autre, « Toutes les gammes » pour revenir.
- La fiche produit revient sur la page de sa gamme (« Retour à la gamme ECP »), à la hauteur de la machine.
- Plus de mention « en stock » à côté des nombres de machines ni sur les cartes (« 8 machines » seulement) ; FAQ et textes ajustés.

### 23/10/2026 — Landing page refaite d'après la maquette du client (« Offre de lancement »)
- Bandeau rouge « Offre de lancement », en-tête blanc (logo → site, « Mon devis (n) », WhatsApp), visuel `public/lp/hero-lancement.webp` (+ version 1000 px pour téléphone).
- Accueil : 3 catégories (Multistation = gamme IT95 ; Musculation libre = sous-catégorie Charges libres ; Musculation guidée = le reste), 2 machines par catégorie, bandeau « Voir mon devis », showroom (carte Google Maps de l'admin, Itinéraire, WhatsApp), bandeau « Projet sur mesure » (formulaire simple), pied de page.
- Page d'une catégorie : `/lp/musculation/machines/<multistation|musculation-guidee|musculation-libre>`, filtre par gamme `?gamme=ecp`. Les anciennes adresses `/lp/musculation/gamme/<code>` redirigent vers la bonne catégorie.
- Cartes produit : « Impulse REF », type, prix HT en rouge, prix barré (+20 %), « Garantie 12 mois » et « Livraison sous 72 h » (textes de la maquette, constantes en haut de `LandingMusculation.tsx`), « Ajouter au devis ».
- Plus aucun lien vers le site sauf le logo (en-tête et pied de page). FAQ et formulaires intégrés à la page retirés ; le formulaire simple reste dans la fenêtre (pop-up 60 s, « Demander un devis personnalisé »).

### 24/10/2026 — Landing page : retours du client
- La landing est un univers à part : plus AUCUN lien vers le site. Le logo ramène à l'accueil de la landing ; la politique de confidentialité s'ouvre dans une fenêtre (texte partagé : `src/components/PrivacyPolicyContent.tsx`, aussi utilisé par la page du site) ; le bandeau cookies fait de même sur `/lp/…` ; pied de page : « Confidentialité » et « Gérer les cookies ».
- WhatsApp retiré partout ; il n'apparaît qu'après l'envoi du formulaire ou du devis (« Écrire sur WhatsApp », message prérempli avec le nom et le n° DEV).
- Retirés : boutons « Découvrir les machines » / « Visiter le showroom » sous le visuel, nombre de machines dans les descriptifs (« Voir toutes les machines »).
- Showroom : bouton rouge « Visiter notre showroom » (ouvre le formulaire, intérêt « Visite du showroom ») à côté d'« Itinéraire ».
- Devis : « Envoyer la commande » (panier et coordonnées), « Continuer la sélection », titre « Commande envoyée ».

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
- Domaine : impulsemorocco.com, décidé le 17/10. impulsefitness.ma est chez l'ancienne agence : à récupérer pour le rediriger.
- Le client veut-il gérer l'admin lui-même, ou DMC s'en charge ?
- Email(s) de notification pour les demandes de contact / devis.
- Garder un mode démo après la migration (aperçus de PR sans toucher la prod) ?
