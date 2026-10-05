import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TrendingProducts = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: products } = useQuery({
    queryKey: ["trending-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_published", true)
        .eq("is_trending", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const w = scrollRef.current.offsetWidth;
    scrollRef.current.scrollBy({ left: dir === "left" ? -w * 0.75 : w * 0.75, behavior: "smooth" });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="sec prods">
      <div className="wrap">
        <div className="prod-head">
          <h2 className="display-md reveal">Produits tendances</h2>
          <p className="prod-sub reveal">Découvrez les dernières innovations de la marque Impulse Fitness</p>
        </div>

        <div className="prod-carousel">
          <button className="prod-nav-btn prev reveal" onClick={() => scroll("left")} aria-label="Précédent"><ChevronLeft /></button>

          <div className="prod-track reveal" ref={scrollRef}>
            {products.map((p) => (
              <a className="prod-card" key={p.id} href={`/produit/${p.id}`}>
                <div className="prod-shot">
                  {/* badge "TENDANCE" retiré : l'info est portée par le titre de la section
                  {p.is_trending && <span className="ptag">TENDANCE</span>} */}
                  <img src={p.image_url || ""} alt={p.name} loading="lazy" />
                </div>
                <div className="prod-meta">
                  {p.category && <span className="pcat">{p.category}</span>}
                  <h3>{p.name}</h3>
                  {(p as any).range_code && <span className="pcode">{(p as any).range_code}</span>}
                </div>
              </a>
            ))}
          </div>

          <button className="prod-nav-btn next reveal" onClick={() => scroll("right")} aria-label="Suivant"><ChevronRight /></button>
        </div>
      </div>
    </section>
  );
};

export default TrendingProducts;
