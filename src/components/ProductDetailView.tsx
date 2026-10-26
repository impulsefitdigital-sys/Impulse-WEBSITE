import { thumbProps } from "@/lib/images";
import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, X, Check } from "lucide-react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import type { Database } from "@/integrations/supabase/types";

/**
 * Fiche produit (galerie, couleurs, description, caractéristiques, garantie, produits similaires).
 * Utilisée par la page /produit/:id du site ET par la landing page du stock (/lp/musculation/:id),
 * pour garder exactement le même affichage. Les boutons d'action sont fournis par la page qui l'utilise.
 */
export type Product = Database["public"]["Tables"]["products"]["Row"];
export interface ProductImage { url: string; alt: string; color: string | null }

export const COLOR_SWATCH: Record<string, { label: string; bg: string }> = {
  noir: { label: "Noir", bg: "#141414" },
  rouge: { label: "Rouge", bg: "#c8102e" },
  argent: { label: "Argent", bg: "linear-gradient(135deg,#e4e6e8,#9ea3a8)" },
  "argent-rouge": { label: "Argent / rouge", bg: "linear-gradient(135deg,#c9cdd1 50%,#c8102e 50%)" },
  "noir-rouge": { label: "Noir / rouge", bg: "linear-gradient(135deg,#141414 50%,#c8102e 50%)" },
  "blanc-noir": { label: "Blanc / noir", bg: "linear-gradient(135deg,#f4f4f4 50%,#141414 50%)" },
  "noir-marron": { label: "Noir / marron", bg: "linear-gradient(135deg,#141414 50%,#6b4329 50%)" },
  jaune: { label: "Jaune", bg: "#f2c200" },
};

interface Props {
  id: string | undefined;
  /** boutons sous la description (devis, contact, prix…) */
  renderActions: (product: Product) => ReactNode;
  /** balises SEO, données structurées… */
  renderHead?: (product: Product, images: ProductImage[]) => ReactNode;
  /** lien d'un produit similaire */
  relatedHref?: (id: string) => string;
  /** limite les produits similaires à cette liste d'identifiants (ex. le stock) */
  relatedIds?: string[];
  relatedTitle?: string;
  /** affichage d'un prix ou d'une info entre le titre et la description */
  renderBelowTitle?: (product: Product) => ReactNode;
  backLabel?: string;
  onBack?: () => void;
  notFound?: ReactNode;
  /** couleur à montrer d'abord quand le produit existe en plusieurs couleurs (ex. « noir » sur la landing page) */
  preferredColor?: string;
}

/** couleur préférée si elle existe : exacte (« noir »), sinon une variante (« noir-rouge ») */
export const pickPreferredColor = (colors: string[], preferred?: string) =>
  !preferred ? undefined : colors.includes(preferred) ? preferred : colors.find((c) => c.startsWith(`${preferred}-`));

/** écran tactile : on peut faire glisser les photos du doigt (sur ordinateur, flèches et zoom au survol inchangés) */
const isTouch = () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;

