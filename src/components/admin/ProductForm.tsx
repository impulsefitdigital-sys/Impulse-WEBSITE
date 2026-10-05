import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Spec { label: string; value: string; }
interface WarrantyItem { component: string; duration: string; }
interface GalleryImage { id?: string; image_url: string; alt_text: string; sort_order: number; isNew?: boolean; }

const categories = ["Cardio", "Musculation", "Fonctionnel"];
const usageTypes = [
  { value: "both", label: "Professionnel & Résidentiel" },
  { value: "professionnel", label: "Professionnel uniquement" },
  { value: "residentiel", label: "Résidentiel uniquement" },
];

const subcategories: Record<string, string[]> = {
  Cardio: ["Tapis de course", "Elliptiques", "Climbmills", "Steppers", "Vélos", "Rameurs"],
  Musculation: ["Multi-stations", "Mono-stations", "Charges Libres", "Charges Guidées"],
  Fonctionnel: ["HIIT Cardio", "Cages & Rigs"],
};

const DRAFT_KEY_NEW = "product-form-draft";
const draftKeyFor = (productId?: string) => productId ? `product-form-draft:${productId}` : DRAFT_KEY_NEW;

const loadDraft = (productId?: string) => {
  try {
    const raw = localStorage.getItem(draftKeyFor(productId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

const ProductForm = ({ product, onClose }: { product: any | null; onClose: () => void }) => {
  const qc = useQueryClient();
  const isEditing = !!product;
  const DRAFT_KEY = draftKeyFor(product?.id);
  const draft = loadDraft(product?.id);
  const [hasResumedDraft, setHasResumedDraft] = useState(!!draft);

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasResumedDraft(false);
    onClose();
  };

  const [name, setName] = useState(draft?.name ?? product?.name ?? "");
  const [category, setCategory] = useState(draft?.category ?? product?.category ?? "Cardio");
  const [usageType, setUsageType] = useState(draft?.usageType ?? product?.usage_type ?? "both");
  const [subcategory, setSubcategory] = useState(draft?.subcategory ?? product?.subcategory ?? "");
  const [shortDesc, setShortDesc] = useState(draft?.shortDesc ?? product?.short_description ?? "");
  const [description, setDescription] = useState(draft?.description ?? product?.description ?? "");
  const [warrantyItems, setWarrantyItems] = useState<WarrantyItem[]>(() => {
    if (draft?.warrantyItems) return draft.warrantyItems;
    const w = product?.warranty;
    if (!w) return [];
    try {
      const parsed = JSON.parse(w);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          component: item.component || item.part || "",
          duration: item.duration || "",
        }));
      }
    } catch {}
    return w.split("\n").filter((l: string) => l.trim()).map((line: string) => {
      const parts = line.split(":");
      return { component: parts[0]?.trim() || "", duration: parts.slice(1).join(":").trim() || line.trim() };
    });
  });
  const [specs, setSpecs] = useState<Spec[]>(draft?.specs ?? (product?.specs as Spec[]) ?? []);
  const [features, setFeatures] = useState<string[]>(draft?.features ?? (product?.features as string[]) ?? []);
  const [imageUrl, setImageUrl] = useState(draft?.imageUrl ?? product?.image_url ?? "");
  const [hoverImageUrl, setHoverImageUrl] = useState(draft?.hoverImageUrl ?? product?.hover_image_url ?? "");
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isTrending, setIsTrending] = useState(draft?.isTrending ?? product?.is_trending ?? false);
  const [isPublished, setIsPublished] = useState(draft?.isPublished ?? product?.is_published ?? false);
  const [sortOrder, setSortOrder] = useState(draft?.sortOrder ?? product?.sort_order ?? 0);
  const [rangeCode, setRangeCode] = useState<string>(draft?.rangeCode ?? product?.range_code ?? "");
  const [availableRanges, setAvailableRanges] = useState<Array<{ code: string; usage_type: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(isEditing);

  // Auto-save draft (works for both new and edited products; per-product key when editing)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        name, category, usageType, subcategory, shortDesc, description,
        warrantyItems, specs, features, imageUrl, hoverImageUrl,
        isTrending, isPublished, sortOrder, rangeCode,
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [DRAFT_KEY, name, category, usageType, subcategory, shortDesc, description, warrantyItems, specs, features, imageUrl, hoverImageUrl, isTrending, isPublished, sortOrder, rangeCode]);

  const mainImageRef = useRef<HTMLInputElement>(null);
  const hoverImageRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (isEditing && loadingGallery) {
    supabase.from("product_images").select("*").eq("product_id", product.id).order("sort_order")
      .then(({ data }) => {
        if (data) setGalleryImages(data.map((d) => ({ ...d, alt_text: d.alt_text || "" })));
        setLoadingGallery(false);
      });
  }

  // Siblings in the same category + subcategory (for per-subcategory ordering)
  const [siblings, setSiblings] = useState<Array<{ id: string; name: string; sort_order: number }>>([]);
  useEffect(() => {
    let cancelled = false;
    const fetchSiblings = async () => {
      let q = supabase.from("products").select("id, name, sort_order").eq("category", category);
      if (subcategory) q = q.eq("subcategory", subcategory);
      else q = q.is("subcategory", null);
      const { data } = await q.order("sort_order").order("name");
      if (cancelled || !data) return;
      const list = data.filter((d) => d.id !== product?.id);
      setSiblings(list);
      // Auto-suggest next number for new products
      if (!isEditing && (sortOrder === 0 || sortOrder == null)) {
        const max = list.reduce((m, s) => Math.max(m, s.sort_order || 0), 0);
        setSortOrder(max + 1);
      }
    };
    fetchSiblings();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, subcategory]);

  // Fetch available ranges for the selected category/subcategory/usage
  useEffect(() => {
    let cancelled = false;
    const subSlug = subcategory
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const cat = category.toLowerCase();
    const fetchRanges = async () => {
      if (!subSlug) { setAvailableRanges([]); return; }
      const { data } = await supabase.from("product_ranges").select("code, usage_type").eq("category", cat).eq("subcategory", subSlug).eq("is_active", true).order("sort_order");
      if (cancelled) return;
      // Filter by usage compatibility
      const list = (data || []).filter((r) => usageType === "both" || r.usage_type === usageType);
      // Dedupe by code
      const seen = new Set<string>();
      setAvailableRanges(list.filter((r) => seen.has(r.code) ? false : (seen.add(r.code), true)));
    };
    fetchRanges();
    return () => { cancelled = true; };
  }, [category, subcategory, usageType]);

  const uploadImage = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) throw error;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void, folder: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setter(await uploadImage(file, folder)); toast.success("Image uploadée"); } catch { toast.error("Erreur lors de l'upload"); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const url = await uploadImage(file, "gallery");
        setGalleryImages((prev) => [...prev, { image_url: url, alt_text: "", sort_order: prev.length, isNew: true }]);
      } catch { toast.error(`Erreur upload: ${file.name}`); }
    }
    toast.success("Images ajoutées");
  };

  const removeGalleryImage = (index: number) => setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  const addSpec = () => setSpecs((prev) => [...prev, { label: "", value: "" }]);
  const removeSpec = (i: number) => setSpecs((prev) => prev.filter((_, idx) => idx !== i));
  const updateSpec = (i: number, field: keyof Spec, val: string) => setSpecs((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));
  const addFeature = () => setFeatures((prev) => [...prev, ""]);
  const removeFeature = (i: number) => setFeatures((prev) => prev.filter((_, idx) => idx !== i));
  const updateFeature = (i: number, val: string) => setFeatures((prev) => prev.map((f, idx) => (idx === i ? val : f)));
  const addWarrantyItem = () => setWarrantyItems((prev) => [...prev, { component: "", duration: "" }]);
  const removeWarrantyItem = (i: number) => setWarrantyItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateWarrantyItem = (i: number, field: keyof WarrantyItem, val: string) => setWarrantyItems((prev) => prev.map((w, idx) => (idx === i ? { ...w, [field]: val } : w)));

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Le nom est requis"); return; }
    setSaving(true);
    try {
      const productData = {
        name, category,
        usage_type: usageType,
        subcategory: subcategory || null,
        short_description: shortDesc || null,
        description: description || null,
        warranty: warrantyItems.length > 0 ? JSON.stringify(warrantyItems.filter(w => w.component.trim())) : null,
        specs: specs.filter((s) => s.label.trim()) as any,
        features: features.filter((f) => f.trim()) as any,
        image_url: imageUrl || null,
        hover_image_url: hoverImageUrl || null,
        is_trending: isTrending,
        is_published: isPublished,
        sort_order: sortOrder,
        range_code: rangeCode || null,
      };

      let productId = product?.id;

      if (isEditing) {
        const { error } = await supabase.from("products").update(productData).eq("id", product.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(productData).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      if (productId) {
        await supabase.from("product_images").delete().eq("product_id", productId);
        if (galleryImages.length > 0) {
          const { error } = await supabase.from("product_images").insert(
            galleryImages.map((img, i) => ({ product_id: productId, image_url: img.image_url, alt_text: img.alt_text || null, sort_order: i }))
          );
          if (error) throw error;
        }
      }

      qc.invalidateQueries({ queryKey: ["admin-products"] });
      localStorage.removeItem(DRAFT_KEY);
      toast.success(isEditing ? "Produit mis à jour" : "Produit créé");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally { setSaving(false); }
  };

  const inputClass = "w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <div className="max-w-3xl">
      <button onClick={onClose} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour à la liste
      </button>
      <h1 className="mb-6 font-display text-2xl font-bold text-foreground">{isEditing ? "Modifier le produit" : "Nouveau produit"}</h1>

      {hasResumedDraft && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-sm border border-accent/40 bg-accent/10 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Brouillon repris</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Votre travail en cours a été restauré automatiquement. Continuez la saisie ou supprimez le brouillon pour repartir de zéro.</p>
          </div>
          <button onClick={discardDraft} className="shrink-0 rounded-sm border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive">
            Supprimer le brouillon
          </button>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nom *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Nom du produit" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Catégorie</label>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(""); }} className={inputClass}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Type d'usage</label>
            <select value={usageType} onChange={(e) => setUsageType(e.target.value)} className={inputClass}>
              {usageTypes.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Sous-catégorie</label>
            <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className={inputClass}>
              <option value="">-- Sélectionner --</option>
              {(subcategories[category] || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {availableRanges.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Gamme {availableRanges.length > 0 && <span className="text-muted-foreground/70">({availableRanges.length} disponibles pour cette sous-catégorie)</span>}
            </label>
            <select value={rangeCode} onChange={(e) => setRangeCode(e.target.value)} className={inputClass}>
              <option value="">-- Aucune gamme --</option>
              {availableRanges.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Description courte</label>
          <textarea value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} rows={2} className={inputClass} placeholder="Résumé affiché sur la page produit" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Description complète</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={inputClass} placeholder="Description détaillée" />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Garantie</label>
            <button onClick={addWarrantyItem} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"><Plus className="h-3 w-3" /> Ajouter</button>
          </div>
          <div className="space-y-2">
            {warrantyItems.map((w, i) => (
              <div key={i} className="flex gap-2">
                <input value={w.component} onChange={(e) => updateWarrantyItem(i, "component", e.target.value)} className={`${inputClass} flex-1`} placeholder="Composant (ex: Cadre)" />
                <input value={w.duration} onChange={(e) => updateWarrantyItem(i, "duration", e.target.value)} className={`${inputClass} flex-1`} placeholder="Durée (ex: 10 ans)" />
                <button onClick={() => removeWarrantyItem(i)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-sm border border-border bg-card/50 p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Numéro d'affichage dans « {category}{subcategory ? ` · ${subcategory}` : ""} »
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className={`${inputClass} w-24`}
            />
            <p className="text-xs text-muted-foreground">
              Le numéro 1 s'affiche en premier dans cette sous-catégorie. Chaque sous-catégorie a sa propre numérotation.
            </p>
          </div>
          {siblings.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-accent hover:underline">
                Voir l'ordre actuel ({siblings.length} produit{siblings.length > 1 ? "s" : ""})
              </summary>
              <ol className="mt-2 space-y-1 text-xs text-foreground">
                {siblings
                  .slice()
                  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                  .map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-secondary text-[10px] font-semibold">
                        {s.sort_order || 0}
                      </span>
                      <span className="truncate">{s.name}</span>
                    </li>
                  ))}
              </ol>
            </details>
          )}
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isTrending} onChange={(e) => setIsTrending(e.target.checked)} className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
            <span className="text-sm font-medium text-foreground">Produit tendance</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
            <span className="text-sm font-medium text-foreground">Publié</span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Image principale</label>
            <input type="file" ref={mainImageRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setImageUrl, "main")} />
            {imageUrl ? (
              <div className="relative">
                <img src={imageUrl} alt="" className="h-40 w-full rounded-sm object-cover" />
                <button onClick={() => mainImageRef.current?.click()} className="absolute bottom-2 right-2 rounded-sm bg-background/80 px-2 py-1 text-xs text-foreground backdrop-blur-sm">Changer</button>
              </div>
            ) : (
              <button onClick={() => mainImageRef.current?.click()} className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent">
                <Upload className="h-6 w-6" /> <span className="text-xs">Upload</span>
              </button>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Image hover</label>
            <input type="file" ref={hoverImageRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setHoverImageUrl, "hover")} />
            {hoverImageUrl ? (
              <div className="relative">
                <img src={hoverImageUrl} alt="" className="h-40 w-full rounded-sm object-cover" />
                <button onClick={() => hoverImageRef.current?.click()} className="absolute bottom-2 right-2 rounded-sm bg-background/80 px-2 py-1 text-xs text-foreground backdrop-blur-sm">Changer</button>
              </div>
            ) : (
              <button onClick={() => hoverImageRef.current?.click()} className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent">
                <Upload className="h-6 w-6" /> <span className="text-xs">Upload</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Galerie d'images</label>
            <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" multiple onChange={handleGalleryUpload} />
            <button onClick={() => galleryInputRef.current?.click()} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"><Plus className="h-3 w-3" /> Ajouter</button>
          </div>
          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {galleryImages.map((img, i) => (
                <div key={i} className="group relative">
                  <img src={img.image_url} alt="" className="h-24 w-full rounded-sm object-cover" />
                  <button onClick={() => removeGalleryImage(i)} className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"><X className="h-3 w-3 text-destructive" /></button>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">Aucune image dans la galerie.</p>}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Spécifications</label>
            <button onClick={addSpec} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"><Plus className="h-3 w-3" /> Ajouter</button>
          </div>
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input value={s.label} onChange={(e) => updateSpec(i, "label", e.target.value)} className={`${inputClass} flex-1`} placeholder="Label" />
                <input value={s.value} onChange={(e) => updateSpec(i, "value", e.target.value)} className={`${inputClass} flex-1`} placeholder="Valeur" />
                <button onClick={() => removeSpec(i)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Caractéristiques</label>
            <button onClick={addFeature} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"><Plus className="h-3 w-3" /> Ajouter</button>
          </div>
          <div className="space-y-2">
            {features.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input value={f} onChange={(e) => updateFeature(i, e.target.value)} className={`${inputClass} flex-1`} placeholder="Ex: Résistance magnétique 24 niveaux" />
                <button onClick={() => removeFeature(i)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={handleSave} disabled={saving} className="rounded-sm bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
            {saving ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer le produit"}
          </button>
          <button onClick={onClose} className="rounded-sm border border-border px-6 py-3 text-sm text-muted-foreground hover:text-foreground">Annuler</button>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
