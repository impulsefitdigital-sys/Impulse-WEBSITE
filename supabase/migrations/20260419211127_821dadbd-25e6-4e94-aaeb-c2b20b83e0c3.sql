
-- ============= 1. PRODUCT RANGES =============
CREATE TABLE public.product_ranges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  usage_type TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, usage_type, category, subcategory)
);

ALTER TABLE public.product_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active ranges" ON public.product_ranges
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage ranges" ON public.product_ranges
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_product_ranges_updated_at
  BEFORE UPDATE ON public.product_ranges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add range_code to products
ALTER TABLE public.products ADD COLUMN range_code TEXT;
CREATE INDEX idx_products_range_code ON public.products(range_code);
CREATE INDEX idx_products_filters ON public.products(usage_type, category, subcategory);

-- Seed ranges from the Excel file
INSERT INTO public.product_ranges (code, usage_type, category, subcategory, sort_order) VALUES
-- Professionnel / Cardio
('RT', 'professionnel', 'cardio', 'tapis-de-courses', 1),
('AC4', 'professionnel', 'cardio', 'tapis-de-courses', 2),
('AC8', 'professionnel', 'cardio', 'tapis-de-courses', 3),
('AC2', 'professionnel', 'cardio', 'tapis-de-courses', 4),
('RE', 'professionnel', 'cardio', 'elliptiques', 1),
('RU', 'professionnel', 'cardio', 'velos', 1),
('RR', 'professionnel', 'cardio', 'velos', 2),
('PS', 'professionnel', 'cardio', 'velos', 3),
('XSC', 'professionnel', 'cardio', 'climbmills', 1),
-- Professionnel / Musculation
('IT95', 'professionnel', 'musculation', 'multi-stations', 1),
('IF93', 'professionnel', 'musculation', 'multi-stations', 2),
('Exoform', 'professionnel', 'musculation', 'mono-stations', 1),
('IT95', 'professionnel', 'musculation', 'mono-stations', 2),
('IF93', 'professionnel', 'musculation', 'mono-stations', 3),
('ECP', 'professionnel', 'musculation', 'charges-guidees', 1),
('SL', 'professionnel', 'musculation', 'charges-guidees', 2),
('IFP', 'professionnel', 'musculation', 'charges-guidees', 3),
('SL', 'professionnel', 'musculation', 'charges-libre', 1),
('ITF', 'professionnel', 'musculation', 'charges-libre', 2),
('IT7', 'professionnel', 'musculation', 'charges-libre', 3),
-- Professionnel / Fonctionnel
('HSR', 'professionnel', 'fonctionnel', 'hiit-cardio', 1),
('HB', 'professionnel', 'fonctionnel', 'hiit-cardio', 2),
('MS', 'professionnel', 'fonctionnel', 'cages-rigs', 1),
('FF', 'professionnel', 'fonctionnel', 'cages-rigs', 2),
('HSP', 'professionnel', 'fonctionnel', 'cages-rigs', 3),
('ZONE', 'professionnel', 'fonctionnel', 'cages-rigs', 4),
-- Résidentiel / Cardio
('FGT', 'residentiel', 'cardio', 'tapis-de-courses', 1),
('ECE', 'residentiel', 'cardio', 'elliptiques', 1),
('FGE', 'residentiel', 'cardio', 'elliptiques', 2),
('ECU', 'residentiel', 'cardio', 'velos', 1),
('GU', 'residentiel', 'cardio', 'velos', 2),
('PS', 'residentiel', 'cardio', 'velos', 3),
('HC', 'residentiel', 'cardio', 'climbmills', 1),
-- Résidentiel / Musculation
('IF93', 'residentiel', 'musculation', 'multi-stations', 1),
('IF93', 'residentiel', 'musculation', 'mono-stations', 1),
('IFP', 'residentiel', 'musculation', 'charges-guidees', 1),
('IT7', 'residentiel', 'musculation', 'charges-libre', 1),
('IF', 'residentiel', 'musculation', 'charges-libre', 2),
-- Résidentiel / Fonctionnel
('HSR', 'residentiel', 'fonctionnel', 'hiit-cardio', 1),
('HB', 'residentiel', 'fonctionnel', 'hiit-cardio', 2),
('HC', 'residentiel', 'fonctionnel', 'hiit-cardio', 3),
('MS', 'residentiel', 'fonctionnel', 'cages-rigs', 1),
('FF', 'residentiel', 'fonctionnel', 'cages-rigs', 2),
('HSP', 'residentiel', 'fonctionnel', 'cages-rigs', 3),
('ZONE', 'residentiel', 'fonctionnel', 'cages-rigs', 4);

-- ============= 2. NEWSLETTER =============
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read subscribers" ON public.newsletter_subscribers
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subscribers" ON public.newsletter_subscribers
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ============= 3. FAQS =============
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active faqs" ON public.faqs
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage faqs" ON public.faqs
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.faqs (question, answer, sort_order) VALUES
('Quelles sont vos zones de livraison ?', 'Nous livrons dans tout le Maroc. Pour les commandes professionnelles, nous assurons également la livraison à l''international sur demande. Les délais et frais varient selon la destination et le volume.', 1),
('Proposez-vous l''installation des équipements ?', 'Oui, notre équipe technique se déplace pour installer et mettre en service tous nos équipements professionnels. L''installation est incluse pour les projets clés en main.', 2),
('Quelle garantie offrez-vous sur vos produits ?', 'Tous nos équipements bénéficient d''une garantie constructeur. La durée varie selon la gamme : 2 à 5 ans pour le résidentiel, jusqu''à 10 ans sur la structure pour le professionnel.', 3),
('Comment obtenir un devis personnalisé ?', 'Ajoutez les produits qui vous intéressent à votre devis via le bouton "Voir le devis", puis remplissez le formulaire. Notre équipe vous recontacte sous 24h ouvrées avec une offre détaillée.', 4),
('Proposez-vous un service après-vente ?', 'Absolument. Nous disposons d''une équipe SAV dédiée et d''un stock de pièces détachées. Des contrats de maintenance préventive sont également disponibles pour les salles professionnelles.', 5),
('Puis-je essayer les équipements avant achat ?', 'Oui, notre showroom à Casablanca vous permet de tester l''ensemble de notre gamme. Prenez rendez-vous via le formulaire de contact pour une démonstration personnalisée.', 6),
('Accompagnez-vous les projets de salles de sport ?', 'Oui, notre service consulting accompagne les porteurs de projets de A à Z : étude d''aménagement, plans 3D, sélection d''équipements, formation du personnel et suivi post-ouverture.', 7),
('Quels sont vos modes de paiement ?', 'Nous acceptons les virements bancaires, chèques d''entreprise et règlements par traite. Des facilités de paiement et solutions de leasing sont disponibles pour les projets professionnels.', 8);

