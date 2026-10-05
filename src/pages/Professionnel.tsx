import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import CategoryPage from "@/pages/CategoryPage";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import heroImg from "@/assets/hero-strength.jpg";

const subcategoryMap: Record<string, string> = {
  "tapis-de-course": "Tapis de course", "elliptiques": "Elliptiques", "climbmills": "Climbmills",
  "steppers": "Steppers", "velos": "Vélos", "rameurs": "Rameurs",
  "multi-stations": "Multi-stations", "mono-stations": "Mono-stations",
  "charges-libres": "Charges Libres", "charges-guidees": "Charges Guidées",
  "hiit-cardio": "HIIT Cardio", "cages-rigs": "Cages & Rigs",
};

const categoryTitleMap: Record<string, string> = { cardio: "Cardio", musculation: "Musculation", fonctionnel: "Fonctionnel" };

// catégories dont les sous-catégories affichent d'abord une carte par gamme (IT95, IF93…)
const RANGE_CARD_CATEGORIES = ["musculation"];

const ProfessionnelPage = () => {
  const { category, subcategory, range } = useParams();
  useScrollReveal();

  if (category && !subcategory) {
    return <CategoryPage usageType="professionnel" />;
  }

  const isBase = !category && !subcategory;
  const categoryName = category ? categoryTitleMap[category.toLowerCase()] : undefined;
  const subcategoryName = subcategory ? subcategoryMap[subcategory.toLowerCase()] : undefined;
  const rangeCode = range?.toUpperCase();
  const baseTitle = isBase ? undefined : (subcategoryName || (categoryName ? `${categoryName} Professionnel` : undefined));
  const title = rangeCode && baseTitle ? `Gamme ${rangeCode} — ${baseTitle}` : baseTitle;
  const rangeCards = !!category && RANGE_CARD_CATEGORIES.includes(category.toLowerCase());

  return (
    <div className="imp min-h-screen">
      {rangeCode && subcategoryName ? (
        <Seo
          title={`Gamme Impulse ${rangeCode} — ${subcategoryName} professionnel`}
          description={`${subcategoryName} Impulse gamme ${rangeCode} pour salles de sport, hôtels et clubs au Maroc. Demandez votre devis à Impulse Fitness Maroc.`}
          path={`/professionnel/${category}/${subcategory}/${range}`}
        />
      ) : (
        <Seo title="Équipements de fitness professionnels" description="Découvrez notre gamme d'équipements de fitness professionnels : musculation, cardio et cross-training pour salles de sport et clubs au Maroc." path="/professionnel" />
      )}
      <Navbar />

      {isBase && (
        <section className="page-hero dark">
          <img className="ph-bg" src={heroImg} alt="" aria-hidden="true" />
          <div className="ph-scrim" />
          <div className="wrap">
            <span className="eyebrow reveal">Usage professionnel</span>
            <h1 className="reveal">Équipements professionnels.</h1>
            <p className="reveal">Cardio, musculation et functional training de qualité commerciale pour salles de sport, clubs et hôtels — conçus pour un usage intensif.</p>
          </div>
        </section>
      )}

      <ProductGrid
        defaultCategory={categoryName}
        defaultSubcategory={subcategoryName}
        defaultSubcategorySlug={subcategory}
        defaultUsageType="professionnel"
        title={title}
        subtitle="Usage professionnel"
        padTop={!isBase}
        rangeCards={rangeCards}
        activeRange={range?.toLowerCase()}
      />
      <Footer />
    </div>
  );
};

export default ProfessionnelPage;
