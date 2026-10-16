# Scripts de sélection des photos (16/10/2026)

Utilisés dans Cowork pour remplacer les photos du site. Chemins d'origine codés en dur
(`/home/claude/web01` = contenu de `01_WEB`, `/home/claude/sel` = dossier de travail) :
à adapter avant de les relancer.

1. `analyse.py` — mesure chaque WebP (fond blanc, produit entier ou recadré).
2. `select.py` — associe chaque produit du site à son dossier photos
   (`correspondance_site_photos.csv`), choisit la couleur par défaut et l'ordre :
   vues complètes → détails → ambiance ; applique `pos_overrides.json` (corrections manuelles).
3. `apply.py` — copie les photos dans `public/photos/` et met à jour `src/integrations/demo/data.json`.

`selection.json` = résultat final (produit → liste ordonnée des photos avec couleur).
