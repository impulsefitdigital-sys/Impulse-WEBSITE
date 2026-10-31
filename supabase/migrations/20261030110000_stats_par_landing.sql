-- Statistiques par landing page (LP1 / LP2) — 30/10/2026
--
-- Remplace la fonction analytics_report (contient aussi la mise à jour « 2026-10-30-stats-lp2.sql » :
-- inutile d'exécuter celle-ci si ce fichier est exécuté).
--   p_scope = 'all' | 'landing' (LP1 + LP2) | 'lp1' (/lp/musculation) | 'lp2' (/lp2) | 'site'
--   Un visiteur arrivé par une landing page reste rattaché à celle-ci quand il continue sur le site.
--   Le résultat contient en plus 'landings' : visites par landing page ({"lp1": n, "lp2": n}).
-- L'admin (Landing pages) s'en sert pour le filtre « LP1 / LP2 » et le comparatif des deux landing pages.
-- Sans danger : ne touche à aucune donnée, remplace seulement la fonction de calcul.
-- Idempotent. À coller dans Supabase → SQL Editor → Run.

CREATE OR REPLACE FUNCTION public.analytics_report(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ, p_scope TEXT DEFAULT 'all')
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès réservé à l''administrateur';
  END IF;

  WITH starts_lp AS (
    -- landing page d'arrivée de chaque visite (première page de la session) : lp1 = /lp/…, lp2 = /lp2
    SELECT DISTINCT ON (session_id) session_id,
      CASE WHEN path = '/lp2' OR path LIKE '/lp2/%' THEN 'lp2' ELSE 'lp1' END AS lp
    FROM public.analytics_events
    WHERE event = 'session_start' AND session_id IS NOT NULL
      AND created_at >= p_from - INTERVAL '1 day' AND created_at < p_to
      AND (path LIKE '/lp/%' OR path = '/lp2' OR path LIKE '/lp2/%')
    ORDER BY session_id, created_at
  ),
  tagged AS (
    -- chaque événement rattaché à une landing page : par son adresse, sinon par la page d'arrivée de sa visite
    SELECT e.*, COALESCE(
      CASE WHEN e.path = '/lp2' OR e.path LIKE '/lp2/%' THEN 'lp2' WHEN e.path LIKE '/lp/%' THEN 'lp1' END,
      s.lp) AS lp
    FROM public.analytics_events e
    LEFT JOIN starts_lp s ON s.session_id = e.session_id
    WHERE e.created_at >= p_from AND e.created_at < p_to
  ),
  ev AS (
    -- 'all' : tout ; 'landing' : les deux landing pages ; 'lp1' / 'lp2' : une seule ; 'site' : le reste
    SELECT * FROM tagged
    WHERE COALESCE(p_scope, 'all') = 'all'
      OR (p_scope = 'landing' AND lp IS NOT NULL)
      OR (p_scope = 'site' AND lp IS NULL)
      OR (p_scope IN ('lp1', 'lp2') AND lp = p_scope)
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
      FROM starts GROUP BY 1 ORDER BY sessions DESC) x),
    -- périmètre calculé (l'admin vérifie que la base a bien cette version) + visites par landing page
    'scope', COALESCE(p_scope, 'all'),
    'landings', (SELECT COALESCE(jsonb_object_agg(lp, n), '{}'::jsonb) FROM (
      SELECT lp, count(DISTINCT session_id) AS n FROM tagged
      WHERE lp IS NOT NULL AND session_id IS NOT NULL GROUP BY lp) x)
  ) INTO result;

  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.analytics_report(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_report(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