-- ============= 4. BLOG POSTS =============
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  author TEXT NOT NULL DEFAULT 'Impulse Fitness',
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published blogs" ON public.blog_posts
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage blogs" ON public.blog_posts
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, is_published, published_at) VALUES
('Comment choisir le bon tapis de course professionnel ?', 'choisir-tapis-course-professionnel',
 'Les critères essentiels pour sélectionner un tapis de course adapté à votre salle de sport : puissance moteur, amorti, surface de course et fiabilité.',
 E'# Comment choisir le bon tapis de course professionnel ?\n\nLe tapis de course est l''équipement cardio le plus utilisé en salle. Son choix est donc stratégique.\n\n## 1. La puissance du moteur\n\nPour un usage professionnel intensif, optez pour un moteur d''au moins **4 CV en continu**. Les gammes RT et AC8 d''Impulse Fitness offrent une puissance allant jusqu''à 6 CV, idéale pour les utilisations 24/7.\n\n## 2. La surface de course\n\nUne surface large (minimum 55 x 155 cm) garantit confort et sécurité, même pour les coureurs de grande taille.\n\n## 3. Le système d''amorti\n\nUn bon amorti réduit l''impact sur les articulations de jusqu''à 30%. Vérifiez la présence de plots élastomères et d''une plateforme flexible.\n\n## 4. Les fonctionnalités connectées\n\nÉcran tactile, applications de coaching, compatibilité Bluetooth : autant d''atouts pour fidéliser vos adhérents.\n\n## Notre recommandation\n\nPour une salle de sport haut de gamme, la gamme **RT (Run Tech)** d''Impulse offre le meilleur rapport durabilité/expérience utilisateur du marché.',
 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200', true, now() - interval '5 days'),

('Aménager une salle de sport : les étapes clés', 'amenager-salle-de-sport-etapes-cles',
 'De l''étude de marché à l''ouverture, découvrez les étapes incontournables pour réussir l''aménagement de votre salle de sport.',
 E'# Aménager une salle de sport : les étapes clés\n\nOuvrir une salle de sport demande une préparation rigoureuse. Voici les étapes que nous recommandons à nos clients.\n\n## 1. L''étude de faisabilité\n\nAvant tout investissement, analysez la zone de chalandise, la concurrence et le profil des futurs adhérents. Cela conditionne le choix des équipements.\n\n## 2. Le plan d''aménagement\n\nNos consultants réalisent des **plans 3D** intégrant les zones cardio, musculation, cours collectifs et services. L''ergonomie des flux est essentielle.\n\n## 3. La sélection des équipements\n\nÉquilibrez votre offre : 30% cardio, 40% musculation guidée, 20% charges libres, 10% fonctionnel. Privilégiez des marques fiables comme **Impulse Fitness**.\n\n## 4. L''installation et la formation\n\nNotre équipe assure la pose complète et forme votre personnel à l''utilisation et à la maintenance de chaque machine.\n\n## 5. Le suivi post-ouverture\n\nNous restons à vos côtés avec un service SAV réactif et des contrats de maintenance préventive.',
 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200', true, now() - interval '12 days'),

('Musculation à la maison : créer son home gym idéal', 'creer-home-gym-ideal',
 'Espace, budget, équipements indispensables : nos conseils pour transformer une pièce en véritable salle de sport personnelle.',
 E'# Musculation à la maison : créer son home gym idéal\n\nDe plus en plus de Marocains s''équipent à domicile. Voici comment réussir votre home gym.\n\n## L''espace nécessaire\n\nComptez **minimum 12 m²** pour une configuration polyvalente avec un rack, un banc et une zone cardio.\n\n## Les équipements essentiels\n\n- **Une cage de squat** (gamme MS) pour la sécurité et la polyvalence\n- **Un banc réglable** (gamme IT7) inclinable et déclinable\n- **Une barre olympique + disques** entre 100 et 150 kg pour débuter\n- **Un tapis de course pliable** (gamme FGT) ou un vélo (gamme ECU)\n\n## Le sol\n\nInvestissez dans un revêtement caoutchouc de 20 mm minimum pour protéger votre sol et amortir les chocs.\n\n## Le budget\n\nPour un home gym complet de qualité résidentielle premium, prévoyez entre **40 000 et 80 000 MAD**. Un investissement vite rentabilisé par rapport à un abonnement salle.',
 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200', true, now() - interval '20 days');

-- ============= 5. STORAGE BUCKET FOR BLOG IMAGES =============
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

CREATE POLICY "Public can read blog images" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Admins can upload blog images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update blog images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'blog-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete blog images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'blog-images' AND has_role(auth.uid(), 'admin'::app_role));
