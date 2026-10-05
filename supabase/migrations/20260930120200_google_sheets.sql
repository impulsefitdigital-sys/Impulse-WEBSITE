-- Archive des demandes dans Google Sheets — 30/09/2026
--
-- À chaque nouvelle demande (et à chaque changement de statut, note, montant…), la base envoie
-- la ligne à un script Google Apps Script qui l'écrit dans le Google Sheet du client
-- (une ligne par demande, mise à jour en place ; une demande supprimée du site reste dans le
-- Sheet, marquée « supprimée du site »). Installation : integrations/google-sheets/README.md
--
-- • L'envoi part du serveur (extension pg_net) : l'adresse du script et la clé secrète ne sont
--   jamais visibles dans le navigateur.
-- • Adresse + clé : Admin → Paramètres → Intégrations (table private_settings, admin uniquement).
-- • Sans adresse configurée, rien n'est envoyé.
--
-- Idempotent.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.private_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.private_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage private settings" ON public.private_settings;
CREATE POLICY "Admins can manage private settings" ON public.private_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.private_settings (key, value) VALUES
  ('google_sheet_webhook_url', ''),
  ('google_sheet_secret', '')
ON CONFLICT (key) DO NOTHING;

-- Ligne telle qu'elle apparaît dans le Sheet
CREATE OR REPLACE FUNCTION public.contact_request_sheet_row(r public.contact_requests, _deleted BOOLEAN DEFAULT false)
RETURNS JSONB LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', r.id,
    'numero', COALESCE(r.quote_number, ''),
    'date', to_char(r.created_at AT TIME ZONE 'Africa/Casablanca', 'YYYY-MM-DD HH24:MI'),
    'type', CASE r.request_type WHEN 'devis' THEN 'Devis' ELSE 'Contact' END,
    'statut', CASE WHEN _deleted THEN 'Supprimée du site' ELSE CASE r.status
        WHEN 'nouveau' THEN 'Nouveau' WHEN 'contacte' THEN 'Contacté' WHEN 'devis_envoye' THEN 'Devis envoyé'
        WHEN 'gagne' THEN 'Gagné' WHEN 'perdu' THEN 'Perdu' ELSE r.status END END,
    'nom', r.full_name,
    'telephone', COALESCE(r.phone, ''),
    'email', CASE WHEN r.email LIKE '%@no-email.local' THEN '' ELSE r.email END,
    'entreprise', COALESCE(r.company, ''),
    'ville', COALESCE(r.city, ''),
    'usage', COALESCE(r.usage_type, ''),
    'equipements', COALESCE((SELECT string_agg((i->>'name') || ' ×' || COALESCE(i->>'quantity', '1'), ' ; ')
                             FROM jsonb_array_elements(r.items) i), ''),
    'message', COALESCE(r.message, ''),
    'montant', COALESCE(r.amount::TEXT, ''),
    'relance', COALESCE(r.follow_up_date::TEXT, ''),
    'notes', COALESCE(r.notes, ''),
    'source', COALESCE(r.utm_source, r.referrer, 'direct'),
    'support', COALESCE(r.utm_medium, ''),
    'campagne', COALESCE(r.utm_campaign, ''),
    'page_arrivee', COALESCE(r.landing_page, '')
  )
$$;

CREATE OR REPLACE FUNCTION public.push_rows_to_sheet(_rows JSONB)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _url TEXT;
  _secret TEXT;
BEGIN
  SELECT value INTO _url FROM public.private_settings WHERE key = 'google_sheet_webhook_url';
  SELECT value INTO _secret FROM public.private_settings WHERE key = 'google_sheet_secret';
  IF COALESCE(_url, '') = '' OR _url !~ '^https://script\.google\.com/' THEN RETURN NULL; END IF;
  RETURN net.http_post(
    url := _url,
    body := jsonb_build_object('secret', _secret, 'rows', _rows),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
END $$;
REVOKE ALL ON FUNCTION public.push_rows_to_sheet(JSONB) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.contact_requests_to_sheet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- un souci d'envoi ne doit jamais empêcher l'enregistrement de la demande
  BEGIN
    IF TG_OP = 'DELETE' THEN
      PERFORM public.push_rows_to_sheet(jsonb_build_array(public.contact_request_sheet_row(OLD, true)));
    ELSE
      PERFORM public.push_rows_to_sheet(jsonb_build_array(public.contact_request_sheet_row(NEW)));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Envoi Google Sheet impossible : %', SQLERRM;
  END;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS contact_requests_to_sheet ON public.contact_requests;
CREATE TRIGGER contact_requests_to_sheet AFTER INSERT OR UPDATE OR DELETE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.contact_requests_to_sheet();

-- Bouton « Tout renvoyer » (Admin → Intégrations) : renvoie toutes les demandes, par paquets de 200.
CREATE OR REPLACE FUNCTION public.resync_sheet()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _total INT := 0;
  _batch JSONB;
  _offset INT := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès réservé à l''administrateur';
  END IF;
  IF COALESCE((SELECT value FROM public.private_settings WHERE key = 'google_sheet_webhook_url'), '') = '' THEN
    RAISE EXCEPTION 'Aucune adresse Google Sheet configurée';
  END IF;
  LOOP
    SELECT jsonb_agg(public.contact_request_sheet_row(c) ORDER BY c.created_at) INTO _batch
    FROM (SELECT * FROM public.contact_requests ORDER BY created_at LIMIT 200 OFFSET _offset) c;
    EXIT WHEN _batch IS NULL;
    PERFORM public.push_rows_to_sheet(_batch);
    _total := _total + jsonb_array_length(_batch);
    _offset := _offset + 200;
  END LOOP;
  RETURN _total;
END $$;
REVOKE ALL ON FUNCTION public.resync_sheet() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resync_sheet() TO authenticated;
