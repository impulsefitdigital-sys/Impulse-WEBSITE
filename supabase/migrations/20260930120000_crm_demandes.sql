-- Suivi commercial des demandes (devis + contact) — 30/09/2026
--
-- • Numéro de devis automatique : DEV-2026-0001, DEV-2026-0002…
-- • Statut (nouveau → contacté → devis envoyé → gagné / perdu), notes, date de relance, montant
-- • Données structurées : type, usage, ville, équipements (JSON) au lieu d'un seul texte
-- • Provenance : paramètres UTM de la campagne, site d'origine, page d'arrivée
-- • Envoi par une fonction submit_request() : le visiteur ne peut plus écrire directement
--   dans la table (impossible d'y glisser un statut, une note ou un faux numéro).
--
-- Idempotent.

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'contact',
  ADD COLUMN IF NOT EXISTS quote_number TEXT,
  ADD COLUMN IF NOT EXISTS usage_type TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'nouveau',
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS follow_up_date DATE,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS landing_page TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_requests_request_type_check') THEN
    ALTER TABLE public.contact_requests ADD CONSTRAINT contact_requests_request_type_check CHECK (request_type IN ('devis', 'contact'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_requests_status_check') THEN
    ALTER TABLE public.contact_requests ADD CONSTRAINT contact_requests_status_check CHECK (status IN ('nouveau', 'contacte', 'devis_envoye', 'gagne', 'perdu'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_requests_quote_number_key') THEN
    ALTER TABLE public.contact_requests ADD CONSTRAINT contact_requests_quote_number_key UNIQUE (quote_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contact_requests_created ON public.contact_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests (status);

-- ---------------------------------------------------------------- numéro de devis
CREATE TABLE IF NOT EXISTS public.quote_counters (
  year INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);
ALTER TABLE public.quote_counters ENABLE ROW LEVEL SECURITY; -- aucune politique : accès via fonctions uniquement

CREATE OR REPLACE FUNCTION public.next_quote_number(_at TIMESTAMPTZ DEFAULT now())
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  y INT := EXTRACT(YEAR FROM _at AT TIME ZONE 'Africa/Casablanca')::INT;
  n INT;
BEGIN
  INSERT INTO public.quote_counters (year, last_number) VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE SET last_number = public.quote_counters.last_number + 1
  RETURNING last_number INTO n;
  RETURN 'DEV-' || y || '-' || lpad(n::TEXT, 4, '0');
END $$;
REVOKE ALL ON FUNCTION public.next_quote_number(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- reprise des anciennes demandes
-- Les anciennes demandes stockaient tout dans « message » : « [DEVIS - Usage professionnel] … Ville: X ».
UPDATE public.contact_requests SET
  request_type = CASE WHEN message LIKE '[DEVIS%' THEN 'devis' ELSE 'contact' END,
  usage_type = COALESCE(usage_type, substring(message FROM 'Usage (professionnel|residentiel)')),
  city = COALESCE(city, NULLIF(btrim(substring(message FROM 'Ville: ([^\n]*)')), ''))
WHERE usage_type IS NULL AND message LIKE '[%';

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, created_at FROM public.contact_requests
           WHERE request_type = 'devis' AND quote_number IS NULL ORDER BY created_at LOOP
    UPDATE public.contact_requests SET quote_number = public.next_quote_number(r.created_at) WHERE id = r.id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------- garde-fous
CREATE OR REPLACE FUNCTION public.contact_requests_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS contact_requests_touch ON public.contact_requests;
CREATE TRIGGER contact_requests_touch BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.contact_requests_touch();

-- Les visiteurs passent par submit_request() ; l'insertion directe est réservée à l'admin.
DROP POLICY IF EXISTS "Anyone can insert contact requests" ON public.contact_requests;

-- ---------------------------------------------------------------- envoi d'une demande
-- Appelée par les formulaires Devis et Contact. Renvoie { id, quote_number }.
CREATE OR REPLACE FUNCTION public.submit_request(p JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _type TEXT := COALESCE(p->>'request_type', 'contact');
  _name TEXT := btrim(COALESCE(p->>'full_name', ''));
  _phone TEXT := btrim(COALESCE(p->>'phone', ''));
  _email TEXT := NULLIF(btrim(COALESCE(p->>'email', '')), '');
  _items JSONB := COALESCE(p->'items', '[]'::jsonb);
  _number TEXT;
  _id UUID;
BEGIN
  IF _type NOT IN ('devis', 'contact') THEN RAISE EXCEPTION 'Type de demande invalide'; END IF;
  IF length(_name) < 2 OR length(_name) > 150 THEN RAISE EXCEPTION 'Nom invalide'; END IF;
  IF length(_phone) < 6 OR length(_phone) > 30 THEN RAISE EXCEPTION 'Téléphone invalide'; END IF;
  IF _email IS NOT NULL AND (length(_email) > 200 OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN RAISE EXCEPTION 'Email invalide'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) > 100 THEN RAISE EXCEPTION 'Liste d''équipements invalide'; END IF;
  IF length(COALESCE(p->>'message', '')) > 5000 THEN RAISE EXCEPTION 'Message trop long'; END IF;
  IF _type = 'devis' AND jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Le devis est vide'; END IF;

  IF _type = 'devis' THEN _number := public.next_quote_number(); END IF;

  INSERT INTO public.contact_requests (
    request_type, quote_number, full_name, email, phone, company, city, usage_type, items, message,
    utm_source, utm_medium, utm_campaign, referrer, landing_page, session_id
  ) VALUES (
    _type, _number, _name,
    COALESCE(_email, _phone || '@no-email.local'),  -- colonne historique NOT NULL
    _phone,
    NULLIF(left(btrim(COALESCE(p->>'company', '')), 200), ''),
    NULLIF(left(btrim(COALESCE(p->>'city', '')), 120), ''),
    CASE WHEN p->>'usage_type' IN ('professionnel', 'residentiel') THEN p->>'usage_type' END,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', left(i->>'id', 64),
        'name', left(i->>'name', 200),
        'category', left(COALESCE(i->>'category', ''), 80),
        'quantity', GREATEST(1, LEAST(999, COALESCE((i->>'quantity')::INT, 1)))
      )), '[]'::jsonb) FROM jsonb_array_elements(_items) i),
    left(p->>'message', 5000),
    left(p->>'utm_source', 120), left(p->>'utm_medium', 120), left(p->>'utm_campaign', 200),
    left(p->>'referrer', 500), left(p->>'landing_page', 500), left(p->>'session_id', 64)
  ) RETURNING id INTO _id;

  RETURN jsonb_build_object('id', _id, 'quote_number', _number);
END $$;
REVOKE ALL ON FUNCTION public.submit_request(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_request(JSONB) TO anon, authenticated;
