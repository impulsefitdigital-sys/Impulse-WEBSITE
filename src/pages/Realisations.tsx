import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ArrowRight } from "lucide-react";
import { realisationCategoryLabel } from "@/lib/realisations";

const RealisationsPage = () => {
  useScrollReveal();

  const { data: realisations, isLoading } = useQuery({
    queryKey: ["realisations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("realisations").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const items = realisations || [];

  return (
    <div className="imp min-h-screen">
      <Seo title="Nos réalisations" description="Découvrez les projets et salles de sport aménagés par Impulse Fitness Maroc." path="/realisations" />
      <Navbar />

      <h1 className="sr-only">Nos réalisations — salles de sport, hôtels et résidences équipés par Impulse Fitness Maroc</h1>

      {isLoading ? (
        <div className="wrap" style={{ padding: "80px 28px", color: "var(--steel)" }}>Chargement…</div>
      ) : items.length === 0 ? (
        <div className="wrap" style={{ padding: "80px 28px", color: "var(--steel)" }}>Aucune réalisation pour le moment.</div>
      ) : (
        <div className="solutions-list realisations-rows">
          {items.map((r, i) => {
            const href = `/realisations/${r.slug}`;
            return (
              <div className={`solution-row${i % 2 !== 0 ? " rev" : ""}`} key={r.id}>
                <div className="sr-img">
                  <a href={href} aria-label={`Découvrir la réalisation ${r.title}`}>
                    <img src={r.image_url || "/placeholder.svg"} alt={r.title} loading="lazy" />
                  </a>
                </div>
                <div className="solution-panel">
                  {(r.subtitle || r.category) && <span className="sr-index">{r.subtitle || realisationCategoryLabel(r.category)}</span>}
                  <h2><a href={href}>{r.title}</a></h2>
                  {r.description && <p>{r.description}</p>}
                  {(r.location || r.client_name) && (
                    <span className="sr-meta">{[r.location, r.client_name].filter(Boolean).join(" · ")}</span>
                  )}
                  <div className="sr-actions">
                    <a href={href} className="btn btn-red"><span>Découvrir le projet <ArrowRight className="h-4 w-4" /></span></a>
                    <a href="/contact" className="sr-link">Demander une consultation</a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Footer />
    </div>
  );
};

export default RealisationsPage;
