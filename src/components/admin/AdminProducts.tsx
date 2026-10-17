import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
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
  const [usageF, setUsageF] = useState("all");
  const [catF, setCatF] = useState("all");
  const [subF, setSubF] = useState("all");
  const [rangeF, setRangeF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [grouped, setGrouped] = useState(true);
  const [closed, setClosed] = useState<Record<string, boolean>>({});

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

  const USAGE_LABEL: Record<string, string> = { professionnel: "Pro", residentiel: "Résidentiel", both: "Pro + Rés." };
  const needsAttention = (p: any) => !p.subcategory || !p.range_code || !p.image_url;

  const all = products || [];
  const cats = [...new Set(all.map((p: any) => p.category).filter(Boolean))].sort();
  const subs = [...new Set(all.filter((p: any) => catF === "all" || p.category === catF).map((p: any) => p.subcategory).filter(Boolean))].sort();
  const codes = [...new Set(all.map((p: any) => p.range_code).filter(Boolean))].sort();

  const filtered = all.filter((p: any) => {
    if (usageF !== "all" && !(p.usage_type === usageF || (p.usage_type === "both" && usageF !== "both"))) return false;
    if (catF !== "all" && p.category !== catF) return false;
    if (subF !== "all" && p.subcategory !== subF) return false;
    if (rangeF !== "all" && (rangeF === "__none" ? !!p.range_code : p.range_code !== rangeF)) return false;
    if (statusF === "published" && !p.is_published) return false;
    if (statusF === "draft" && p.is_published) return false;
    if (statusF === "attention" && !needsAttention(p)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q) || (p.subcategory || "").toLowerCase().includes(q) || (p.range_code || "").toLowerCase().includes(q);
  });

  // (pas de hook ici : on est après le « return » conditionnel du formulaire)
  const groups = (() => {
    const m = new Map<string, any[]>();
    for (const p of filtered) {
      const k = p.range_code || "Sans gamme";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return [...m.entries()].sort((x, y) => (x[0] === "Sans gamme" ? 1 : y[0] === "Sans gamme" ? -1 : x[0].localeCompare(y[0])));
  })();

  const filtersOn = usageF !== "all" || catF !== "all" || subF !== "all" || rangeF !== "all" || statusF !== "all" || !!searchQuery.trim();
  const resetFilters = () => { setUsageF("all"); setCatF("all"); setSubF("all"); setRangeF("all"); setStatusF("all"); setSearchQuery(""); };
  const sel = "rounded-sm border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent";
  const attentionCount = all.filter(needsAttention).length;

  const Row = ({ p }: { p: any }) => (
    <div className="flex items-center gap-4 rounded-sm border border-border bg-card p-3">
      {p.image_url ? (
        <img src={p.image_url} alt={p.name} loading="lazy" className="h-14 w-14 rounded-sm border border-border bg-white object-contain" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-secondary text-xs text-muted-foreground">—</div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate">{p.name}</h3>
        <p className="text-xs text-muted-foreground">
          {USAGE_LABEL[p.usage_type] || p.usage_type} · {p.category}{p.subcategory ? ` › ${p.subcategory}` : ""}
          {needsAttention(p) && (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-600" title="Fiche incomplète : sous-catégorie, gamme ou image manquante">
              <AlertTriangle className="h-3 w-3" /> {!p.subcategory ? "sans sous-catégorie" : !p.range_code ? "sans gamme" : "sans image"}
            </span>
          )}
        </p>
      </div>
      {!grouped && (p.range_code ? (
        <span className={`hidden md:inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${rangeColorClass(p.range_code)}`} title={rangeLabel(p.range_code) || ""}>
          {p.range_code}
        </span>
      ) : (
        <span className="hidden md:inline-flex items-center rounded-sm border border-dashed border-border px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">Sans gamme</span>
      ))}
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${p.is_published ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground"}`}>
        {p.is_published ? "Publié" : "Brouillon"}
      </span>
      <div className="flex gap-1">
        <button onClick={() => togglePublish.mutate({ id: p.id, is_published: !p.is_published })} className="rounded-sm p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" title={p.is_published ? "Dépublier" : "Publier"}>
          {p.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button onClick={() => openEdit(p)} className="rounded-sm p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Modifier">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={() => { if (confirm("Supprimer ce produit ?")) deleteProduct.mutate(p.id); }} className="rounded-sm p-2 text-muted-foreground hover:bg-secondary hover:text-destructive" title="Supprimer">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Produits</h1>
          <p className="text-sm text-muted-foreground">
            {all.length} produits · {all.filter((p: any) => p.is_published).length} publiés
            {attentionCount > 0 && <> · <button onClick={() => setStatusF("attention")} className="text-amber-600 underline">{attentionCount} à compléter</button></>}
          </p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      <div className="mb-4 space-y-2 rounded-sm border border-border bg-card p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            id="admin-products-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom ou référence (ex. IT9519, Leg Press)…"
            className="w-full rounded-sm border border-border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Espace" value={usageF} onChange={(e) => setUsageF(e.target.value)} className={sel}>
            <option value="all">Tous les espaces</option>
            <option value="professionnel">Professionnel</option>
            <option value="residentiel">Résidentiel</option>
            <option value="both">Pro + Résidentiel uniquement</option>
          </select>
          <select aria-label="Catégorie" value={catF} onChange={(e) => { setCatF(e.target.value); setSubF("all"); }} className={sel}>
            <option value="all">Toutes les catégories</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Sous-catégorie" value={subF} onChange={(e) => setSubF(e.target.value)} className={sel}>
            <option value="all">Toutes les sous-catégories</option>
            {subs.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Gamme" value={rangeF} onChange={(e) => setRangeF(e.target.value)} className={sel}>
            <option value="all">Toutes les gammes</option>
            {codes.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__none">Sans gamme</option>
          </select>
          <select aria-label="Statut" value={statusF} onChange={(e) => setStatusF(e.target.value)} className={sel}>
            <option value="all">Tous les statuts</option>
            <option value="published">Publiés</option>
            <option value="draft">Brouillons</option>
            <option value="attention">À compléter</option>
          </select>
          <label className="ml-auto flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} className="h-4 w-4" /> Grouper par gamme
          </label>
          {filtersOn && <button onClick={resetFilters} className="text-sm text-accent underline">Réinitialiser</button>}
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} produit{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : !filtered.length ? (
        <p className="text-sm text-muted-foreground">{filtersOn ? "Aucun produit ne correspond à ces filtres." : 'Aucun produit. Cliquez sur "Ajouter" pour commencer.'}</p>
      ) : grouped ? (
        <div className="space-y-3">
          {groups.map(([code, list]) => {
            const isClosed = !!closed[code];
            const pub = list.filter((p: any) => p.is_published).length;
            return (
              <div key={code} className="rounded-sm border border-border">
                <button onClick={() => setClosed((c) => ({ ...c, [code]: !isClosed }))} className="flex w-full items-center gap-3 bg-secondary/40 px-3 py-2.5 text-left">
                  {isClosed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${code === "Sans gamme" ? "border-dashed border-border text-muted-foreground" : rangeColorClass(code)}`}>{code}</span>
                  {code !== "Sans gamme" && rangeLabel(code) !== code && <span className="text-sm text-foreground">{rangeLabel(code)?.split(" — ")[1]}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{list.length} produit{list.length > 1 ? "s" : ""} · {pub} publié{pub > 1 ? "s" : ""}</span>
                </button>
                {!isClosed && <div className="space-y-2 p-2">{list.map((p: any) => <Row key={p.id} p={p} />)}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p: any) => <Row key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
