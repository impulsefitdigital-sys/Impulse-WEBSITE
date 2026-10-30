import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import HeroCarousel from "@/components/HeroCarousel";
import CategoryCardsSection from "@/components/CategoryCardsSection";
import TrendingProducts from "@/components/TrendingProducts";
import HomeBlogSection from "@/components/HomeBlogSection";
import AboutImpulseSection from "@/components/AboutImpulseSection";
import WorldPresenceSection from "@/components/WorldPresenceSection";
import ContactSection from "@/components/ContactSection";
import FaqSection from "@/components/FaqSection";
import Footer from "@/components/Footer";
import QuickLeadForm from "@/components/lp2/QuickLeadForm";
import { LP2_DISMISS_EVENT, LP2_DISMISS_KEY, LP2_VISIT_KEY } from "@/components/lp2/LeadBar";
import { useHomeSections } from "@/hooks/useHomeSections";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import "@/styles/lp2.css";

/**
 * Landing page 2 des campagnes (/lp2) : la page d'accueil du site, avec le questionnaire
 * rapide à côté du hero (bureau) ou au-dessus (téléphone). La croix ferme le formulaire et
 * laisse le site normal ; la barre de relance (LeadBar) prend alors le relais en bas d'écran.
 */
const readSession = (key: string) => { try { return !!sessionStorage.getItem(key); } catch { return false; } };

const LandingAccueil = () => {
  const { isVisible } = useHomeSections();
  const [dismissed, setDismissed] = useState(() => readSession(LP2_DISMISS_KEY));
  useScrollReveal();

  useEffect(() => {
    try { sessionStorage.setItem(LP2_VISIT_KEY, "1"); } catch { /* stockage indisponible */ }
  }, []);

  const dismiss = (scrollTo?: string) => {
    try { sessionStorage.setItem(LP2_DISMISS_KEY, "1"); } catch { /* stockage indisponible */ }
    setDismissed(true);
    window.dispatchEvent(new CustomEvent(LP2_DISMISS_EVENT));
    window.setTimeout(() => {
      const el = scrollTo ? document.getElementById(scrollTo) : null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 60);
  };

  const showHero = isVisible("hero");

  return (
    <div className="imp lp2-page min-h-screen overflow-x-hidden">
      <Seo
        titleFull="Impulse Fitness Maroc — Conseil et devis gratuits pour votre projet fitness"
        description="Salle de gym, hôtel ou résidentiel : décrivez votre projet en 30 secondes, un conseiller Impulse Fitness Maroc vous rappelle avec une proposition sur mesure."
        path="/lp2"
        noindex
      />
      <Navbar />
      <div className={`lp2-hero${dismissed ? "" : " with-form"}${showHero ? "" : " no-media"}`}>
        {!dismissed && (
          <aside id="lp2-form" className="lp2-form-col" aria-label="Demande de conseil gratuit">
            <QuickLeadForm idPrefix="lp2-top" origin="accueil" onClose={() => dismiss()} onContinue={() => dismiss("categories")} />
          </aside>
        )}
        {showHero && <div className="lp2-hero-media"><HeroCarousel /></div>}
      </div>
      {isVisible("categories") && <div id="categories"><CategoryCardsSection /></div>}
      {isVisible("trending") && <TrendingProducts />}
      {isVisible("blog") && <HomeBlogSection />}
      {isVisible("about") && <AboutImpulseSection />}
      {isVisible("world") && <WorldPresenceSection />}
      {isVisible("contact") && <ContactSection />}
      {isVisible("faq") && <FaqSection />}
      <Footer />
    </div>
  );
};

export default LandingAccueil;
