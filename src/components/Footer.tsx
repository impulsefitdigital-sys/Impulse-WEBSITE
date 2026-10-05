import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Facebook, Youtube } from "lucide-react";
import NewsletterSignup from "@/components/NewsletterSignup";
import logoWhite from "@/assets/logo-new.png";
import { openConsentSettings } from "@/lib/consent";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.14a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.57z"/></svg>
);

const Footer = () => {
  const { data: settings } = useQuery({
    queryKey: ["contact-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_settings").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });
  const s = settings || {};

  return (
    <footer className="imp-footer">
      <div className="wrap">
        <div className="imp-footer-grid">
          <div>
            <Link to="/"><img src={logoWhite} alt="Impulse Fitness Maroc" className="f-logo" /></Link>
            <p className="f-tag">
              Votre partenaire de solutions complètes pour des espaces fitness d'exception.
            </p>
            {(s.social_instagram || s.social_facebook || s.social_tiktok || s.social_youtube) && (
              <div className="f-social">
                {s.social_instagram && <a href={s.social_instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram className="h-5 w-5" /></a>}
                {s.social_facebook && <a href={s.social_facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook className="h-5 w-5" /></a>}
                {s.social_tiktok && <a href={s.social_tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TikTokIcon className="h-5 w-5" /></a>}
                {s.social_youtube && <a href={s.social_youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube className="h-5 w-5" /></a>}
              </div>
            )}
          </div>

          <div className="f-col">
            <h4>Professionnel</h4>
            <a href="/professionnel/cardio">Cardio</a>
            <a href="/professionnel/musculation">Musculation</a>
            <a href="/professionnel/fonctionnel">Fonctionnel</a>
            <h4 className="mt">Résidentiel</h4>
            <a href="/residentiel/cardio">Cardio</a>
            <a href="/residentiel/musculation">Musculation</a>
            <a href="/residentiel/fonctionnel">Fonctionnel</a>
          </div>

          <div className="f-col">
            <h4>Entreprise</h4>
            <a href="/consulting">Solutions</a>
            <a href="/realisations">Réalisations</a>
            <a href="/blog">Blog</a>
            <a href="/a-propos">À propos</a>
            <a href="/contact">Contact</a>
          </div>

          <div id="newsletter">
            <NewsletterSignup />
          </div>
        </div>

        <div className="imp-footer-bottom">
          <p>© {new Date().getFullYear()} Impulse Fitness Maroc — Tous droits réservés.</p>
          <span style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <a href="/politique-de-confidentialite">Politique de confidentialité</a>
            <a href="#cookies" onClick={(e) => { e.preventDefault(); openConsentSettings(); }}>Gérer les cookies</a>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
