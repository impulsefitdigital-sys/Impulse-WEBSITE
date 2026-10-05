
UPDATE about_sections 
SET content = '+|50|ans d''expertise
+|100|pays desservis
+|750|brevets déposés
+|85|% de fidélisation'
WHERE key = 'chiffres_cles';

DELETE FROM blog_posts WHERE slug IN ('choisir-tapis-course-professionnel','creer-home-gym-ideal','amenager-salle-de-sport-etapes-cles');

UPDATE blog_posts SET published_at = '2026-05-03 10:00:00+00' WHERE slug = 'impulse-ouvre-au-maroc';
UPDATE blog_posts SET published_at = '2026-05-03 09:00:00+00' WHERE slug = 'transformation-marche-fitness-maroc';
UPDATE blog_posts SET published_at = '2026-05-03 08:00:00+00' WHERE slug = 'sav-impulse-securite-technique';
