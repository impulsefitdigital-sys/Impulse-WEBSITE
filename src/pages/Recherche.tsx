import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

const RecherchePage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const { data: products, isLoading } = useQuery({
    queryKey: ["search-products", query],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("is_published", true).or(`name.ilike.%${query}%,category.ilike.%${query}%,subcategory.ilike.%${query}%,short_description.ilike.%${query}%`).order("sort_order").limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!query,
  });

  // recherche + nombre de résultats (0 = produit recherché mais absent du catalogue)
  useEffect(() => {
    if (query && products) track("search", { label: query, value: products.length });
  }, [query, products]);

  return (
    <div className="imp min-h-screen">
      <Seo title="Recherche" path="/recherche" noindex />
      <Navbar />

      <div className="catalog pad-top">
        <div className="wrap">
          <span className="eyebrow">Résultats de recherche</span>
          <h1 className="display-md" style={{ marginTop: 14 }}>
            {query ? <>Recherche : «&nbsp;{query}&nbsp;»</> : "Recherche"}
          </h1>
          {query && products && (
            <p style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--steel-dim)", marginTop: 14 }}>
              {products.length} produit{products.length !== 1 ? "s" : ""} trouvé{products.length !== 1 ? "s" : ""}
            </p>
          )}

          {!query ? (
            <div className="devis-empty" style={{ minHeight: "auto", padding: "56px 0 20px" }}>
              <Search className="h-12 w-12" />
              <p>Utilisez la barre de recherche pour trouver un équipement.</p>
              <a href="/professionnel" className="btn btn-red"><span>Parcourir le catalogue</span></a>
            </div>
          ) : isLoading ? (
            <div style={{ display: "flex", padding: "80px 0", justifyContent: "center" }}><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
          ) : products && products.length > 0 ? (
            <div className="related-grid" style={{ marginTop: 36 }}>
              {products.map((p) => (
                <a key={p.id} className="rel-card" href={`/produit/${p.id}`}>
                  <div className="rel-shot"><img src={p.image_url || "/placeholder.svg"} alt={p.name} loading="lazy" /></div>
                  <div className="rel-body">
                    {p.category && <span className="rc-cat">{p.category}</span>}
                    <h3>{p.name}</h3>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="devis-empty" style={{ minHeight: "auto", padding: "56px 0 20px" }}>
              <Search className="h-12 w-12" />
              <p className="de-t">Aucun résultat</p>
              <p>Aucun produit ne correspond à «&nbsp;{query}&nbsp;».</p>
              <a href="/professionnel" className="btn btn-red"><span>Parcourir le catalogue</span></a>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RecherchePage;
