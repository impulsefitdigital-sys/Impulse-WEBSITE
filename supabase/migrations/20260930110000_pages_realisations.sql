-- Pages de détail des réalisations (demande client du 30/09/2026)
--
-- /realisations/<slug> : texte du projet, chiffres clés, et trois blocs d'images :
--   3d           → rendus 3D de l'implantation
--   installation → photos du chantier (livraison, montage)
--   resultat     → photos de la salle terminée
-- Un bloc sans image s'affiche comme un emplacement vide (maquette) :
-- ajouter les photos, modifier ou supprimer les blocs dans Admin → Réalisations.
-- Les textes sont une base de travail À VALIDER avec le client.
--
-- Idempotent.

ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';
ALTER TABLE public.realisations ADD COLUMN IF NOT EXISTS key_facts JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.realisation_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realisation_id UUID NOT NULL REFERENCES public.realisations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('3d', 'installation', 'resultat')),
  image_url TEXT,
  caption TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_realisation_images_realisation ON public.realisation_images(realisation_id, kind, sort_order);
ALTER TABLE public.realisation_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read images of active realisations" ON public.realisation_images;
CREATE POLICY "Public can read images of active realisations" ON public.realisation_images
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.realisations r WHERE r.id = realisation_id AND r.is_active = true));

DROP POLICY IF EXISTS "Admins can manage realisation images" ON public.realisation_images;
CREATE POLICY "Admins can manage realisation images" ON public.realisation_images
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Slug unique : une page = une adresse
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'realisations_slug_key') THEN
    UPDATE public.realisations SET slug = btrim(slug);
    ALTER TABLE public.realisations ADD CONSTRAINT realisations_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Contenu de départ des 4 réalisations existantes (seulement si pas encore rédigé)
UPDATE public.realisations SET
  title = btrim(title),
  slug = $r$army-gym-el-jadida$r$,
  content = $r$# Le projet
Army Gym est une salle de sport de El Jadida qui a fait confiance à Impulse Fitness Maroc pour équiper une salle haut de gamme d'environ 500 m², avec cardio et musculation professionnels. Cette page présente le projet de l'étude à l'ouverture : le besoin du client, la conception en 3D, l'installation et le résultat.

# Le besoin
- Offrir aux adhérents des **équipements de qualité commerciale**, conçus pour un usage intensif.
- Organiser l'espace en zones claires (cardio, musculation guidée, charges libres) pour fluidifier la circulation aux heures de pointe.
- Pouvoir compter sur un **service après-vente au Maroc** pour garantir la continuité de service.

# Notre solution
- **Étude de l'espace** et analyse du profil des adhérents.
- **Plan d'implantation et rendu 3D** validés avec le client avant la commande.
- Sélection des équipements dans les gammes [cardio](/professionnel/cardio) et [musculation professionnelle](/professionnel/musculation) Impulse.
- **Livraison, montage et réglages** par nos techniciens, puis prise en main avec l'équipe de la salle.

# Le résultat
Une salle cohérente et fonctionnelle, dont les adhérents profitent chaque jour. Vous avez un projet similaire ? [Contactez-nous](/contact) ou découvrez notre accompagnement [Consulting](/consulting).$r$,
  key_facts = $r$[{"label":"Type de projet","value":"Salle de sport"},{"label":"Ville","value":"El Jadida"},{"label":"Surface","value":"≈ 500 m²"},{"label":"Équipements","value":"Cardio · Musculation"}]$r$::jsonb
WHERE id = 'cdea5208-81c4-42cf-9067-c9b7eec22ca2' AND content = '';

UPDATE public.realisations SET
  title = btrim(title),
  slug = $r$energy-form-rabat$r$,
  content = $r$# Le projet
Energy Form est un espace fitness privé aménagé sur mesure à Rabat. L'objectif : disposer à domicile d'équipements de qualité, intégrés harmonieusement à la maison. Cette page présente le projet, de la conception en 3D à l'installation.

# Le besoin
- S'entraîner chez soi, à toute heure, avec des appareils fiables et silencieux.
- Un espace **esthétique**, en accord avec la décoration de la maison.
- Une installation propre et rapide, sans tracas.

# Notre solution
- **Visite et prise de mesures**, puis proposition d'implantation en **3D**.
- Sélection d'équipements [cardio](/residentiel/cardio) et de [musculation](/residentiel/musculation) adaptés aux objectifs du client et à la surface.
- **Livraison et montage à domicile** par nos techniciens, réglages et conseils d'utilisation.

