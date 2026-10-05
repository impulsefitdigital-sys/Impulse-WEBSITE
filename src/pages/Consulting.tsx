import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const ConsultingPage = () => {
  useScrollReveal();

  const { data: services, isLoading } = useQuery({
    queryKey: ["consulting-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("consulting_services").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return (data || []).map((s: any) => ({ ...s, details: Array.isArray(s.details) ? s.details : [] }));
    },
  });

  const filtered = services || [];

  return (
    <div className="imp min-h-screen">
      <Seo title="Solutions & accompagnement" description="Accompagnement, conception et aménagement clé en main de votre espace fitness au Maroc par Impulse Fitness." path="/consulting" />
      <Navbar />

      {isLoading ? (
        <div className="wrap" style={{ padding: "80px 28px", color: "var(--steel)" }}>Chargement…</div>
      ) : (
        <div className="solutions-list">
          {filtered.map((s: any, i: number) => (
            <div className={`solution-row${i % 2 !== 0 ? " rev" : ""}`} key={s.id}>
              <div className="sr-img">
                <img src={s.image_url || "/placeholder.svg"} alt={s.title} loading="lazy" />
              </div>
              <div className="solution-panel">
                <span className="sr-index">{s.subtitle || `${String(i + 1).padStart(2, "0")} — Solution`}</span>
                <h2>{s.title}</h2>
                <p>{s.description}</p>
                <a href="/contact" className="btn btn-red"><span>Contactez-nous pour une consultation personnalisée</span></a>
              </div>
            </div>
          ))}
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ConsultingPage;
