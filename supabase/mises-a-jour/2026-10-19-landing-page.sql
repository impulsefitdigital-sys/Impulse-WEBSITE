-- Landing page publicitaire /lp/musculation (19/10/2026)
-- • contact_requests.source : 'site' (formulaires du site) ou 'landing' (landing pages des campagnes)
-- • project_type / surface : réponses rapides du formulaire de la landing page
-- • submit_request() : même fonction, avec ces 3 champs en plus (les formulaires existants ne changent pas)
-- • Google Sheet : le type affiché devient « Landing page » pour ces demandes
-- Idempotent.

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'site',
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS surface TEXT;

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
    utm_source, utm_medium, utm_campaign, referrer, landing_page, session_id,
    source, project_type, surface
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
    left(p->>'referrer', 500), left(p->>'landing_page', 500), left(p->>'session_id', 64),
    CASE WHEN p->>'source' = 'landing' THEN 'landing' ELSE 'site' END,
    NULLIF(left(btrim(COALESCE(p->>'project_type', '')), 60), ''),
    NULLIF(left(btrim(COALESCE(p->>'surface', '')), 40), '')
  ) RETURNING id INTO _id;

  RETURN jsonb_build_object('id', _id, 'quote_number', _number);
END $$;
REVOKE ALL ON FUNCTION public.submit_request(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_request(JSONB) TO anon, authenticated;

-- Google Sheet : « Landing page » dans la colonne Type (si l'intégration est installée)
DO $do$
BEGIN
  IF to_regprocedure('public.contact_request_sheet_row(public.contact_requests, boolean)') IS NOT NULL THEN
    EXECUTE replace(
      pg_get_functiondef('public.contact_request_sheet_row(public.contact_requests, boolean)'::regprocedure),
      $r$CASE r.request_type WHEN 'devis' THEN 'Devis' ELSE 'Contact' END$r$,
      $r$CASE WHEN r.source = 'landing' THEN 'Landing page' WHEN r.request_type = 'devis' THEN 'Devis' ELSE 'Contact' END$r$
    );
  END IF;
END $do$;
