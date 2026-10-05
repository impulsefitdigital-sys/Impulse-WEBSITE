import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import AboutImpulseSection from "@/components/AboutImpulseSection";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import heroImg from "@/assets/hero-tech.jpg";

const AProposPage = () => {
  useScrollReveal();

  return (
    <div className="imp min-h-screen">
      <Seo title="À propos" description="Impulse Fitness Maroc, spécialiste des équipements de fitness professionnels et résidentiels au Maroc." path="/a-propos" />
      <Navbar />

      <section className="page-hero dark">
        <img className="ph-bg" src={heroImg} alt="" aria-hidden="true" />
        <div className="ph-scrim" />
        <div className="wrap">
          <span className="eyebrow reveal">À propos</span>
          <h1 className="reveal">La marque Impulse.</h1>
          <p className="reveal">Plus de 50 ans d'innovation dans le cardio, la musculation et le functional training — au service des professionnels et des particuliers, désormais au Maroc.</p>
        </div>
      </section>

      <AboutImpulseSection />
      <Footer />
    </div>
  );
};

export default AProposPage;
