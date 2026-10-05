-- Étape 4 — donner le rôle admin au compte du client (ou de DMC).
--
-- Prérequis : le compte existe dans Authentication → Users
-- (« Add user » → « Create new user », cocher « Auto Confirm User »).
--
-- Remplacer l'email ci-dessous, puis exécuter. Idempotent.

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'ADMIN@EXEMPLE.MA'
ON CONFLICT (user_id, role) DO NOTHING;

-- Contrôle : doit lister le compte.
SELECT u.email, r.role
FROM public.user_roles r
JOIN auth.users u ON u.id = r.user_id;
