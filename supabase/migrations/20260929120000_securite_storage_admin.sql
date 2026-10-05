-- Correctif sécurité (reprise DMC, 29/09/2026)
--
-- Les politiques d'origine du bucket `product-images` s'appelaient « Admins can … »
-- mais ne vérifiaient QUE la connexion : tout compte connecté pouvait envoyer,
-- modifier ou supprimer des images. On les remplace par une vérification du rôle
-- admin, comme pour le bucket `blog-images`.
--
-- Idempotent : peut être rejoué sans erreur.

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
