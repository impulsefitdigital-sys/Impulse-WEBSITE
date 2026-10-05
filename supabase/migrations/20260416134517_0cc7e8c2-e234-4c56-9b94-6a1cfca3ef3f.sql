
-- Categories table
CREATE TABLE public.equipment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active categories" ON public.equipment_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.equipment_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Subcategories table
CREATE TABLE public.equipment_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  category_slug text NOT NULL REFERENCES public.equipment_categories(slug) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_slug, slug)
);

ALTER TABLE public.equipment_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active subcategories" ON public.equipment_subcategories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage subcategories" ON public.equipment_subcategories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers
CREATE TRIGGER update_equipment_categories_updated_at BEFORE UPDATE ON public.equipment_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_equipment_subcategories_updated_at BEFORE UPDATE ON public.equipment_subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categories
INSERT INTO public.equipment_categories (slug, title, description, sort_order) VALUES
  ('cardio', 'Cardio', 'Nous établissons la norme en matière de durabilité cardio depuis des décennies. Fournissez à vos utilisateurs les meilleurs appareils cardio qui fonctionnent jour après jour, utilisation après utilisation.', 1),
  ('musculation', 'Musculation', 'Des équipements de musculation de qualité professionnelle conçus pour offrir des performances optimales et une durabilité exceptionnelle.', 2),
  ('fonctionnel', 'Fonctionnel', 'Des solutions d''entraînement fonctionnel innovantes pour des séances dynamiques et polyvalentes.', 3);

-- Seed subcategories
INSERT INTO public.equipment_subcategories (slug, title, category_slug, sort_order) VALUES
  ('tapis-de-course', 'Tapis de course', 'cardio', 1),
  ('elliptiques', 'Elliptiques', 'cardio', 2),
  ('climbmills', 'Climbmills', 'cardio', 3),
  ('steppers', 'Steppers', 'cardio', 4),
  ('velos', 'Vélos', 'cardio', 5),
  ('rameurs', 'Rameurs', 'cardio', 6),
  ('multi-stations', 'Multi-stations', 'musculation', 1),
  ('mono-stations', 'Mono-stations', 'musculation', 2),
  ('charges-libres', 'Charges Libres', 'musculation', 3),
  ('charges-guidees', 'Charges Guidées', 'musculation', 4),
  ('hiit-cardio', 'HIIT Cardio', 'fonctionnel', 1),
  ('cages-rigs', 'Cages & Rigs', 'fonctionnel', 2);
