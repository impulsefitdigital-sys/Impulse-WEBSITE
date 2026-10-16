-- Photos par couleur (refonte photos du 16/10/2026)
-- products.default_color : couleur de l'image principale et de survol (affichée par défaut)
-- product_images.color   : couleur de la photo de galerie (NULL = commune à toutes les couleurs)
-- Valeurs utilisées : noir, rouge, argent, argent-rouge, noir-rouge, blanc-noir, noir-marron, jaune
ALTER TABLE public.products       ADD COLUMN IF NOT EXISTS default_color TEXT;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS color TEXT;
