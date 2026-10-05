
-- Shift existing sections to make room for chiffres_cles at sort_order 2
UPDATE public.about_sections SET sort_order = sort_order + 1 WHERE sort_order >= 2;

-- Insert the new "Chiffres Clés" section
INSERT INTO public.about_sections (key, title, content, sort_order, is_active)
VALUES (
  'chiffres_cles',
  'Les Chiffres Clés',
  E'• Surface opérationnelle : 200 000 m² (28 terrains de football)\n• Capacité de production annuelle : 6,2 MMDH\n• Volume d''exportation : 4 000 conteneurs (40 pieds)\n• Personnel : 1 600 collaborateurs (40 ingénieurs R&D)\n• Expérience : 50 ans\n• Côté en bourse : 10 ans\n• Nombre de brevets déposés : +750\n• Présence mondiale : +100 pays\n• Taux de fidélisation : +85%\n• Part de la R&D dans le CA : 5%',
  2,
  true
);
