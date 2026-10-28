-- Conservation des statistiques : 6 mois au lieu de 13 — 29/10/2026
--
-- Avec les campagnes (600-700 visites par jour), la table analytics_events grossit d'environ
-- 3 000 à 6 000 lignes par jour. Le plan gratuit Supabase est limité à 500 Mo de base : au-delà,
-- la base refuse les écritures (plus aucune demande enregistrée !). On garde donc 6 mois glissants.
-- Les demandes (contact_requests), les produits et tout le reste ne sont PAS concernés.
-- Le ménage se fait à l'ouverture de Admin → Landing page ou Statistiques du site.
-- À coller dans Supabase → SQL Editor → Run. Idempotent.

CREATE OR REPLACE FUNCTION public.purge_analytics_events()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RETURN 0; END IF;
  DELETE FROM public.analytics_events WHERE created_at < now() - interval '6 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.purge_analytics_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_analytics_events() TO authenticated;
