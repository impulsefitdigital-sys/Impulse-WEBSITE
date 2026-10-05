import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import { absoluteUrl } from "@/lib/seo-config";
import Footer from "@/components/Footer";
import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, X, FileText, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQuoteCart } from "@/contexts/QuoteCartContext";
import { track } from "@/lib/analytics";

const ProductDetailPage = () => {
  const { id } = useParams();
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "warranty">("overview");
  const { addItem, items } = useQuoteCart();

  const { data: product, isLoading } = useQuery({ queryKey: ["product", id], queryFn: async () => { const { data, error } = await supabase.from("products").select("*").eq("id", id!).eq("is_published", true).maybeSingle(); if (error) throw error; return data; }, enabled: !!id });
  useEffect(() => { if (product?.id) track("product_view", { product_id: product.id, label: product.name }); }, [product?.id, product?.name]);
  const { data: galleryImages } = useQuery({ queryKey: ["product-images", id], queryFn: async () => { const { data, error } = await supabase.from("product_images").select("*").eq("product_id", id!).order("sort_order"); if (error) throw error; return data; }, enabled: !!id });
  const { data: relatedProducts } = useQuery({ queryKey: ["related-products", product?.range_code, product?.subcategory, product?.category, id], queryFn: async () => { let query = supabase.from("products").select("*").eq("is_published", true).neq("id", id!); if (product!.range_code) { query = query.eq("range_code", product!.range_code); } else if (product!.subcategory) { query = query.eq("subcategory", product!.subcategory); } else { query = query.eq("category", product!.category); } const { data, error } = await query.order("sort_order").limit(4); if (error) throw error; return data; }, enabled: !!(product?.category || product?.subcategory || product?.range_code) && !!id });

  const allImages = product ? [...(product.image_url ? [{ url: product.image_url, alt: product.name }] : []), ...(product.hover_image_url ? [{ url: product.hover_image_url, alt: `${product.name} - vue alternative` }] : []), ...(galleryImages?.map((img) => ({ url: img.image_url, alt: img.alt_text || product.name })) || [])] : [];
  const specs = (product?.specs as { label: string; value: string }[] | null) || [];
  const features = (product?.features as string[] | null) || [];
  const warrantyItems: { component: string; duration: string }[] = (() => { const w = (product as any)?.warranty; if (!w) return []; try { const parsed = JSON.parse(w); if (Array.isArray(parsed)) return parsed; } catch {} return w.split("\n").filter((l: string) => l.trim()).map((line: string) => { const parts = line.split(":"); return { component: parts[0]?.trim() || "Garantie", duration: parts.slice(1).join(":").trim() || line.trim() }; }); })();

  const nextImage = useCallback(() => setActiveImage((p) => (p + 1) % allImages.length), [allImages.length]);
  const prevImage = useCallback(() => setActiveImage((p) => (p - 1 + allImages.length) % allImages.length), [allImages.length]);

  useEffect(() => { if (!lightboxOpen) return; const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxOpen(false); if (e.key === "ArrowRight") nextImage(); if (e.key === "ArrowLeft") prevImage(); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [lightboxOpen, nextImage, prevImage]);

  const inCart = product ? items.some((i) => i.id === product.id) : false;

  if (isLoading) return <div className="imp min-h-screen"><Navbar /><div style={{ display: "flex", height: "80vh", alignItems: "center", justifyContent: "center" }}><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div></div>;
  if (!product) return <div className="imp min-h-screen"><Navbar /><div style={{ display: "flex", height: "80vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}><p style={{ color: "var(--steel)" }}>Produit non trouvé</p><a href="/" className="pd-back"><ArrowLeft /> Retour à l'accueil</a></div><Footer /></div>;

  const tabs = [{ id: "overview" as const, label: "Description" }, { id: "specs" as const, label: "Caractéristiques" }, { id: "warranty" as const, label: "Garantie" }];
  const rangeCode = (product as any).range_code;

  const productLd = {
    "@context": "https://schema.org", "@type": "Product", name: product.name,
    image: allImages.map((i) => i.url).slice(0, 6),
    description: product.short_description || product.description || product.name,
    sku: product.id, category: product.category,
    brand: { "@type": "Brand", name: "Impulse Fitness" }, url: absoluteUrl(`/produit/${product.id}`),
  };

  return (
    <div className="imp min-h-screen">
      <Seo title={product.name} description={product.short_description || product.description?.slice(0, 160) || product.name} path={`/produit/${product.id}`} image={product.image_url || undefined} jsonLd={productLd} />
      <Navbar />

      <div className="pd">
        <div className="wrap">
          <button className="pd-back" onClick={() => window.history.back()}><ArrowLeft /> Retour</button>

          <div className="pd-grid">
            {/* Gallery */}
            <div className="pd-gallery">
              <div className="pd-main" onClick={() => setLightboxOpen(true)}>
                <AnimatePresence mode="wait">
                  {allImages.length > 0 && (
                    <motion.img key={activeImage} src={allImages[activeImage].url} alt={allImages[activeImage].alt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
                  )}
                </AnimatePresence>
                {allImages.length > 1 && (
                  <>
                    <button className="pd-arrow prev" aria-label="Précédent" onClick={(e) => { e.stopPropagation(); prevImage(); }}><ChevronLeft /></button>
                    <button className="pd-arrow next" aria-label="Suivant" onClick={(e) => { e.stopPropagation(); nextImage(); }}><ChevronRight /></button>
                  </>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="pd-thumbs">
                  {allImages.map((img, i) => (
                    <button key={i} className={`pd-thumb${i === activeImage ? " active" : ""}`} onClick={() => setActiveImage(i)}>
                      <img src={img.url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="pd-info">
              {rangeCode && <span className="pd-tag"><span>{rangeCode}</span></span>}
              {product.category && <div className="pd-cat">{product.category}</div>}
              <h1>{product.name}</h1>
              {product.short_description && <p className="pd-desc">{product.short_description}</p>}
              {features.length > 0 && (
                <ul className="pd-features">
                  {features.slice(0, 5).map((f, i) => <li key={i}><Check /> {f}</li>)}
                </ul>
              )}
              <div className="pd-actions">
                <button className={`pd-add${inCart ? " in" : ""}`} onClick={() => addItem({ id: product.id, name: product.name, category: product.category, image_url: product.image_url })}>
                  <span>{inCart ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />} {inCart ? "Ajouté au devis" : "Ajouter au devis"}</span>
                </button>
                <a href="/contact" className="btn btn-ghost"><span>Nous contacter</span></a>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="pd-tabs-wrap">
            <div className="pd-tabs">
              {tabs.map((t) => <button key={t.id} className={`pd-tab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>)}
            </div>
            <div className="pd-tab-content">
              {activeTab === "overview" && (
                <p>{product.description || "Pas de description disponible."}</p>
              )}
              {activeTab === "specs" && (specs.length > 0 ? (
                <div className="pd-table">{specs.map((s, i) => <div className="row" key={i}><span className="k">{s.label}</span><span className="v">{s.value}</span></div>)}</div>
              ) : <p style={{ color: "var(--steel)" }}>Aucune caractéristique disponible.</p>)}
              {activeTab === "warranty" && (warrantyItems.length > 0 ? (
                <div className="pd-table">{warrantyItems.map((w, i) => <div className="row" key={i}><span className="k">{w.component}</span><span className="v">{w.duration}</span></div>)}</div>
              ) : <p style={{ color: "var(--steel)" }}>Informations de garantie non disponibles.</p>)}
            </div>
          </div>

          {/* Related */}
          {relatedProducts && relatedProducts.length > 0 && (
            <div className="pd-related">
              <h2>Produits similaires</h2>
              <div className="related-grid">
                {relatedProducts.map((rp) => (
                  <a key={rp.id} className="rel-card" href={`/produit/${rp.id}`}>
                    <div className="rel-shot"><img src={rp.image_url || "/placeholder.svg"} alt={rp.name} loading="lazy" /></div>
                    <div className="rel-body">
                      {rp.category && <span className="rc-cat">{rp.category}</span>}
                      <h3>{rp.name}</h3>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA band */}
      <div className="pd-cta">
        <div className="wrap">
          <h2>Obtenez plus avec Impulse</h2>
          <p>Contactez nous pour apporter nos solutions complètes à votre projet dès aujourd'hui.</p>
          <a href="/contact" className="btn btn-red"><span>Contactez-nous</span></a>
        </div>
      </div>

      <Footer />

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="pd-lightbox" onClick={() => setLightboxOpen(false)}>
          <button className="lb-close" aria-label="Fermer" onClick={() => setLightboxOpen(false)}><X className="h-7 w-7" /></button>
          {allImages.length > 0 && <img src={allImages[activeImage].url} alt={allImages[activeImage].alt} onClick={(e) => e.stopPropagation()} />}
          {allImages.length > 1 && (
            <>
              <button className="lb-arrow prev" aria-label="Précédent" onClick={(e) => { e.stopPropagation(); prevImage(); }}><ChevronLeft /></button>
              <button className="lb-arrow next" aria-label="Suivant" onClick={(e) => { e.stopPropagation(); nextImage(); }}><ChevronRight /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
