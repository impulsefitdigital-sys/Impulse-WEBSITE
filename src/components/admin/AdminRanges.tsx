import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save, Trash2, Eye, EyeOff, Upload } from "lucide-react";

type UsageType = "professionnel" | "residentiel";

interface Range {
  id: string;
  code: string;
  label: string;
  description: string;
  image_url: string | null;
  usage_type: string;
  category: string;
  subcategory: string;
  sort_order: number;
  is_active: boolean;
}

interface Subcategory {
  id: string;
  slug: string;
  title: string;
  category_slug: string;
}

/**
 * Gammes (IT95, IF93, SL…) rattachées à chaque sous-catégorie.
 * En Musculation professionnelle, elles s'affichent en cartes avant les produits ;
 * ailleurs, elles servent de filtre dans le catalogue.
 * Le « code » doit être identique au champ « Gamme » des produits.
 */
const AdminRanges = () => {
  const qc = useQueryClient();
  const [usageType, setUsageType] = useState<UsageType>("professionnel");
  const [category, setCategory] = useState("musculation");
  const [ranges, setRanges] = useState<Range[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["admin-range-categories", usageType],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment_categories").select("slug, title").eq("usage_type", usageType).order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subcategories } = useQuery({
    queryKey: ["admin-range-subcategories", usageType, category],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment_subcategories").select("id, slug, title, category_slug").eq("usage_type", usageType).eq("category_slug", category).order("sort_order");
      if (error) throw error;
      return (data || []) as Subcategory[];
    },
  });

  const { data: rangeData, isLoading } = useQuery({
    queryKey: ["admin-ranges", usageType, category],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_ranges").select("*").eq("usage_type", usageType).eq("category", category).order("sort_order");
      if (error) throw error;
      return (data || []) as Range[];
    },
  });

  const { data: productCounts } = useQuery({
    queryKey: ["admin-range-product-counts", usageType, category],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("range_code, subcategory, usage_type, category");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((p: { range_code: string | null; subcategory: string | null; usage_type: string | null; category: string | null }) => {
        if (!p.range_code || p.category?.toLowerCase() !== category) return;
        if (p.usage_type !== usageType && p.usage_type !== "both") return;
        const key = `${p.subcategory}|${p.range_code}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    },
  });

  useEffect(() => {
    if (rangeData) {
      setRanges(rangeData.map((r) => ({ ...r, description: r.description ?? "", label: r.label ?? "" })));
      setRemovedIds([]);
      setIsDirty(false);
    }
  }, [rangeData]);

  const update = <K extends keyof Range>(id: string, field: K, value: Range[K]) => {
    setRanges((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setIsDirty(true);
  };

  const add = (subSlug: string) => {
    const siblings = ranges.filter((r) => r.subcategory === subSlug);
    setRanges((prev) => [...prev, {
      id: crypto.randomUUID(), code: "", label: "", description: "", image_url: null,
      usage_type: usageType, category, subcategory: subSlug, sort_order: siblings.length + 1, is_active: true,
    }]);
    setIsDirty(true);
  };

  const remove = (id: string) => {
    if (!confirm("Supprimer cette gamme ? Les produits ne sont pas supprimés.")) return;
    setRanges((prev) => prev.filter((r) => r.id !== id));
    setRemovedIds((prev) => [...prev, id]);
    setIsDirty(true);
  };

  const handleImageUpload = async (id: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `ranges/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Erreur upload"); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    update(id, "image_url", urlData.publicUrl);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (ranges.some((r) => !r.code.trim())) throw new Error("Chaque gamme doit avoir un code.");
      for (const id of removedIds) {
        const { error } = await supabase.from("product_ranges").delete().eq("id", id);
        if (error) throw error;
      }
      if (ranges.length > 0) {
        const { error } = await supabase.from("product_ranges").upsert(ranges.map((r) => ({
          id: r.id, code: r.code.trim(), label: r.label, description: r.description, image_url: r.image_url,
          usage_type: r.usage_type, category: r.category, subcategory: r.subcategory,
          sort_order: r.sort_order, is_active: r.is_active,
        })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setIsDirty(false);
      toast.success("Gammes sauvegardées");
      qc.invalidateQueries({ queryKey: ["admin-ranges"] });
      qc.invalidateQueries({ queryKey: ["ranges"] });
    },
    onError: (e: Error) => toast.error(e?.message || "Erreur de sauvegarde"),
  });

  const switchTo = (nextUsage: UsageType, nextCategory: string) => {
    if (isDirty && !confirm("Modifications non sauvegardées : les abandonner ?")) return;
    setUsageType(nextUsage);
    setCategory(nextCategory);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">Gammes</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex rounded-sm border border-border overflow-hidden">
            {(["professionnel", "residentiel"] as const).map((u) => (
              <button key={u} onClick={() => switchTo(u, category)} className={`px-4 py-2 text-sm font-semibold transition-colors ${usageType === u ? "bg-accent text-accent-foreground" : "bg-card text-foreground hover:bg-muted"}`}>
                {u === "professionnel" ? "Professionnel" : "Résidentiel"}
              </button>
            ))}
          </div>
          <select value={category} onChange={(e) => switchTo(usageType, e.target.value)} className="rounded-sm border border-border bg-card px-3 py-2 text-sm">
            {(categories || []).map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
          </select>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {isDirty ? "Sauvegarder*" : "Sauvegarder"}
          </button>
        </div>
      </div>

      <p className="mb-6 text-xs text-muted-foreground">
        Le <span className="font-semibold text-foreground">code</span> doit être identique au champ « Gamme » des produits (ex. IT95).
        En Musculation professionnelle, chaque gamme s'affiche en carte (image + texte ci-dessous) ; sans image, la photo du premier produit est utilisée.
        Les gammes sans produit publié ne s'affichent pas.
      </p>

      {isLoading ? <div className="text-muted-foreground">Chargement...</div> : (
        <div className="space-y-6">
          {(subcategories || []).map((sub) => {
            const list = ranges.filter((r) => r.subcategory === sub.slug).sort((a, b) => a.sort_order - b.sort_order);
            return (
              <div key={sub.id} className="rounded-sm border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-bold text-foreground">{sub.title} <span className="font-normal text-muted-foreground">— {list.length} gamme(s)</span></h2>
                <div className="space-y-3">
                  {list.map((r) => (
                    <div key={r.id} className="flex gap-3 rounded-sm border border-border bg-background p-3">
                      <div className="flex flex-col items-center gap-2">
                        {r.image_url ? (
                          <div className="relative h-20 w-24 overflow-hidden rounded-sm border border-border bg-white">
                            <img src={r.image_url} alt="" className="h-full w-full object-contain" />
                            <button onClick={() => update(r.id, "image_url", null)} className="absolute right-0.5 top-0.5 rounded bg-background/80 p-0.5"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-border text-[10px] text-muted-foreground hover:border-accent">
                            <Upload className="h-4 w-4" /> Image
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(r.id, e.target.files[0])} />
                          </label>
                        )}
                        <button onClick={() => update(r.id, "is_active", !r.is_active)} title={r.is_active ? "Visible" : "Masquée"} className={r.is_active ? "text-accent" : "text-muted-foreground"}>
                          {r.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input value={r.code} onChange={(e) => update(r.id, "code", e.target.value)} className="w-28 rounded-sm border border-border bg-card px-2 py-1.5 text-sm font-semibold" placeholder="Code (IT95)" />
                          <input value={r.label} onChange={(e) => update(r.id, "label", e.target.value)} className="flex-1 rounded-sm border border-border bg-card px-2 py-1.5 text-sm" placeholder="Sous-titre (optionnel)" />
                          <input type="number" value={r.sort_order} onChange={(e) => update(r.id, "sort_order", parseInt(e.target.value) || 0)} className="w-16 rounded-sm border border-border bg-card px-2 py-1.5 text-sm" title="Ordre" />
                          <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <textarea value={r.description} onChange={(e) => update(r.id, "description", e.target.value)} rows={2} className="w-full rounded-sm border border-border bg-card px-2 py-1.5 text-sm" placeholder="Texte de la carte (optionnel)" />
                        <p className="text-[11px] text-muted-foreground">{productCounts?.[`${sub.title}|${r.code}`] ?? 0} produit(s) avec cette gamme</p>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => add(sub.slug)} className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80">
                    <Plus className="h-3 w-3" /> Ajouter une gamme
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminRanges;
