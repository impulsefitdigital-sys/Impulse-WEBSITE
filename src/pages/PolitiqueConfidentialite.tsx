import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import PrivacyPolicyContent from "@/components/PrivacyPolicyContent";

const PolitiqueConfidentialite = () => {
  return (
    <div className="imp min-h-screen">
      <Seo title="Politique de confidentialité" description="Politique de confidentialité et de protection des données d'Impulse Fitness Maroc." path="/politique-de-confidentialite" />
      <Navbar />

      <div className="article-wrap no-cover">
        <span className="eyebrow" style={{ marginBottom: 18 }}>Mentions légales</span>
        <h1>Politique de confidentialité</h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--steel-dim)", marginTop: 16, marginBottom: 8 }}>
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
        </p>

        <div className="article-body">
          <PrivacyPolicyContent />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PolitiqueConfidentialite;
