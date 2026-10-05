import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";
import ProductForm from "./ProductForm";

const DRAFT_KEY = "product-form-draft";

const hasDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    // Consider non-empty if any meaningful field is filled
    return !!(d?.name?.trim() || d?.shortDesc?.trim() || d?.description?.trim() || d?.imageUrl || (d?.specs?.length) || (d?.features?.length) || (d?.warrantyItems?.length));
  } catch { return false; }
};

const AdminProducts = () => {
  const qc = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-resume an in-progress new-product draft when returning to admin
  useEffect(() => {
    if (hasDraft()) {
      setEditingProduct(null);
      setShowForm(true);
    }
  }, []);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: ranges } = useQuery({
    queryKey: ["admin-product-ranges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_ranges").select("code,label");
      if (error) throw error;
      return data;
    },
  });

  const rangeLabel = (code?: string | null) => {
    if (!code) return null;
    const r = ranges?.find((x: any) => x.code === code);
    return r?.label ? `${code} — ${r.label}` : code;
  };

  // Palette of stable colors per range code
  const rangeColorClass = (code?: string | null) => {
    if (!code) return "";
    const palette = [
      "bg-blue-500/15 text-blue-400 border-blue-500/30",
      "bg-purple-500/15 text-purple-400 border-purple-500/30",
      "bg-amber-500/15 text-amber-400 border-amber-500/30",
      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      "bg-pink-500/15 text-pink-400 border-pink-500/30",
      "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      "bg-orange-500/15 text-orange-400 border-orange-500/30",
      "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    ];
    let h = 0;
    for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  };

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("products").update({ is_published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Statut mis à jour");
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Produit supprimé");
    },
  });

  const openEdit = (product: any) => { setEditingProduct(product); setShowForm(true); };
  const openNew = () => { setEditingProduct(null); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingProduct(null); };

  if (showForm) return <ProductForm product={editingProduct} onClose={closeForm} />;

  const filtered = (products || []).filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.subcategory || "").toLowerCase().includes(q) || (p.range_code || "").toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Produits</h1>
        <button onClick={openNew} className="flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom, catégorie, sous-catégorie ou gamme..."
          className="w-full rounded-sm border border-border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : !filtered.length ? (
        <p className="text-sm text-muted-foreground">{searchQuery ? "Aucun produit trouvé." : 'Aucun produit. Cliquez sur "Ajouter" pour commencer.'}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-sm border border-border bg-card p-4">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded-sm object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-secondary text-xs text-muted-foreground">—</div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.category}{p.subcategory ? ` › ${p.subcategory}` : ""}</p>
              </div>
              {p.range_code ? (
                <span className={`hidden md:inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${rangeColorClass(p.range_code)}`} title={rangeLabel(p.range_code) || ""}>
                  {p.range_code}
                </span>
              ) : (
                <span className="hidden md:inline-flex items-center rounded-sm border border-dashed border-border px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                  Sans gamme
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${p.is_published ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                {p.is_published ? "Publié" : "Brouillon"}
              </span>
              <div className="flex gap-1">
                <button onClick={() => togglePublish.mutate({ id: p.id, is_published: !p.is_published })} className="rounded-sm p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" title={p.is_published ? "Dépublier" : "Publier"}>
                  {p.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => openEdit(p)} className="rounded-sm p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => { if (confirm("Supprimer ce produit ?")) deleteProduct.mutate(p.id); }} className="rounded-sm p-2 text-muted-foreground hover:bg-secondary hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
