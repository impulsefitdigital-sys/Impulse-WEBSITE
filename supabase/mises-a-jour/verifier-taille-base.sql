-- Vérifier l'espace utilisé dans Supabase (plan gratuit : 500 Mo). À lancer quand on veut, ne modifie rien.
SELECT
  pg_size_pretty(pg_database_size(current_database()))                 AS taille_totale_base,
  pg_size_pretty(pg_total_relation_size('public.analytics_events'))    AS taille_statistiques,
  (SELECT count(*) FROM public.analytics_events)                        AS lignes_statistiques,
  (SELECT count(*) FROM public.analytics_events WHERE created_at > now() - interval '1 day') AS lignes_dernieres_24h,
  (SELECT count(*) FROM public.contact_requests)                        AS demandes;
