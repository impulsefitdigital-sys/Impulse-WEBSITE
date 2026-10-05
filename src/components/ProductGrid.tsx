import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQuoteCart } from "@/contexts/QuoteCartContext";
import { FileText, Check, SlidersHorizontal, X, ArrowLeft, ArrowRight } from "lucide-react";

const categories = ["Tous", "Cardio", "Musculation", "Fonctionnel"];

interface ProductGridProps {
  defaultCategory?: string;
  defaultSubcategory?: string;
  defaultSubcategorySlug?: string;
  defaultUsageType?: string;
  title?: string;
  subtitle?: string;
  padTop?: boolean;
  /** Affiche d'abord une carte par gamme (au lieu de la liste des produits) quand la sous-catégorie en a plusieurs. */
  rangeCards?: boolean;
  /** Code de gamme en minuscules (segment d'URL) : n'affiche que les produits de cette gamme. */
  activeRange?: string;
}

const ProductGrid = ({ defaultCategory, defaultSubcategory, defaultSubcategorySlug, defaultUsageType, title, subtitle, padTop, rangeCards, activeRange }: ProductGridProps) => {
  const [filter, setFilter] = useState(defaultCategory || "Tous");
  const [selectedRanges, setSelectedRanges] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { addItem, items } = useQuoteCart();

  useEffect(() => { setFilter(defaultCategory || "Tous"); }, [defaultCategory]);
  useEffect(() => { setSelectedRanges([]); }, [defaultSubcategorySlug, defaultUsageType]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["public-products"],
    queryFn: async () => { const { data, error } = await supabase.from("products").select("*").eq("is_published", true).order("sort_order"); if (error) throw error; return data; },
  });

  const { data: ranges } = useQuery({
    queryKey: ["ranges", defaultUsageType, defaultCategory, defaultSubcategorySlug],
    queryFn: async () => {
      if (!defaultUsageType || !defaultCategory || !defaultSubcategorySlug) return [];
      const cat = defaultCategory.toLowerCase();
      const subSlug = defaultSubcategorySlug.toLowerCase();
      let q = supabase.from("product_ranges").select("*").eq("is_active", true).eq("category", cat).eq("subcategory", subSlug);
      if (defaultUsageType !== "both") q = q.eq("usage_type", defaultUsageType);
      const { data, error } = await q.order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!(defaultUsageType && defaultCategory && defaultSubcategorySlug),
  });

  const filtered = useMemo(() => {
    let list = filter === "Tous" ? (products ?? []) : (products ?? []).filter((p) => p.category === filter);
    if (defaultSubcategory) list = list.filter((p) => (p as any).subcategory === defaultSubcategory);
    if (defaultUsageType && defaultUsageType !== "both") list = list.filter((p) => { const ut = (p as any).usage_type; return ut === defaultUsageType || ut === "both"; });
    if (activeRange) list = list.filter((p) => (p as any).range_code?.toLowerCase() === activeRange);
    else if (selectedRanges.length > 0) list = list.filter((p) => (p as any).range_code && selectedRanges.includes((p as any).range_code));
    return list;
  }, [products, filter, defaultSubcategory, defaultUsageType, selectedRanges, activeRange]);

  const rangeCounts = useMemo(() => {
    const baseList = (products ?? [])
      .filter((p) => !defaultSubcategory || (p as any).subcategory === defaultSubcategory)
      .filter((p) => !defaultUsageType || defaultUsageType === "both" || (p as any).usage_type === defaultUsageType || (p as any).usage_type === "both");
    const counts: Record<string, number> = {};
    const covers: Record<string, string> = {};
    baseList.forEach((p) => {
      const c = (p as any).range_code;
      if (!c) return;
      counts[c] = (counts[c] || 0) + 1;
      if (!covers[c] && p.image_url) covers[c] = p.image_url;
    });
    return { counts, covers };
  }, [products, defaultSubcategory, defaultUsageType]);

  // gammes qui ont au moins un produit publié : ce sont les cartes affichées
  const rangesWithProducts = (ranges ?? []).filter((r: any) => rangeCounts.counts[r.code]);
  const showRangeCards = !!rangeCards && !activeRange && rangesWithProducts.length >= 2;

  const showCategoryFilter = !defaultCategory && !defaultSubcategory;
  const showRangesSidebar = !!(ranges && ranges.length > 0) && !showRangeCards && !activeRange;
  const toggleRange = (code: string) => setSelectedRanges((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);

  const categorySlug = defaultCategory ? defaultCategory.toLowerCase() : undefined;
  const subcategoryHref = defaultUsageType && categorySlug && defaultSubcategorySlug ? `/${defaultUsageType}/${categorySlug}/${defaultSubcategorySlug}` : undefined;
  const backHref = activeRange ? subcategoryHref : defaultUsageType && categorySlug ? `/${defaultUsageType}/${categorySlug}` : undefined;

  const RangesPanel = () => (
    <div className="ranges">
      <h3>Gammes {selectedRanges.length > 0 && <button className="reset" onClick={() => setSelectedRanges([])}>Réinitialiser</button>}</h3>
      {ranges!.map((r: any) => {
        const checked = selectedRanges.includes(r.code);
        return (
          <label className="range-item" key={r.id}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <input type="checkbox" checked={checked} onChange={() => toggleRange(r.code)} />
              <span className="rn-code">{r.code}</span>
              {r.label && <span className="rn-label">{r.label}</span>}
            </span>
            <span className="rn-count">({rangeCounts.counts[r.code] || 0})</span>
          </label>
        );
      })}
    </div>
  );

  return (
    <section id="produits" className={`catalog${padTop ? " pad-top" : ""}`}>
      <div className="wrap">
        <div className="catalog-head">
          <div>
            {backHref && defaultSubcategory && (
              <a href={backHref} className="catalog-back"><ArrowLeft /> Retour</a>
            )}
            <span className="eyebrow">{subtitle || "Catalogue"}</span>
            {title && <h2 className="display-md" style={{ marginTop: 14 }}>{title}</h2>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {showRangesSidebar && (
              <button className="filters-btn" onClick={() => setMobileFiltersOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" /> Filtres
                {selectedRanges.length > 0 && <span className="fb-count">{selectedRanges.length}</span>}
              </button>
            )}
            {showCategoryFilter && (
              <div className="cat-tabs">
                {categories.map((cat) => (
                  <button key={cat} className={`cat-tab${filter === cat ? " active" : ""}`} onClick={() => setFilter(cat)}>{cat}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`catalog-layout${showRangesSidebar ? " with-side" : ""}`}>
          {showRangesSidebar && (
            <aside className="ranges desktop-side"><div style={{ position: "sticky", top: 130 }}><RangesPanel /></div></aside>
          )}
          <div style={{ minWidth: 0 }}>
            {isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
            ) : showRangeCards ? (
              <div className="range-grid">
                {rangesWithProducts.map((r: any) => (
                  <a className="range-card" key={r.id} href={`${subcategoryHref}/${r.code.toLowerCase()}`}>
                    <span className="rc-shot">
                      <img src={r.image_url || rangeCounts.covers[r.code] || "/placeholder.svg"} alt={`Gamme ${r.code}`} loading="lazy" />
                    </span>
                    <span className="rc-body">
                      <span className="p-cat">Gamme</span>
                      <h3>{r.code}{r.label && <small>{r.label}</small>}</h3>
                      {r.description && <p className="p-desc">{r.description}</p>}
                      <span className="product-see">{rangeCounts.counts[r.code]} produit{rangeCounts.counts[r.code] > 1 ? "s" : ""} <ArrowRight /></span>
                    </span>
                  </a>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p style={{ padding: "60px 0", textAlign: "center", color: "var(--steel)" }}>Aucun produit ne correspond aux filtres sélectionnés.</p>
            ) : (
              <div className="product-grid">
                {filtered.map((p) => {
                  const inCart = items.some((item) => item.id === p.id);
                  return (
                    <div className="product-card" key={p.id}>
                      <a href={`/produit/${p.id}`} className="product-shot">
                        {(p as any).range_code && <span className="product-tag"><span>{(p as any).range_code}</span></span>}
                        <img className="p-main" src={p.image_url || "/placeholder.svg"} alt={p.name} loading="lazy" />
                        {p.hover_image_url && <img className="p-hover" src={p.hover_image_url} alt="" aria-hidden="true" />}
                      </a>
                      <button
                        className={`p-quote${inCart ? " in" : ""}`}
                        title={inCart ? "Ajouté au devis" : "Ajouter au devis"}
                        aria-label={inCart ? "Ajouté au devis" : "Ajouter au devis"}
                        onClick={() => addItem({ id: p.id, name: p.name, category: p.category, image_url: p.image_url })}
                      >
                        {inCart ? <Check /> : <FileText />}
                      </button>
                      <a href={`/produit/${p.id}`} className="product-body">
                        {p.category && <span className="p-cat">{p.category}</span>}
                        <h3>{p.name}</h3>
                        {p.short_description && <p className="p-desc">{p.short_description}</p>}
                        <span className="product-see">Voir le produit <ArrowRight /></span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showRangesSidebar && (
        <div className={`catalog-drawer${mobileFiltersOpen ? " open" : ""}`} onClick={() => setMobileFiltersOpen(false)}>
          <div className="cd-overlay" />
          <div className="cd-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cd-head">
              <h3>Filtres</h3>
              <button className="imp-icon-btn" onClick={() => setMobileFiltersOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <RangesPanel />
            <button className="btn btn-red" style={{ width: "100%", marginTop: 22, justifyContent: "center" }} onClick={() => setMobileFiltersOpen(false)}>
              <span>Voir les résultats ({filtered.length}) <ArrowRight className="h-4 w-4" /></span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProductGrid;
