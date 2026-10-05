# Restauration dans le nouveau projet Supabase (au nom du client)

Ordre à respecter. Tout se fait dans le tableau de bord Supabase sauf l'étape 2.

## 0. Créer le projet
- Organisation **au nom du client**, région proche (ex. `eu-west-3` Paris ou `eu-central-1`).
- **Authentication → Sign In / Providers → Email** : désactiver
  **« Allow new users to sign up »**. Le site n'a pas de page d'inscription :
  seuls les comptes créés à la main doivent exister.

## 1. Schéma + données
SQL Editor → coller et exécuter `backup/supabase-2026-09-24.sql` (hors dépôt Git).
Crée les 18 tables, les règles RLS, les buckets `product-images` / `blog-images`,
et insère les données. La ligne admin de l'ancienne agence est ignorée : normal.

Puis exécuter, **dans l'ordre**, les migrations postérieures à la sauvegarde :
1. `supabase/migrations/20260929120000_securite_storage_admin.sql` — correctif sécurité du stockage
2. `supabase/migrations/20260930100000_gammes_cartes.sql` — image + texte des cartes gamme
3. `supabase/migrations/20260930100100_liens_reseaux_sociaux.sql` — liens Instagram / Facebook
4. `supabase/migrations/20260930100200_articles_blog_seo.sql` — 3 articles de blog
   (avant l'étape 3 : leurs images sont réécrites avec les autres)
5. `supabase/migrations/20260930110000_pages_realisations.sql` — pages détaillées des réalisations
   (texte, chiffres clés, blocs d'images 3D / installation / résultat)
6. `supabase/migrations/20260930120000_crm_demandes.sql` — suivi des demandes, n° de devis,
   fonction `submit_request` (les formulaires du site en ont besoin)
7. `supabase/migrations/20260930120100_statistiques.sql` — statistiques du site
8. `supabase/migrations/20260930120200_google_sheets.sql` — archive Google Sheets
   (active `pg_net` ; configuration ensuite dans Admin → Paramètres → Intégrations,
   cf. `integrations/google-sheets/README.md`)
9. `supabase/migrations/20260930120300_historique.sql` — historique des modifications
   (à exécuter en dernier : il trace les tables créées par les migrations précédentes)

## 2. Images (1 068 fichiers, ~28 Mo) — rien à faire dans Supabase
Décision du 05/10/2026 (plan **gratuit** Supabase) : les images sont servies par **Netlify**
(archives `images/*.zip`, décompressées dans `public/storage/` au build, cf. `netlify.toml`),
pas par le Storage Supabase — sinon la bande passante gratuite (5 Go/mois) s'épuise.
Seules les images ajoutées ensuite via l'admin vont dans le Storage Supabase.
`scripts/upload-storage.mjs` n'est plus nécessaire (conservé si on change d'avis).

## 3. Liens des images
`supabase/restauration/03-reecriture-urls.sql` — exécuter tel quel (remplace l'ancien préfixe
Supabase par `/storage/`). La requête de contrôle finale doit renvoyer 0 partout.

## 4. Compte admin
Authentication → Users → *Add user* (email + mot de passe, *Auto Confirm*),
puis `supabase/restauration/04-compte-admin.sql` avec cet email.

## 5. Brancher le site
Variables (local `.env` + Netlify → *Site configuration → Environment variables*) :
```
VITE_SUPABASE_URL=https://<nouveau-projet>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clé publishable / anon>
```
Redéployer. Le bandeau « Mode démo » doit disparaître.

## Vérifications
- Accueil, catalogue, fiche produit, recherche, blog : images affichées.
- `/login` avec le compte admin → `/admin` accessible ; modifier puis rétablir un produit.
- Formulaire contact → la demande apparaît dans *Admin → Contacts*.
- Security Advisor (tableau de bord) : aucune alerte critique.
