-- IMPULSE — 19/10/2026 : remettre les sous-catégories supprimées.
-- Remet UNIQUEMENT celles qui manquent ; celles qui existent encore ne sont pas modifiées.
-- Supabase > SQL Editor > New query : coller tout, « Run ». Peut être relancé sans risque.

-- Avant : nombre de sous-catégories par espace et catégorie
SELECT usage_type, category_slug, count(*) AS sous_categories
FROM public.equipment_subcategories GROUP BY 1, 2 ORDER BY 1, 2;

-- 1) D'abord depuis l'historique : la dernière version de chaque sous-catégorie supprimée
--    (garde les images et textes que vous aviez mis juste avant la suppression)
INSERT INTO public.equipment_subcategories
SELECT (jsonb_populate_record(NULL::public.equipment_subcategories, d.old_data)).*
FROM (
  SELECT DISTINCT ON (old_data->>'slug', old_data->>'category_slug', old_data->>'usage_type') old_data
  FROM public.audit_log
  WHERE table_name = 'equipment_subcategories' AND action = 'DELETE'
    AND created_at > now() - interval '7 days'
    AND old_data->>'slug' IN ('tapis-de-course','elliptiques','velos','climbmills','steppers','rameurs',
                              'hiit-cardio','cages-rigs','multi-stations','mono-stations','charges-libres','charges-guidees')
  ORDER BY old_data->>'slug', old_data->>'category_slug', old_data->>'usage_type', created_at DESC
) d
WHERE NOT EXISTS (
  SELECT 1 FROM public.equipment_subcategories s
  WHERE (s.slug = d.old_data->>'slug' AND s.category_slug = d.old_data->>'category_slug' AND s.usage_type = d.old_data->>'usage_type')
     OR s.id = (d.old_data->>'id')::uuid
);

-- 2) Puis, pour ce qui manquerait encore, les valeurs d'origine du site
INSERT INTO public.equipment_subcategories (slug, title, description, image_url, category_slug, sort_order, is_active, usage_type)
SELECT v.slug, v.title, v.description, v.image_url, v.category_slug, v.sort_order, v.is_active, v.usage_type
FROM (VALUES
  ('tapis-de-course', 'Tapis de course', '', '/storage/product-images/subcategories/1782430717131.webp', 'cardio', 0, true, 'professionnel'),
  ('elliptiques', 'Elliptiques', '', '/storage/product-images/subcategories/1782430736394.webp', 'cardio', 1, true, 'professionnel'),
  ('velos', 'Vélos', '', '/storage/product-images/subcategories/1782430758068.webp', 'cardio', 2, true, 'professionnel'),
  ('climbmills', 'Climbmills', '', '/storage/product-images/subcategories/1782430773922.webp', 'cardio', 3, true, 'professionnel'),
  ('hiit-cardio', 'HIIT Cardio', '', '/storage/product-images/subcategories/1778027263412.webp', 'fonctionnel', 0, true, 'professionnel'),
  ('cages-rigs', 'Cages & Rigs', '', '/storage/product-images/subcategories/1778027296489.webp', 'fonctionnel', 1, true, 'professionnel'),
  ('multi-stations', 'Multi-stations', '', '/storage/product-images/subcategories/1782432574976.webp', 'musculation', 0, true, 'professionnel'),
  ('mono-stations', 'Mono-stations', '', '/storage/product-images/subcategories/1782432618496.webp', 'musculation', 1, true, 'professionnel'),
  ('charges-libres', 'Charges Libres', '', '/storage/product-images/subcategories/1782432643605.webp', 'musculation', 2, true, 'professionnel'),
  ('charges-guidees', 'Charges Guidées', '', '/storage/product-images/subcategories/1782432662011.webp', 'musculation', 3, true, 'professionnel'),
  ('tapis-de-course', 'Tapis de course', '', '/storage/product-images/subcategories/1784122312202.webp', 'cardio', 0, true, 'residentiel'),
  ('elliptiques', 'Elliptiques', '', '/storage/product-images/subcategories/1784122315668.webp', 'cardio', 1, true, 'residentiel'),
  ('climbmills', 'Climbmills', '', '/storage/product-images/subcategories/1784122320331.webp', 'cardio', 2, true, 'residentiel'),
  ('steppers', 'Steppers', '', '/storage/product-images/subcategories/1784122324125.webp', 'cardio', 3, true, 'residentiel'),
  ('velos', 'Vélos', '', NULL, 'cardio', 4, true, 'residentiel'),
  ('rameurs', 'Rameurs', '', NULL, 'cardio', 5, true, 'residentiel'),
  ('hiit-cardio', 'HIIT Cardio', '', NULL, 'fonctionnel', 0, true, 'residentiel'),
  ('cages-rigs', 'Cages & Rigs', '', NULL, 'fonctionnel', 1, true, 'residentiel'),
  ('multi-stations', 'Multi-stations', '', '/storage/product-images/subcategories/1784122648396.webp', 'musculation', 0, true, 'residentiel'),
  ('mono-stations', 'Mono-stations', '', '/storage/product-images/subcategories/1784122653285.webp', 'musculation', 1, true, 'residentiel'),
  ('charges-libres', 'Charges Libres', '', '/storage/product-images/subcategories/1784122657629.webp', 'musculation', 2, true, 'residentiel'),
  ('charges-guidees', 'Charges Guidées', '', '/storage/product-images/subcategories/1784122660686.webp', 'musculation', 3, true, 'residentiel')
) AS v(slug, title, description, image_url, category_slug, sort_order, is_active, usage_type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.equipment_subcategories s
  WHERE s.slug = v.slug AND s.category_slug = v.category_slug AND s.usage_type = v.usage_type
);

-- Résultat affiché : Pro = cardio 4, fonctionnel 2, musculation 4 ; Résidentiel = cardio 6, fonctionnel 2, musculation 4 (22 au total)
SELECT usage_type, category_slug, count(*) AS sous_categories
FROM public.equipment_subcategories GROUP BY ROLLUP (1, 2) ORDER BY 1, 2;
