import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ArrowRight, Plus } from "lucide-react";

interface Props {
  usageType: "professionnel" | "residentiel";
}

const CategoryPage = ({ usageType }: Props) => {
  const { category } = useParams();
  useScrollReveal();

  const { data: cat, isLoading: catLoading } = useQuery({
    queryKey: ["equipment-category", category, usageType],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment_categories").select("*").eq("slug", category!).eq("usage_type", usageType).eq("is_active", true).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!category,
  });

  const { data: subcategories } = useQuery({
    queryKey: ["equipment-subcategories", category, usageType],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment_subcategories").select("*").eq("category_slug", category!).eq("usage_type", usageType).eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!category,
  });

  const usageLabel = usageType === "professionnel" ? "Professionnel" : "Résidentiel";

  if (catLoading) {
    return (
      <div className="imp min-h-screen">
        <Navbar />
        <div style={{ display: "flex", height: "60vh", alignItems: "center", justifyContent: "center" }}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="imp min-h-screen">
      <Seo
        title={`${cat?.title || category} ${usageLabel}`}
        description={cat?.description || `Équipements de fitness ${usageLabel.toLowerCase()} : ${cat?.title || category}. Découvrez la gamme Impulse Fitness Maroc.`}
        path={`/${usageType}/${category}`}
      />
      <Navbar />

      <section className="page-hero dark">
        {cat?.image_url && <img className="ph-bg" src={cat.image_url} alt="" aria-hidden="true" />}
        <div className="ph-scrim" />
        <div className="wrap">
          <span className="eyebrow reveal">Usage {usageLabel}</span>
          <h1 className="reveal">{cat?.title || category} {usageLabel}</h1>
          {cat?.description && <p className="reveal">{cat.description}</p>}
        </div>
      </section>

      {subcategories && subcategories.length > 0 && (
        <section className="subcat-section">
          <div className="subcat-grid">
            {subcategories.map((sub: any) => (
              <a className="subcat-card" key={sub.id} href={`/${usageType}/${category}/${sub.slug}`}>
                <img src={sub.image_url || "/placeholder.svg"} alt={sub.title} loading="lazy" />
                <h3>{sub.title}</h3>
                <span className="sc-plus"><Plus /></span>
              </a>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default CategoryPage;
