
CREATE TABLE public.about_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.about_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active about sections"
ON public.about_sections FOR SELECT TO public
USING (is_active = true);

CREATE POLICY "Admins can manage about sections"
ON public.about_sections FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_about_sections_updated_at
BEFORE UPDATE ON public.about_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
