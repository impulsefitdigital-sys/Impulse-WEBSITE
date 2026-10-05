-- Cartes « gamme » (demande client du 30/09/2026)
--
-- Dans Professionnel → Musculation, chaque sous-catégorie (Multi-stations,
-- Mono-stations, Charges libres, Charges guidées) affiche d'abord une carte par
-- gamme (IT95, IF93, SL…), puis les produits de la gamme choisie.
-- Image et texte de chaque carte : gérés dans Admin → Gammes.
-- Sans image, le site utilise la photo du premier produit de la gamme.
--
-- Idempotent.

ALTER TABLE public.product_ranges ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.product_ranges ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
