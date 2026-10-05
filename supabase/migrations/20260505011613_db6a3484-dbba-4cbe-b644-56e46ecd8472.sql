CREATE TABLE public.home_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read home sections"
ON public.home_sections FOR SELECT
USING (true);

CREATE POLICY "Admins can manage home sections"
ON public.home_sections FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_home_sections_updated_at
BEFORE UPDATE ON public.home_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.home_sections (key, label, sort_order) VALUES
  ('hero', 'Carrousel principal', 1),
  ('categories', 'Cartes de catégories', 2),
  ('trending', 'Produits tendance', 3),
  ('blog', 'Blog', 4),
  ('about', 'À propos Impulse', 5),
  ('world', 'Présence mondiale', 6),
  ('contact', 'Contact', 7),
  ('faq', 'FAQ', 8);