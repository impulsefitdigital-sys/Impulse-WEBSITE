-- IMPULSE — mise à jour du 17/10/2026. Supabase > SQL Editor > New query : coller, « Run ».
-- Peut être relancé sans risque.
BEGIN;

-- 1. Carrousel : un bouton par image + image téléphone facultative
ALTER TABLE public.hero_slides ADD COLUMN IF NOT EXISTS show_cta BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.hero_slides ADD COLUMN IF NOT EXISTS mobile_image_url TEXT;

-- 2. Gammes manquantes (sinon 6 fiches n'apparaissent dans aucune carte gamme)
INSERT INTO public.product_ranges (code, usage_type, category, subcategory, sort_order, is_active) VALUES
  ('AC4',  'residentiel',   'cardio',      'tapis-de-course', 99, true),
  ('AC8',  'residentiel',   'cardio',      'tapis-de-course', 99, true),
  ('IT7',  'professionnel', 'musculation', 'charges-guidees', 99, true),
  ('IT95', 'residentiel',   'musculation', 'mono-stations',   99, true),
  ('ITF',  'residentiel',   'musculation', 'charges-libres',  99, true)
ON CONFLICT (code, usage_type, category, subcategory) DO NOTHING;

COMMIT;

SELECT count(*) AS colonnes_carrousel_attendu_2
FROM information_schema.columns
WHERE table_name = 'hero_slides' AND column_name IN ('show_cta', 'mobile_image_url');
