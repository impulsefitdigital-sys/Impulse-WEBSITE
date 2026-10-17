-- Carrousel d'accueil (demande du 17/10/2026)
-- show_cta         : affiche un bouton sur l'image (texte = cta_text, lien = cta_link)
-- mobile_image_url : image optionnelle pour les téléphones (sinon l'image ordinateur est recadrée)
-- Idempotent.
ALTER TABLE public.hero_slides ADD COLUMN IF NOT EXISTS show_cta BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.hero_slides ADD COLUMN IF NOT EXISTS mobile_image_url TEXT;
