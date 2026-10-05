import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import contactHero from "@/assets/contact-hero.jpg";

const ContactPage = () => {
  useScrollReveal();

  return (
    <div className="imp min-h-screen">
      <Seo title="Contact" description="Contactez Impulse Fitness Maroc — showroom à Casablanca. Téléphone, email et demande d'information." path="/contact" />
      <Navbar />

      <section className="page-hero dark">
        <img className="ph-bg" src={contactHero} alt="" aria-hidden="true" />
        <div className="ph-scrim" />
        <div className="wrap">
          <span className="eyebrow reveal">Contact</span>
          <h1 className="reveal">Parlons de votre projet.</h1>
          <p className="reveal">Nos experts vous accompagnent pour transformer vos idées en réalité — conseil, devis sur mesure et visite du showroom à Casablanca.</p>
        </div>
      </section>

      <ContactSection showIntro={false} />
      <Footer />
    </div>
  );
};

export default ContactPage;
