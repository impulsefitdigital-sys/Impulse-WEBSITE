-- Historique des modifications — 30/09/2026
--
-- Chaque ajout / modification / suppression faite dans l'admin est enregistré : qui, quand, quelle
-- table, quelle fiche, quels champs, avec l'ancienne et la nouvelle valeur (permet de restaurer).
-- Écran : Admin → Paramètres → Historique. Conservation : 12 mois (purge_audit_log()).
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  user_email TEXT,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  old_data JSONB,
  new_data JSONB
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log (table_name, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read audit log" ON public.audit_log;
CREATE POLICY "Admins can read audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
-- pas de politique d'écriture : seul le déclencheur (SECURITY DEFINER) écrit

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _old JSONB := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  _new JSONB := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  _changed TEXT[] := '{}';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(array_agg(k ORDER BY k), '{}') INTO _changed
    FROM jsonb_object_keys(_new) k
    WHERE k NOT IN ('updated_at') AND _new->k IS DISTINCT FROM _old->k;
    IF array_length(_changed, 1) IS NULL THEN RETURN NULL; END IF; -- rien de réel n'a changé
  END IF;

  INSERT INTO public.audit_log (user_id, user_email, table_name, record_id, action, changed_fields, old_data, new_data)
  VALUES (
    auth.uid(),
    auth.jwt()->>'email',
    TG_TABLE_NAME,
    COALESCE(_new->>'id', _old->>'id', _new->>'key', _old->>'key'),
    TG_OP,
    _changed,
    _old,
    _new
  );
  RETURN NULL;
END $$;

-- Tables du contenu du site + suivi des demandes (pas les envois de formulaires eux-mêmes)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products', 'product_images', 'product_ranges', 'equipment_categories', 'equipment_subcategories',
    'hero_slides', 'category_cards', 'home_sections', 'about_sections', 'consulting_services',
    'realisations', 'realisation_images', 'testimonials', 'blog_posts', 'faqs', 'contact_settings'
    -- private_settings volontairement exclue : la clé secrète du Sheet ne doit pas être recopiée ici
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger()', t);
  END LOOP;
END $$;

-- demandes : on trace le suivi (statut, notes, montant…) et les suppressions, pas l'envoi par le visiteur
DROP TRIGGER IF EXISTS audit_contact_requests ON public.contact_requests;
CREATE TRIGGER audit_contact_requests AFTER UPDATE OR DELETE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_newsletter_subscribers ON public.newsletter_subscribers;
CREATE TRIGGER audit_newsletter_subscribers AFTER DELETE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Purge des entrées de plus de 12 mois (appelée à l'ouverture de l'écran Historique)
CREATE OR REPLACE FUNCTION public.purge_audit_log()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RETURN 0; END IF;
  DELETE FROM public.audit_log WHERE created_at < now() - interval '12 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.purge_audit_log() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_audit_log() TO authenticated;