const ProductDetailView = ({ id, renderActions, renderHead, relatedHref = (rid) => `/produit/${rid}`, relatedIds, relatedTitle = "Produits similaires", renderBelowTitle, backLabel = "Retour", onBack = () => window.history.back(), notFound, preferredColor }: Props) => {
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "warranty">("overview");

  const { data: product, isLoading } = useQuery({ queryKey: ["product", id], queryFn: async () => { const { data, error } = await supabase.from("products").select("*").eq("id", id!).eq("is_published", true).maybeSingle(); if (error) throw error; return data; }, enabled: !!id });
  useEffect(() => { if (product?.id) track("product_view", { product_id: product.id, label: product.name }); }, [product?.id, product?.name]);
  const { data: galleryImages } = useQuery({ queryKey: ["product-images", id], queryFn: async () => { const { data, error } = await supabase.from("product_images").select("*").eq("product_id", id!).order("sort_order"); if (error) throw error; return data; }, enabled: !!id });
  const { data: relatedProducts } = useQuery({ queryKey: ["related-products", product?.range_code, product?.subcategory, product?.category, id, relatedIds?.length ?? 0], queryFn: async () => { let query = supabase.from("products").select("*").eq("is_published", true).neq("id", id!); if (product!.range_code) { query = query.eq("range_code", product!.range_code); } else if (product!.subcategory) { query = query.eq("subcategory", product!.subcategory); } else { query = query.eq("category", product!.category); } const { data, error } = await (relatedIds ? query.in("id", relatedIds) : query).order("sort_order").limit(4); if (error) throw error; return data; }, enabled: !!(product?.category || product?.subcategory || product?.range_code) && !!id });

  // Photos par couleur : l'image principale et l'image de survol sont dans la couleur par défaut,
  // la galerie porte une couleur par photo (null = commune à toutes les couleurs).
  const defaultColor: string | null = product?.default_color ?? null;
  const baseImages: { url: string; alt: string; color: string | null }[] = product ? [
    ...(product.image_url ? [{ url: product.image_url, alt: product.name, color: defaultColor }] : []),
    ...(product.hover_image_url ? [{ url: product.hover_image_url, alt: `${product.name} - vue alternative`, color: defaultColor }] : []),
    ...(galleryImages?.map((img) => ({ url: img.image_url, alt: img.alt_text || product.name, color: img.color ?? null })) || []),
  ] : [];
  const colors = Array.from(new Set(baseImages.map((i) => i.color).filter((c): c is string => !!c)));
  const preferred = pickPreferredColor(colors, preferredColor);
  if (preferred) colors.sort((a, b) => Number(b === preferred) - Number(a === preferred));
  const activeColor = selectedColor && colors.includes(selectedColor) ? selectedColor : preferred ?? (defaultColor && colors.includes(defaultColor) ? defaultColor : colors[0] ?? null);
  const filtered = colors.length > 1 ? baseImages.filter((i) => !i.color || i.color === activeColor) : baseImages;
  // couleur mise en avant : ses photos d'abord, puis les photos communes à toutes les couleurs
  const allImages = preferred ? [...filtered].sort((a, b) => Number(!!b.color) - Number(!!a.color)) : filtered;
  const chooseColor = (c: string) => { setSelectedColor(c); setActiveImage(0); };
  const specs = (product?.specs as { label: string; value: string }[] | null) || [];
  const features = (product?.features as string[] | null) || [];
  const warrantyItems: { component: string; duration: string }[] = (() => { const w = product?.warranty; if (!w) return []; try { const parsed = JSON.parse(w); if (Array.isArray(parsed)) return parsed; } catch { /* texte libre : une ligne par composant */ } return w.split("\n").filter((l: string) => l.trim()).map((line: string) => { const parts = line.split(":"); return { component: parts[0]?.trim() || "Garantie", duration: parts.slice(1).join(":").trim() || line.trim() }; }); })();

  // glisser du doigt pour passer d'une photo à l'autre (photo principale et plein écran)
  const [touch] = useState(isTouch);
  const dragged = useRef(false);
  const swipe = allImages.length > 1 && touch ? {
    drag: "x" as const,
    dragConstraints: { left: 0, right: 0 },
    dragElastic: 0.55,
    dragSnapToOrigin: true,
    onDragStart: () => { dragged.current = true; },
    onDragEnd: (_e: unknown, info: PanInfo) => {
      if (info.offset.x < -50 || info.velocity.x < -450) setActiveImage((p) => (p + 1) % allImages.length);
      else if (info.offset.x > 50 || info.velocity.x > 450) setActiveImage((p) => (p - 1 + allImages.length) % allImages.length);
      window.setTimeout(() => { dragged.current = false; }, 60);
    },
  } : {};

  const nextImage = useCallback(() => setActiveImage((p) => (p + 1) % allImages.length), [allImages.length]);
  const prevImage = useCallback(() => setActiveImage((p) => (p - 1 + allImages.length) % allImages.length), [allImages.length]);

  useEffect(() => { if (!lightboxOpen) return; const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxOpen(false); if (e.key === "ArrowRight") nextImage(); if (e.key === "ArrowLeft") prevImage(); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [lightboxOpen, nextImage, prevImage]);

  useEffect(() => { setActiveImage(0); setSelectedColor(null); }, [id]);


  if (isLoading) return <div className="pd"><div style={{ display: "flex", height: "70vh", alignItems: "center", justifyContent: "center" }}><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div></div>;
  if (!product) return <>{notFound ?? <div style={{ display: "flex", height: "80vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}><p style={{ color: "var(--steel)" }}>Produit non trouvé</p><a href="/" className="pd-back"><ArrowLeft /> Retour à l'accueil</a></div>}</>;

  const tabs = [{ id: "overview" as const, label: "Description" }, { id: "specs" as const, label: "Caractéristiques" }, { id: "warranty" as const, label: "Garantie" }];
  const rangeCode = product.range_code;

  return (
    <>
      {renderHead?.(product, allImages)}
      <div className="pd">
        <div className="wrap">
          <button className="pd-back" onClick={onBack}><ArrowLeft /> {backLabel}</button>

          <div className="pd-grid">
            {/* Gallery */}
            <div className="pd-gallery">
              <div className="pd-main" onClick={() => { if (!dragged.current) setLightboxOpen(true); }}>
                <AnimatePresence mode="wait">
                  {allImages.length > 0 && (
                    <motion.img key={activeImage} src={allImages[activeImage].url} alt={allImages[activeImage].alt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} draggable={false} {...swipe} />
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
              {renderBelowTitle?.(product)}
              {product.short_description && <p className="pd-desc">{product.short_description}</p>}
              {features.length > 0 && (
                <ul className="pd-features">
                  {features.slice(0, 5).map((f, i) => <li key={i}><Check /> {f}</li>)}
                </ul>
              )}
              {colors.length > 1 && (
                <div className="pd-colors">
                  <span className="pd-colors-label">Couleur : <strong>{COLOR_SWATCH[activeColor ?? ""]?.label ?? activeColor}</strong></span>
                  <div className="pd-swatches">
                    {colors.map((c) => (
                      <button key={c} type="button" className={`pd-swatch${c === activeColor ? " active" : ""}`} onClick={() => chooseColor(c)} aria-label={COLOR_SWATCH[c]?.label ?? c} title={COLOR_SWATCH[c]?.label ?? c} aria-pressed={c === activeColor}>
                        <span style={{ background: COLOR_SWATCH[c]?.bg ?? "#888" }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {renderActions(product)}
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
              <h2>{relatedTitle}</h2>
              <div className="related-grid">
                {relatedProducts.map((rp) => (
                  <a key={rp.id} className="rel-card" href={relatedHref(rp.id)}>
                    <div className="rel-shot"><img {...thumbProps(rp.image_url)} alt={rp.name} loading="lazy" /></div>
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


      {/* Lightbox */}
      {lightboxOpen && (
        <div className="pd-lightbox" onClick={() => { if (!dragged.current) setLightboxOpen(false); }}>
          <button className="lb-close" aria-label="Fermer" onClick={() => setLightboxOpen(false)}><X className="h-7 w-7" /></button>
          {allImages.length > 0 && <motion.img key={activeImage} src={allImages[activeImage].url} alt={allImages[activeImage].alt} onClick={(e) => e.stopPropagation()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} draggable={false} {...swipe} />}
          {allImages.length > 1 && (
            <>
              <button className="lb-arrow prev" aria-label="Précédent" onClick={(e) => { e.stopPropagation(); prevImage(); }}><ChevronLeft /></button>
              <button className="lb-arrow next" aria-label="Suivant" onClick={(e) => { e.stopPropagation(); nextImage(); }}><ChevronRight /></button>
              <span className="lb-count" aria-live="polite">{activeImage + 1} / {allImages.length}</span>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ProductDetailView;
