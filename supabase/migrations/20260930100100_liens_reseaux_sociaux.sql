-- Liens Instagram / Facebook officiels (demande client du 30/09/2026).
-- Modifiables ensuite dans Admin → Coordonnées. Idempotent.

INSERT INTO public.contact_settings (key, value) VALUES
  ('social_instagram', 'https://www.instagram.com/impulse_fitness_morocco/'),
  ('social_facebook',  'https://www.facebook.com/profile.php?id=61579067722030')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
