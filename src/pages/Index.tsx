import { useEffect } from "react";
import { useLocation } from "react-router-dom";
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
import { useHomeSections } from "@/hooks/useHomeSections";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const Index = () => {
  const location = useLocation();
  const { isVisible } = useHomeSections();
  useScrollReveal();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [location.hash]);

  return (
    <div className="imp min-h-screen overflow-x-hidden">
      <Seo path="/" />
      <Navbar />
      {isVisible("hero") && <HeroCarousel />}
      {isVisible("categories") && <CategoryCardsSection />}
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

export default Index;
