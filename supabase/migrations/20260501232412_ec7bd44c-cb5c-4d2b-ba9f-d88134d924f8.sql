
-- 1. Ajouter usage_type
ALTER TABLE public.equipment_categories
  ADD COLUMN IF NOT EXISTS usage_type TEXT NOT NULL DEFAULT 'both';

ALTER TABLE public.equipment_subcategories
  ADD COLUMN IF NOT EXISTS usage_type TEXT NOT NULL DEFAULT 'both';

-- 2. Supprimer la FK puis l'ancienne contrainte d'unicité (CASCADE pour la dépendance)
ALTER TABLE public.equipment_subcategories
  DROP CONSTRAINT IF EXISTS equipment_subcategories_category_slug_fkey;

ALTER TABLE public.equipment_categories
  DROP CONSTRAINT IF EXISTS equipment_categories_slug_key CASCADE;

ALTER TABLE public.equipment_subcategories
  DROP CONSTRAINT IF EXISTS equipment_subcategories_category_slug_slug_key;

-- 3. Nouvelles unicités
CREATE UNIQUE INDEX IF NOT EXISTS equipment_categories_slug_usage_unique
  ON public.equipment_categories (slug, usage_type);

CREATE UNIQUE INDEX IF NOT EXISTS equipment_subcategories_cat_slug_usage_unique
  ON public.equipment_subcategories (category_slug, slug, usage_type);

-- 4. Dupliquer catégories 'both' en pro + resi
INSERT INTO public.equipment_categories (slug, title, description, image_url, sort_order, is_active, usage_type)
SELECT slug, title, description, image_url, sort_order, is_active, 'professionnel'
FROM public.equipment_categories
WHERE usage_type = 'both';

INSERT INTO public.equipment_categories (slug, title, description, image_url, sort_order, is_active, usage_type)
SELECT slug, title, description, image_url, sort_order, is_active, 'residentiel'
FROM public.equipment_categories
WHERE usage_type = 'both';

-- 5. Dupliquer sous-catégories 'both' en pro + resi
INSERT INTO public.equipment_subcategories (slug, title, description, image_url, category_slug, sort_order, is_active, usage_type)
SELECT slug, title, description, image_url, category_slug, sort_order, is_active, 'professionnel'
FROM public.equipment_subcategories
WHERE usage_type = 'both';

INSERT INTO public.equipment_subcategories (slug, title, description, image_url, category_slug, sort_order, is_active, usage_type)
SELECT slug, title, description, image_url, category_slug, sort_order, is_active, 'residentiel'
FROM public.equipment_subcategories
WHERE usage_type = 'both';

-- 6. Supprimer les lignes 'both' devenues redondantes
DELETE FROM public.equipment_subcategories WHERE usage_type = 'both';
DELETE FROM public.equipment_categories WHERE usage_type = 'both';

-- 7. Recréer la FK composite (category_slug, usage_type) -> categories(slug, usage_type)
ALTER TABLE public.equipment_subcategories
  ADD CONSTRAINT equipment_subcategories_category_fkey
  FOREIGN KEY (category_slug, usage_type)
  REFERENCES public.equipment_categories (slug, usage_type)
  ON DELETE CASCADE;
