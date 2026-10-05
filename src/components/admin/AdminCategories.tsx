import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save, Trash2, Eye, EyeOff, Upload, ChevronDown, ChevronUp } from "lucide-react";

type UsageType = "professionnel" | "residentiel";

interface Category {
  id: string;
  slug: string;
  title: string;
  description: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  usage_type: UsageType;
}

interface Subcategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  image_url: string | null;
  category_slug: string;
  sort_order: number;
  is_active: boolean;
  usage_type: UsageType;
}

const AdminCategories = () => {
  const qc = useQueryClient();
  const [usageType, setUsageType] = useState<UsageType>("professionnel");
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, Subcategory[]>>({});
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { data: catData, isLoading } = useQuery({
    queryKey: ["admin-categories", usageType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_categories")
        .select("*")
        .eq("usage_type", usageType)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subData } = useQuery({
    queryKey: ["admin-subcategories", usageType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_subcategories")
        .select("*")
        .eq("usage_type", usageType)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (catData) {
      setCategories(catData as Category[]);
      setIsDirty(false);
    }
  }, [catData]);

  useEffect(() => {
    if (subData) {
      const grouped: Record<string, Subcategory[]> = {};
      (subData as Subcategory[]).forEach((s) => {
        if (!grouped[s.category_slug]) grouped[s.category_slug] = [];
        grouped[s.category_slug].push(s);
      });
      setSubcategories(grouped);
      setIsDirty(false);
    }
  }, [subData]);

  const updateCatField = (i: number, field: keyof Category, value: any) => {
    const updated = [...categories];
    (updated[i] as any)[field] = value;
    setCategories(updated);
    setIsDirty(true);
  };

  const updateSubField = (catSlug: string, i: number, field: keyof Subcategory, value: any) => {
    const updated = { ...subcategories };
    const list = [...(updated[catSlug] || [])];
    (list[i] as any)[field] = value;
    updated[catSlug] = list;
    setSubcategories(updated);
    setIsDirty(true);
  };

  const handleCatImageUpload = async (i: number, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `categories/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Erreur upload"); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    updateCatField(i, "image_url", urlData.publicUrl);
  };

  const handleSubImageUpload = async (catSlug: string, i: number, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `subcategories/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Erreur upload"); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    updateSubField(catSlug, i, "image_url", urlData.publicUrl);
  };

  const addSubcategory = (catSlug: string) => {
    const updated = { ...subcategories };
    const list = updated[catSlug] || [];
    list.push({
      id: crypto.randomUUID(),
      slug: `new-${Date.now()}`,
      title: "",
      description: "",
      image_url: null,
      category_slug: catSlug,
      sort_order: list.length,
      is_active: true,
      usage_type: usageType,
    });
    updated[catSlug] = list;
    setSubcategories(updated);
    setIsDirty(true);
  };

  const removeSubcategory = (catSlug: string, i: number) => {
    const updated = { ...subcategories };
    updated[catSlug] = (updated[catSlug] || []).filter((_, idx) => idx !== i);
    setSubcategories(updated);
    setIsDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (targetUsage: UsageType = usageType) => {
      // Update categories (scoped to current usage_type)
      for (const cat of categories) {
        await supabase.from("equipment_categories").upsert({
          id: cat.id,
          slug: cat.slug,
          title: cat.title,
          description: cat.description,
          image_url: cat.image_url,
          sort_order: cat.sort_order,
          is_active: cat.is_active,
          usage_type: targetUsage,
        });
      }
      // Replace subcategories scoped to (category_slug, usage_type)
      for (const cat of categories) {
        await supabase
          .from("equipment_subcategories")
          .delete()
          .eq("category_slug", cat.slug)
          .eq("usage_type", targetUsage);
        const subs = subcategories[cat.slug] || [];
        if (subs.length > 0) {
          await supabase.from("equipment_subcategories").insert(
            subs.map((s, i) => ({
              slug: s.slug,
              title: s.title,
              description: s.description,
              image_url: s.image_url,
              category_slug: cat.slug,
              sort_order: i,
              is_active: s.is_active,
              usage_type: targetUsage,
            }))
          );
        }
      }
    },
    onSuccess: () => {
      setIsDirty(false);
      toast.success("Catégories sauvegardées");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["admin-subcategories"] });
      qc.invalidateQueries({ queryKey: ["equipment-category"] });
      qc.invalidateQueries({ queryKey: ["equipment-subcategories"] });
    },
    onError: () => toast.error("Erreur de sauvegarde"),
  });

  const switchUsage = async (next: UsageType) => {
    if (next === usageType) return;
    if (isDirty) {
      try {
        toast.info("Sauvegarde automatique en cours...");
        await saveMutation.mutateAsync(usageType);
      } catch {
        toast.error("Sauvegarde échouée — changement annulé");
        return;
      }
    }
    setUsageType(next);
  };

  if (isLoading) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">Catégories & Sous-catégories</h1>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-sm border border-border overflow-hidden">
            <button
              onClick={() => switchUsage("professionnel")}
              disabled={saveMutation.isPending}
              className={`px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                usageType === "professionnel"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-foreground hover:bg-muted"
              }`}
            >
              Professionnel
            </button>
            <button
              onClick={() => switchUsage("residentiel")}
              disabled={saveMutation.isPending}
              className={`px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                usageType === "residentiel"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-foreground hover:bg-muted"
              }`}
            >
              Résidentiel
            </button>
          </div>
          <button onClick={() => saveMutation.mutate(usageType)} disabled={saveMutation.isPending} className="flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {isDirty ? "Sauvegarder*" : "Sauvegarder"}
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Vous éditez actuellement les catégories <span className="font-semibold text-foreground">{usageType === "professionnel" ? "Professionnel" : "Résidentiel"}</span>. Le contenu et les images sont indépendants entre les deux sections.
      </p>

      <div className="space-y-6">
        {categories.map((cat, ci) => (
          <div key={cat.id} className="rounded-sm border border-border bg-card p-4">
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => updateCatField(ci, "is_active", !cat.is_active)} className={cat.is_active ? "text-accent" : "text-muted-foreground"}>
                {cat.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <input value={cat.title} onChange={(e) => updateCatField(ci, "title", e.target.value)} className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm" placeholder="Titre" />
              <input value={cat.slug} onChange={(e) => updateCatField(ci, "slug", e.target.value)} className="w-32 rounded-sm border border-border bg-background px-3 py-2 text-sm" placeholder="Slug" />
              <input type="number" value={cat.sort_order} onChange={(e) => updateCatField(ci, "sort_order", parseInt(e.target.value))} className="w-16 rounded-sm border border-border bg-background px-3 py-2 text-sm" />
            </div>

            <textarea value={cat.description} onChange={(e) => updateCatField(ci, "description", e.target.value)} rows={2} className="mb-3 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm" placeholder="Description de la catégorie" />

            <div className="mb-4 flex items-center gap-4">
              {cat.image_url ? (
                <div className="relative h-20 w-32 overflow-hidden rounded-sm border border-border">
                  <img src={cat.image_url} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => updateCatField(ci, "image_url", null)} className="absolute right-1 top-1 rounded bg-background/80 p-0.5"><Trash2 className="h-3 w-3" /></button>
                </div>
              ) : (
                <label className="flex h-20 w-32 cursor-pointer items-center justify-center rounded-sm border-2 border-dashed border-border text-muted-foreground hover:border-accent">
                  <Upload className="h-5 w-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleCatImageUpload(ci, e.target.files[0])} />
                </label>
              )}
              <span className="text-xs text-muted-foreground">Image hero de la catégorie</span>
            </div>

            <button onClick={() => setExpandedCat(expandedCat === cat.slug ? null : cat.slug)} className="flex items-center gap-2 text-sm font-semibold text-accent">
              {expandedCat === cat.slug ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Sous-catégories ({(subcategories[cat.slug] || []).length})
            </button>

            {expandedCat === cat.slug && (
              <div className="mt-4 space-y-3 pl-4 border-l-2 border-border">
                {(subcategories[cat.slug] || []).map((sub, si) => (
                  <div key={sub.id || si} className="flex items-center gap-3 rounded-sm border border-border bg-background p-3">
                    <button onClick={() => updateSubField(cat.slug, si, "is_active", !sub.is_active)} className={sub.is_active ? "text-accent" : "text-muted-foreground"}>
                      {sub.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    {sub.image_url ? (
                      <div className="relative h-12 w-16 overflow-hidden rounded-sm border border-border flex-shrink-0">
                        <img src={sub.image_url} alt="" className="h-full w-full object-cover" />
                        <button onClick={() => updateSubField(cat.slug, si, "image_url", null)} className="absolute right-0.5 top-0.5 rounded bg-background/80 p-0.5"><Trash2 className="h-2.5 w-2.5" /></button>
                      </div>
                    ) : (
                      <label className="flex h-12 w-16 flex-shrink-0 cursor-pointer items-center justify-center rounded-sm border-2 border-dashed border-border text-muted-foreground hover:border-accent">
                        <Upload className="h-3 w-3" />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleSubImageUpload(cat.slug, si, e.target.files[0])} />
                      </label>
                    )}
                    <input value={sub.title} onChange={(e) => updateSubField(cat.slug, si, "title", e.target.value)} className="flex-1 rounded-sm border border-border bg-card px-2 py-1.5 text-sm" placeholder="Titre" />
                    <input value={sub.slug} onChange={(e) => updateSubField(cat.slug, si, "slug", e.target.value)} className="w-28 rounded-sm border border-border bg-card px-2 py-1.5 text-sm" placeholder="Slug" />
                    <button onClick={() => removeSubcategory(cat.slug, si)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={() => addSubcategory(cat.slug)} className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80">
                  <Plus className="h-3 w-3" /> Ajouter une sous-catégorie
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCategories;
