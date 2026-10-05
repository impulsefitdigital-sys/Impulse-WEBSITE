-- Statistiques du site (mesure d'audience maison) — 30/09/2026
--
-- Chaque visite envoie de petits événements anonymes : début de session, page vue, produit vu,
-- recherche, ajout au devis, début / envoi du formulaire, clics WhatsApp / téléphone / email.
-- • session_id : identifiant aléatoire de l'onglet (30 min), aucune donnée personnelle
-- • visitor_id : seulement si le visiteur a accepté les cookies « Statistiques »
-- • utm_* / referrer : provenance (campagne, réseau social, Google…), sur l'événement session_start
-- Lecture : admin uniquement, via analytics_report() (agrégats, pas de données brutes côté navigateur).
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event TEXT NOT NULL,
  session_id TEXT,
  visitor_id TEXT,
  path TEXT,
  product_id TEXT,
  label TEXT,
  value NUMERIC,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  device TEXT,
  CONSTRAINT analytics_events_event_check CHECK (event IN (
    'session_start', 'page_view', 'product_view', 'search', 'quote_add', 'quote_open',
    'form_start', 'quote_submit', 'contact_submit', 'whatsapp_click', 'phone_click', 'email_click'
  )),
  CONSTRAINT analytics_events_sizes_check CHECK (
    length(COALESCE(session_id, '')) <= 64 AND length(COALESCE(visitor_id, '')) <= 64
    AND length(COALESCE(path, '')) <= 300 AND length(COALESCE(product_id, '')) <= 64
    AND length(COALESCE(label, '')) <= 200 AND length(COALESCE(referrer, '')) <= 300
    AND length(COALESCE(utm_source, '')) <= 120 AND length(COALESCE(utm_medium, '')) <= 120
    AND length(COALESCE(utm_campaign, '')) <= 200
    AND (device IS NULL OR device IN ('mobile', 'tablet', 'desktop'))
  )
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created ON public.analytics_events (event, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events (session_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can send analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can send analytics events" ON public.analytics_events
  FOR INSERT TO anon, authenticated WITH CHECK (created_at > now() - interval '5 minutes' AND created_at < now() + interval '5 minutes');

DROP POLICY IF EXISTS "Admins can read analytics events" ON public.analytics_events;
CREATE POLICY "Admins can read analytics events" ON public.analytics_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete analytics events" ON public.analytics_events;
CREATE POLICY "Admins can delete analytics events" ON public.analytics_events
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------- conservation
-- 13 mois glissants (comparaison d'une année sur l'autre) : la table reste petite,
-- compatible avec les 500 Mo du plan gratuit Supabase. Appelée à l'ouverture de l'écran Statistiques.
CREATE OR REPLACE FUNCTION public.purge_analytics_events()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RETURN 0; END IF;
  DELETE FROM public.analytics_events WHERE created_at < now() - interval '13 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.purge_analytics_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_analytics_events() TO authenticated;

-- ---------------------------------------------------------------- rapport
-- Renvoie tous les indicateurs de l'écran Admin → Statistiques pour une période.
CREATE OR REPLACE FUNCTION public.analytics_report(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès réservé à l''administrateur';
  END IF;

  WITH ev AS (
    SELECT * FROM public.analytics_events WHERE created_at >= p_from AND created_at < p_to
  ),
  sessions AS (
    SELECT session_id,
      bool_or(event = 'product_view') AS has_product,
      bool_or(event = 'quote_add') AS has_add,
      bool_or(event = 'form_start') AS has_form,
      bool_or(event = 'quote_submit') AS has_quote,
      bool_or(event = 'contact_submit') AS has_contact
    FROM ev WHERE session_id IS NOT NULL GROUP BY session_id
  ),
  starts AS (
    SELECT DISTINCT ON (session_id) session_id, utm_source, utm_medium, utm_campaign, referrer, device
    FROM ev WHERE event = 'session_start' AND session_id IS NOT NULL
    ORDER BY session_id, created_at
  ),
  src AS (
    SELECT
      COALESCE(NULLIF(st.utm_source, ''), NULLIF(st.referrer, ''), 'direct') AS source,
      COALESCE(st.utm_medium, '') AS medium,
      COALESCE(st.utm_campaign, '') AS campaign,
      s.has_quote, s.has_contact
    FROM starts st JOIN sessions s USING (session_id)
  )
  SELECT jsonb_build_object(
    'totals', (SELECT jsonb_build_object(
      'sessions', (SELECT count(*) FROM sessions),
      'visitors', (SELECT count(DISTINCT visitor_id) FROM ev WHERE visitor_id IS NOT NULL),
      'page_views', count(*) FILTER (WHERE event = 'page_view'),
      'product_views', count(*) FILTER (WHERE event = 'product_view'),
      'searches', count(*) FILTER (WHERE event = 'search'),
      'quote_adds', count(*) FILTER (WHERE event = 'quote_add'),
      'quote_opens', count(*) FILTER (WHERE event = 'quote_open'),
      'form_starts', count(*) FILTER (WHERE event = 'form_start'),
      'quote_submits', count(*) FILTER (WHERE event = 'quote_submit'),
      'contact_submits', count(*) FILTER (WHERE event = 'contact_submit'),
      'whatsapp_clicks', count(*) FILTER (WHERE event = 'whatsapp_click'),
      'phone_clicks', count(*) FILTER (WHERE event = 'phone_click'),
      'email_clicks', count(*) FILTER (WHERE event = 'email_click')
    ) FROM ev),
    'funnel', (SELECT jsonb_build_object(
      'sessions', count(*),
      'product', count(*) FILTER (WHERE has_product),
      'add', count(*) FILTER (WHERE has_add),
      'form', count(*) FILTER (WHERE has_form),
      'quote', count(*) FILTER (WHERE has_quote)
    ) FROM sessions),
    'daily', (SELECT COALESCE(jsonb_agg(d ORDER BY d.day), '[]'::jsonb) FROM (
      SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'Africa/Casablanca'), 'YYYY-MM-DD') AS day,
        count(DISTINCT session_id) AS sessions,
        count(*) FILTER (WHERE event = 'page_view') AS page_views,
        count(*) FILTER (WHERE event = 'quote_submit') AS quotes,
        count(*) FILTER (WHERE event = 'contact_submit') AS contacts
      FROM ev GROUP BY 1) d),
    'pages', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT path, count(*) AS views FROM ev WHERE event = 'page_view' AND path IS NOT NULL
      GROUP BY path ORDER BY views DESC LIMIT 15) x),
    'products', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT ev.product_id, p.name,
        count(*) FILTER (WHERE event = 'product_view') AS views,
        count(*) FILTER (WHERE event = 'quote_add') AS adds
      FROM ev LEFT JOIN public.products p ON p.id::TEXT = ev.product_id
      WHERE event IN ('product_view', 'quote_add') AND ev.product_id IS NOT NULL
      GROUP BY ev.product_id, p.name ORDER BY views DESC, adds DESC LIMIT 15) x),
    'searches', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT lower(btrim(label)) AS term, count(*) AS count, count(*) FILTER (WHERE value = 0) AS no_result
      FROM ev WHERE event = 'search' AND label IS NOT NULL
      GROUP BY 1 ORDER BY count DESC LIMIT 20) x),
    'sources', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT source, medium, campaign, count(*) AS sessions,
        count(*) FILTER (WHERE has_quote) AS quotes,
        count(*) FILTER (WHERE has_contact) AS contacts
      FROM src GROUP BY source, medium, campaign ORDER BY sessions DESC LIMIT 20) x),
    'devices', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT COALESCE(device, 'inconnu') AS device, count(*) AS sessions
      FROM starts GROUP BY 1 ORDER BY sessions DESC) x)
  ) INTO result;

  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.analytics_report(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_report(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
