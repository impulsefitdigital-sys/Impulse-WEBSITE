-- Sous-titre libre affiche au-dessus du titre sur les pages Realisations et Solutions.
-- Sur /realisations il remplace la categorie ; sur /consulting il remplace le libelle
-- genere "01 — Solution". Vide par defaut : le comportement precedent est conserve.
ALTER TABLE public.realisations
  ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT '';

ALTER TABLE public.consulting_services
  ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT '';
