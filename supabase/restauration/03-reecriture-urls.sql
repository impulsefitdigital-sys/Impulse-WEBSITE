-- Étape 3 — liens des images : de l'ancien Supabase vers le site lui-même (Netlify).
--
-- La sauvegarde contient des URL de l'ancien projet (cxeafynonjezukddtpxg, propriété de
-- l'ancienne agence). Les 1 068 images du site sont livrées avec le site (dossier /storage/,
-- servi par le CDN de Netlify) : on remplace donc l'ancien préfixe par « /storage/ ».
-- Avantage : les images ne consomment pas la bande passante du plan gratuit Supabase.
-- Les images ajoutées plus tard dans l'admin iront, elles, dans le Storage du nouveau projet.
--
-- Aucune modification à faire avant d'exécuter. Idempotent.

DO $$
DECLARE
  ancien  text := 'https://cxeafynonjezukddtpxg.supabase.co/storage/v1/object/public/';
  nouveau text := '/storage/';
BEGIN
  UPDATE public.hero_slides             SET image_url       = replace(image_url,       ancien, nouveau);
  UPDATE public.category_cards          SET image_url       = replace(image_url,       ancien, nouveau);
  UPDATE public.equipment_categories    SET image_url       = replace(image_url,       ancien, nouveau);
  UPDATE public.equipment_subcategories SET image_url       = replace(image_url,       ancien, nouveau);
  UPDATE public.products                SET image_url       = replace(image_url,       ancien, nouveau),
                                            hover_image_url = replace(hover_image_url, ancien, nouveau);
  UPDATE public.product_images          SET image_url       = replace(image_url,       ancien, nouveau);
  UPDATE public.realisations            SET image_url       = replace(image_url,       ancien, nouveau);
  UPDATE public.consulting_services     SET image_url       = replace(image_url,       ancien, nouveau);
  UPDATE public.blog_posts              SET cover_image_url = replace(cover_image_url, ancien, nouveau);
END $$;

-- Contrôle : doit renvoyer 0 partout.
SELECT 'products' AS table_, count(*) FROM public.products
  WHERE image_url LIKE '%cxeafynonjezukddtpxg%' OR hover_image_url LIKE '%cxeafynonjezukddtpxg%'
UNION ALL SELECT 'product_images', count(*) FROM public.product_images WHERE image_url LIKE '%cxeafynonjezukddtpxg%'
UNION ALL SELECT 'blog_posts', count(*) FROM public.blog_posts WHERE cover_image_url LIKE '%cxeafynonjezukddtpxg%'
UNION ALL SELECT 'autres (carrousel, cartes, catégories…)', (
  (SELECT count(*) FROM public.hero_slides WHERE image_url LIKE '%cxeafynonjezukddtpxg%') +
  (SELECT count(*) FROM public.category_cards WHERE image_url LIKE '%cxeafynonjezukddtpxg%') +
  (SELECT count(*) FROM public.equipment_categories WHERE image_url LIKE '%cxeafynonjezukddtpxg%') +
  (SELECT count(*) FROM public.equipment_subcategories WHERE image_url LIKE '%cxeafynonjezukddtpxg%') +
  (SELECT count(*) FROM public.realisations WHERE image_url LIKE '%cxeafynonjezukddtpxg%') +
  (SELECT count(*) FROM public.consulting_services WHERE image_url LIKE '%cxeafynonjezukddtpxg%'));