# Le résultat
Un home gym complet et élégant, prêt à l'emploi. Vous souhaitez créer le vôtre ? [Contactez-nous](/contact) ou venez tester nos appareils au showroom.$r$,
  key_facts = $r$[{"label":"Type de projet","value":"Home gym"},{"label":"Ville","value":"Rabat"},{"label":"Surface","value":"À préciser"},{"label":"Équipements","value":"À préciser"}]$r$::jsonb
WHERE id = 'a3b259ab-e116-4ecd-b6cc-8d470792b160' AND content = '';

UPDATE public.realisations SET
  title = btrim(title),
  slug = $r$fit-one-tetouan$r$,
  content = $r$# Le projet
Fit'One est une salle de sport de Tétouan qui a fait confiance à Impulse Fitness Maroc pour l'équipement complet de son espace d'entraînement. Cette page présente le projet de l'étude à l'ouverture : le besoin du client, la conception en 3D, l'installation et le résultat.

# Le besoin
- Offrir aux adhérents des **équipements de qualité commerciale**, conçus pour un usage intensif.
- Organiser l'espace en zones claires (cardio, musculation guidée, charges libres) pour fluidifier la circulation aux heures de pointe.
- Pouvoir compter sur un **service après-vente au Maroc** pour garantir la continuité de service.

# Notre solution
- **Étude de l'espace** et analyse du profil des adhérents.
- **Plan d'implantation et rendu 3D** validés avec le client avant la commande.
- Sélection des équipements dans les gammes [cardio](/professionnel/cardio) et [musculation professionnelle](/professionnel/musculation) Impulse.
- **Livraison, montage et réglages** par nos techniciens, puis prise en main avec l'équipe de la salle.

# Le résultat
Une salle cohérente et fonctionnelle, dont les adhérents profitent chaque jour. Vous avez un projet similaire ? [Contactez-nous](/contact) ou découvrez notre accompagnement [Consulting](/consulting).$r$,
  key_facts = $r$[{"label":"Type de projet","value":"Salle de sport"},{"label":"Ville","value":"Tétouan"},{"label":"Surface","value":"À préciser"},{"label":"Équipements","value":"Cardio · Musculation"}]$r$::jsonb
WHERE id = '4ad1d1b5-2dcd-431d-9533-f33fcc13f37b' AND content = '';

UPDATE public.realisations SET
  title = btrim(title),
  slug = $r$kd-fit-khenifra$r$,
  content = $r$# Le projet
KD Fit est une salle de sport de Khénifra qui a fait confiance à Impulse Fitness Maroc pour créer un espace fitness moderne. Cette page présente le projet de l'étude à l'ouverture : le besoin du client, la conception en 3D, l'installation et le résultat.

# Le besoin
- Offrir aux adhérents des **équipements de qualité commerciale**, conçus pour un usage intensif.
- Organiser l'espace en zones claires (cardio, musculation guidée, charges libres) pour fluidifier la circulation aux heures de pointe.
- Pouvoir compter sur un **service après-vente au Maroc** pour garantir la continuité de service.

# Notre solution
- **Étude de l'espace** et analyse du profil des adhérents.
- **Plan d'implantation et rendu 3D** validés avec le client avant la commande.
- Sélection des équipements dans les gammes [cardio](/professionnel/cardio) et [musculation professionnelle](/professionnel/musculation) Impulse.
- **Livraison, montage et réglages** par nos techniciens, puis prise en main avec l'équipe de la salle.

# Le résultat
Une salle cohérente et fonctionnelle, dont les adhérents profitent chaque jour. Vous avez un projet similaire ? [Contactez-nous](/contact) ou découvrez notre accompagnement [Consulting](/consulting).$r$,
  key_facts = $r$[{"label":"Type de projet","value":"Salle de sport"},{"label":"Ville","value":"Khénifra"},{"label":"Surface","value":"À préciser"},{"label":"Équipements","value":"À préciser"}]$r$::jsonb
WHERE id = '2516e29c-db0b-4460-8a29-50b2035f85ad' AND content = '';

