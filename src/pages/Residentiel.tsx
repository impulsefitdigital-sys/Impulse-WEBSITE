import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import CategoryPage from "@/pages/CategoryPage";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import heroImg from "@/assets/hero-cardio.jpg";

const subcategoryMap: Record<string, string> = {
  "tapis-de-course": "Tapis de course", "elliptiques": "Elliptiques", "climbmills": "Climbmills",
  "steppers": "Steppers", "velos": "Vélos", "rameurs": "Rameurs",
  "multi-stations": "Multi-stations", "mono-stations": "Mono-stations",
  "charges-libres": "Charges Libres", "charges-guidees": "Charges Guidées",
  "hiit-cardio": "HIIT Cardio", "cages-rigs": "Cages & Rigs",
};

const categoryTitleMap: Record<string, string> = { cardio: "Cardio", musculation: "Musculation", fonctionnel: "Fonctionnel" };

const ResidentielPage = () => {
  const { category, subcategory } = useParams();
  useScrollReveal();

  if (category && !subcategory) {
    return <CategoryPage usageType="residentiel" />;
  }

  const isBase = !category && !subcategory;
  const categoryName = category ? categoryTitleMap[category.toLowerCase()] : undefined;
  const subcategoryName = subcategory ? subcategoryMap[subcategory.toLowerCase()] : undefined;
  const title = isBase ? undefined : (subcategoryName || (categoryName ? `${categoryName} Résidentiel` : undefined));

  return (
    <div className="imp min-h-screen">
      <Seo title="Équipements de fitness résidentiels" description="Équipez votre salle de sport à domicile : matériel de musculation et cardio résidentiel de qualité au Maroc." path="/residentiel" />
      <Navbar />

      {isBase && (
        <section className="page-hero dark">
          <img className="ph-bg" src={heroImg} alt="" aria-hidden="true" />
          <div className="ph-scrim" />
          <div className="wrap">
            <span className="eyebrow reveal">Usage résidentiel</span>
            <h1 className="reveal">Équipements résidentiels.</h1>
            <p className="reveal">Du matériel de qualité professionnelle — cardio, musculation et functional training — pour équiper votre salle de sport à domicile.</p>
          </div>
        </section>
      )}

      <ProductGrid defaultCategory={categoryName} defaultSubcategory={subcategoryName} defaultSubcategorySlug={subcategory} defaultUsageType="residentiel" title={title} subtitle="Usage résidentiel" padTop={!isBase} />
      <Footer />
    </div>
  );
};

export default ResidentielPage;