-- Blocs d'images vides (maquette) — seulement si la réalisation n'en a aucun
INSERT INTO public.realisation_images (realisation_id, kind, caption, sort_order)
SELECT v.realisation_id::uuid, v.kind, v.caption, v.sort_order
FROM (VALUES
  ('cdea5208-81c4-42cf-9067-c9b7eec22ca2', '3d', $r$Vue 3D d'ensemble de la salle$r$, 0),
  ('cdea5208-81c4-42cf-9067-c9b7eec22ca2', '3d', $r$Vue 3D de la zone musculation$r$, 1),
  ('cdea5208-81c4-42cf-9067-c9b7eec22ca2', 'installation', $r$Livraison des équipements$r$, 2),
  ('cdea5208-81c4-42cf-9067-c9b7eec22ca2', 'installation', $r$Montage par nos techniciens$r$, 3),
  ('cdea5208-81c4-42cf-9067-c9b7eec22ca2', 'installation', $r$Réglages et mise en service$r$, 4),
  ('cdea5208-81c4-42cf-9067-c9b7eec22ca2', 'resultat', $r$La salle terminée — vue d'ensemble$r$, 5),
  ('cdea5208-81c4-42cf-9067-c9b7eec22ca2', 'resultat', $r$Zone cardio$r$, 6),
  ('cdea5208-81c4-42cf-9067-c9b7eec22ca2', 'resultat', $r$Zone musculation$r$, 7),
  ('a3b259ab-e116-4ecd-b6cc-8d470792b160', '3d', $r$Vue 3D de l'espace fitness$r$, 0),
  ('a3b259ab-e116-4ecd-b6cc-8d470792b160', '3d', $r$Vue 3D — implantation des appareils$r$, 1),
  ('a3b259ab-e116-4ecd-b6cc-8d470792b160', 'installation', $r$Livraison à domicile$r$, 2),
  ('a3b259ab-e116-4ecd-b6cc-8d470792b160', 'installation', $r$Montage et réglages$r$, 3),
  ('a3b259ab-e116-4ecd-b6cc-8d470792b160', 'resultat', $r$L'espace fitness terminé$r$, 4),
  ('a3b259ab-e116-4ecd-b6cc-8d470792b160', 'resultat', $r$Détail des équipements$r$, 5),
  ('4ad1d1b5-2dcd-431d-9533-f33fcc13f37b', '3d', $r$Vue 3D d'ensemble de la salle$r$, 0),
  ('4ad1d1b5-2dcd-431d-9533-f33fcc13f37b', '3d', $r$Vue 3D de la zone musculation$r$, 1),
  ('4ad1d1b5-2dcd-431d-9533-f33fcc13f37b', 'installation', $r$Livraison des équipements$r$, 2),
  ('4ad1d1b5-2dcd-431d-9533-f33fcc13f37b', 'installation', $r$Montage par nos techniciens$r$, 3),
  ('4ad1d1b5-2dcd-431d-9533-f33fcc13f37b', 'installation', $r$Réglages et mise en service$r$, 4),
  ('4ad1d1b5-2dcd-431d-9533-f33fcc13f37b', 'resultat', $r$La salle terminée — vue d'ensemble$r$, 5),
  ('4ad1d1b5-2dcd-431d-9533-f33fcc13f37b', 'resultat', $r$Zone cardio$r$, 6),
  ('4ad1d1b5-2dcd-431d-9533-f33fcc13f37b', 'resultat', $r$Zone musculation$r$, 7),
  ('2516e29c-db0b-4460-8a29-50b2035f85ad', '3d', $r$Vue 3D d'ensemble de la salle$r$, 0),
  ('2516e29c-db0b-4460-8a29-50b2035f85ad', '3d', $r$Vue 3D de la zone musculation$r$, 1),
  ('2516e29c-db0b-4460-8a29-50b2035f85ad', 'installation', $r$Livraison des équipements$r$, 2),
  ('2516e29c-db0b-4460-8a29-50b2035f85ad', 'installation', $r$Montage par nos techniciens$r$, 3),
  ('2516e29c-db0b-4460-8a29-50b2035f85ad', 'installation', $r$Réglages et mise en service$r$, 4),
  ('2516e29c-db0b-4460-8a29-50b2035f85ad', 'resultat', $r$La salle terminée — vue d'ensemble$r$, 5),
  ('2516e29c-db0b-4460-8a29-50b2035f85ad', 'resultat', $r$Zone cardio$r$, 6),
  ('2516e29c-db0b-4460-8a29-50b2035f85ad', 'resultat', $r$Zone musculation$r$, 7)
) AS v(realisation_id, kind, caption, sort_order)
WHERE EXISTS (SELECT 1 FROM public.realisations r WHERE r.id = v.realisation_id::uuid)
  AND NOT EXISTS (SELECT 1 FROM public.realisation_images ri WHERE ri.realisation_id = v.realisation_id::uuid);
