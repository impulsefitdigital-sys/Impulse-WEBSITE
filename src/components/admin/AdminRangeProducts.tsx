import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Layers } from "lucide-react";

/**
 * Gestion des GAMMES (product_ranges) :
 * - une gamme = un code (ex. SL, IT95) + un libellé ;
 * - elle peut être placée dans plusieurs emplacements (espace × catégorie × sous-catégorie) :
 *   chaque emplacement = une ligne product_ranges (c'est ce qui affiche le filtre « Gammes » de la page) ;
 * - actions groupées sur les produits de la gamme : espace (Pro / Résidentiel / les deux),
 *   publier / masquer, et sous-catégorie produit par produit.
 */

type Usage = "professionnel" | "residentiel";
type ProductUsage = Usage | "both";

interface RangeRow {
  id: string;
  code: string;
  label: string;
  usage_type: Usage;
  category: string;
  subcategory: string;
  sort_order: number;
  is_active: boolean;
}
interface Cat { slug: string; title: string; usage_type: Usage }
interface Sub { slug: string; title: string; category_slug: string; usage_type: Usage }
interface Prod { id: string; name: string; range_code: string | null; usage_type: ProductUsage; category: string; subcategory: string | null; is_published: boolean }

const USAGE_LABEL: Record<ProductUsage, string> = { professionnel: "Pro", residentiel: "Résidentiel", both: "Pro + Résidentiel" };
const inputClass = "rounded-sm border border-border bg-background px-2 py-1.5 text-sm";

const AdminRangeProducts = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: ranges = [] } = useQuery({
    queryKey: ["admin-ranges"],
    queryFn: async () => { const { data, error } = await supabase.from("product_ranges").select("*").order("sort_order"); if (error) throw error; return (data || []) as RangeRow[]; },
  });
  const { data: cats = [] } = useQuery({
    queryKey: ["admin-ranges-cats"],
    queryFn: async () => { const { data, error } = await supabase.from("equipment_categories").select("*").order("sort_order"); if (error) throw error; return (data || []) as Cat[]; },
  });
  const { data: subs = [] } = useQuery({
    queryKey: ["admin-ranges-subs"],
    queryFn: async () => { const { data, error } = await supabase.from("equipment_subcategories").select("*").order("sort_order"); if (error) throw error; return (data || []) as Sub[]; },
  });
  const { data: products = [] } = useQuery({
    queryKey: ["admin-ranges-products"],
    queryFn: async () => { const { data, error } = await supabase.from("products").select("*").order("sort_order"); if (error) throw error; return (data || []) as Prod[]; },
  });

  const refresh = () => {
    ["admin-ranges", "admin-ranges-products", "admin-products", "admin-product-ranges", "public-products", "ranges"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  // Regroupe les lignes product_ranges par code
  const groups = useMemo(() => {
    const m = new Map<string, RangeRow[]>();
    ranges.forEach((r) => { if (!m.has(r.code)) m.set(r.code, []); m.get(r.code)!.push(r); });
    // codes utilisés par des produits mais sans ligne de gamme
    products.forEach((p) => { if (p.range_code && !m.has(p.range_code)) m.set(p.range_code, []); });
    const q = search.trim().toLowerCase();
    return [...m.entries()]
      .filter(([code, rows]) => !q || code.toLowerCase().includes(q) || rows.some((r) => (r.label || "").toLowerCase().includes(q)))
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [ranges, products, search]);

  const catTitle = (slug: string) => cats.find((c) => c.slug === slug)?.title || slug;
  const subTitle = (cat: string, slug: string) => subs.find((s) => s.category_slug === cat && s.slug === slug)?.title || slug;
  const subsFor = (usage: Usage, cat: string) => {
    const seen = new Set<string>();
    return subs.filter((s) => s.usage_type === usage && s.category_slug === cat && !seen.has(s.slug) && seen.add(s.slug));
  };
  const catsFor = (usage: Usage) => {
    const seen = new Set<string>();
    return cats.filter((c) => c.usage_type === usage && !seen.has(c.slug) && seen.add(c.slug));
  };
  // toutes les sous-catégories (titres) possibles pour un produit, d'après les emplacements de sa gamme
  const placementTargets = (rows: RangeRow[]) => {
    const seen = new Set<string>(); const out: { category: string; subcategory: string; label: string }[] = [];
    rows.forEach((r) => {
      const c = catTitle(r.category), s = subTitle(r.category, r.subcategory), key = `${c}|${s}`;
      if (!seen.has(key)) { seen.add(key); out.push({ category: c, subcategory: s, label: `${c} › ${s}` }); }
    });
    return out;
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); refresh(); } catch (e: any) { toast.error(e?.message || "Erreur"); } finally { setBusy(false); }
  };
  const check = (res: { error: any }) => { if (res.error) throw res.error; return res; };

  const updateRows = (rows: RangeRow[], patch: Partial<RangeRow>) =>
    run(async () => { for (const r of rows) check(await supabase.from("product_ranges").update(patch).eq("id", r.id)); }, "Gamme mise à jour");

  const addPlacement = (code: string, label: string, usage: Usage) => {
    const cat = catsFor(usage)[0]?.slug || "musculation";
    const sub = subsFor(usage, cat)[0]?.slug || "";
    return run(async () => { check(await supabase.from("product_ranges").insert({ code, label, usage_type: usage, category: cat, subcategory: sub, is_active: true, sort_order: 99 })); }, "Emplacement ajouté");
  };

  const createRange = () => {
    const code = newCode.trim();
    if (!code) { toast.error("Indiquez un code de gamme (ex. FF)"); return; }
    if (groups.some(([c]) => c.toLowerCase() === code.toLowerCase())) { toast.error("Cette gamme existe déjà"); return; }
    return run(async () => {
      check(await supabase.from("product_ranges").insert({ code, label: newLabel.trim(), usage_type: "professionnel", category: "musculation", subcategory: "mono-stations", is_active: true, sort_order: 99 }));
      setNewCode(""); setNewLabel(""); setOpen(code);
    }, "Gamme créée — choisissez maintenant son emplacement");
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground"><Layers className="h-5 w-5" /> Gammes</h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une gamme (code ou libellé)…" className={`${inputClass} w-72`} />
      </div>
      <p className="mb-5 text-xs text-muted-foreground">
        Une gamme regroupe les produits d'une même série (ex. SL, IT95). Ici vous choisissez <strong>où elle apparaît</strong> (Pro / Résidentiel, catégorie, sous-catégorie),
        si son filtre est <strong>visible</strong>, et vous pouvez <strong>publier, masquer ou déplacer tous ses produits</strong> en une fois.
      </p>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-sm border border-dashed border-border bg-card p-3">
        <div><label className="mb-1 block text-[11px] text-muted-foreground">Code</label><input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="ex. FG" className={`${inputClass} w-28`} /></div>
        <div className="flex-1 min-w-[180px]"><label className="mb-1 block text-[11px] text-muted-foreground">Libellé (facultatif)</label><input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="ex. FG Series" className={`${inputClass} w-full`} /></div>
        <button onClick={createRange} disabled={busy} className="flex items-center gap-1 rounded-sm bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"><Plus className="h-4 w-4" /> Nouvelle gamme</button>
      </div>

      <div className="space-y-2">
        {groups.map(([code, rows]) => {
          const prods = products.filter((p) => p.range_code === code);
          const pub = prods.filter((p) => p.is_published).length;
          const visible = rows.length > 0 && rows.every((r) => r.is_active);
          const anyVisible = rows.some((r) => r.is_active);
          const label = rows.find((r) => r.label)?.label || "";
          const isOpen = open === code;
          const targets = placementTargets(rows);
          return (
            <div key={code} className="rounded-sm border border-border bg-card">
              <div className="flex flex-wrap items-center gap-3 p-3">
                <button title={visible ? "Filtre visible — cliquer pour masquer" : "Filtre masqué — cliquer pour afficher"} disabled={busy || rows.length === 0}
                  onClick={() => updateRows(rows, { is_active: !anyVisible })} className={anyVisible ? "text-accent" : "text-muted-foreground"}>
                  {anyVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <span className="min-w-[70px] font-mono text-sm font-bold text-foreground">{code}</span>
                <span className="flex-1 truncate text-sm text-muted-foreground">{label}</span>
                <div className="hidden flex-wrap gap-1 md:flex">
                  {rows.length === 0 && <span className="rounded-sm bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-600">aucun emplacement</span>}
                  {rows.map((r) => (
                    <span key={r.id} className={`rounded-sm border px-2 py-0.5 text-[11px] ${r.is_active ? "border-border text-foreground" : "border-dashed text-muted-foreground line-through"}`}>
                      {USAGE_LABEL[r.usage_type]} · {catTitle(r.category)} › {subTitle(r.category, r.subcategory)}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{pub}/{prods.length} publiés</span>
                <button onClick={() => setOpen(isOpen ? null : code)} className="text-muted-foreground hover:text-foreground">{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
              </div>

              {isOpen && (
                <div className="space-y-5 border-t border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-muted-foreground">Libellé affiché à côté du code</label>
                    <input defaultValue={label} onBlur={(e) => { if (e.target.value !== label && rows.length) updateRows(rows, { label: e.target.value }); }} className={`${inputClass} w-64`} placeholder="ex. Plate Loaded" />
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Emplacements (où le filtre de la gamme apparaît)</h3>
                    <div className="space-y-2">
                      {rows.map((r) => (
                        <div key={r.id} className="flex flex-wrap items-center gap-2">
                          <button disabled={busy} onClick={() => updateRows([r], { is_active: !r.is_active })} className={r.is_active ? "text-accent" : "text-muted-foreground"} title={r.is_active ? "Visible" : "Masqué"}>
                            {r.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                          <select value={r.usage_type} disabled={busy} onChange={(e) => { const u = e.target.value as Usage; const c = catsFor(u).find((x) => x.slug === r.category) ? r.category : catsFor(u)[0]?.slug; updateRows([r], { usage_type: u, category: c, subcategory: subsFor(u, c).find((s) => s.slug === r.subcategory) ? r.subcategory : subsFor(u, c)[0]?.slug }); }} className={inputClass}>
                            <option value="professionnel">Professionnel</option>
                            <option value="residentiel">Résidentiel</option>
                          </select>
                          <select value={r.category} disabled={busy} onChange={(e) => updateRows([r], { category: e.target.value, subcategory: subsFor(r.usage_type, e.target.value)[0]?.slug || "" })} className={inputClass}>
                            {catsFor(r.usage_type).map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
                          </select>
                          <select value={r.subcategory} disabled={busy} onChange={(e) => updateRows([r], { subcategory: e.target.value })} className={inputClass}>
                            {subsFor(r.usage_type, r.category).map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
                          </select>
                          <button disabled={busy} onClick={() => run(async () => { check(await supabase.from("product_ranges").delete().eq("id", r.id)); }, "Emplacement retiré")} className="text-muted-foreground hover:text-destructive" title="Retirer cet emplacement"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <button disabled={busy} onClick={() => addPlacement(code, label, "professionnel")} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"><Plus className="h-3 w-3" /> Emplacement Pro</button>
                        <button disabled={busy} onClick={() => addPlacement(code, label, "residentiel")} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"><Plus className="h-3 w-3" /> Emplacement Résidentiel</button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produits de la gamme ({prods.length})</h3>
                    {prods.length === 0 ? <p className="text-xs text-muted-foreground">Aucun produit avec ce code de gamme.</p> : (
                      <>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">Pour tous les produits :</span>
                          <button disabled={busy} onClick={() => run(async () => { check(await supabase.from("products").update({ is_published: true }).eq("range_code", code)); }, "Produits publiés")} className="rounded-sm border border-border px-2 py-1 text-xs hover:bg-secondary">Tout publier</button>
                          <button disabled={busy} onClick={() => run(async () => { check(await supabase.from("products").update({ is_published: false }).eq("range_code", code)); }, "Produits masqués")} className="rounded-sm border border-border px-2 py-1 text-xs hover:bg-secondary">Tout masquer</button>
                          <span className="mx-1 text-xs text-muted-foreground">Espace :</span>
                          {(["professionnel", "residentiel", "both"] as ProductUsage[]).map((u) => (
                            <button key={u} disabled={busy} onClick={() => run(async () => { check(await supabase.from("products").update({ usage_type: u }).eq("range_code", code)); }, `Produits : ${USAGE_LABEL[u]}`)} className="rounded-sm border border-border px-2 py-1 text-xs hover:bg-secondary">{USAGE_LABEL[u]}</button>
                          ))}
                          {targets.length === 1 && (
                            <button disabled={busy} onClick={() => run(async () => { check(await supabase.from("products").update({ category: targets[0].category, subcategory: targets[0].subcategory }).eq("range_code", code)); }, "Produits déplacés")} className="rounded-sm border border-border px-2 py-1 text-xs hover:bg-secondary">Ranger tous dans {targets[0].label}</button>
                          )}
                        </div>
                        <div className="max-h-[420px] overflow-y-auto rounded-sm border border-border">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-secondary text-left text-muted-foreground"><tr><th className="p-2">Visible</th><th className="p-2">Produit</th><th className="p-2">Espace</th><th className="p-2">Rangé dans</th></tr></thead>
                            <tbody>
                              {prods.map((p) => (
                                <tr key={p.id} className="border-t border-border">
                                  <td className="p-2">
                                    <button disabled={busy} onClick={() => run(async () => { check(await supabase.from("products").update({ is_published: !p.is_published }).eq("id", p.id)); }, p.is_published ? "Produit masqué" : "Produit publié")} className={p.is_published ? "text-accent" : "text-muted-foreground"}>
                                      {p.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    </button>
                                  </td>
                                  <td className="p-2 text-foreground">{p.name}</td>
                                  <td className="p-2">
                                    <select value={p.usage_type} disabled={busy} onChange={(e) => run(async () => { check(await supabase.from("products").update({ usage_type: e.target.value }).eq("id", p.id)); }, "Espace modifié")} className={inputClass}>
                                      <option value="professionnel">Pro</option><option value="residentiel">Résidentiel</option><option value="both">Pro + Résidentiel</option>
                                    </select>
                                  </td>
                                  <td className="p-2">
                                    <select value={`${p.category}|${p.subcategory ?? ""}`} disabled={busy} onChange={(e) => { const [c, s] = e.target.value.split("|"); run(async () => { check(await supabase.from("products").update({ category: c, subcategory: s || null }).eq("id", p.id)); }, "Produit déplacé"); }} className={inputClass}>
                                      {!targets.some((t) => t.category === p.category && t.subcategory === p.subcategory) && <option value={`${p.category}|${p.subcategory ?? ""}`}>{p.category} › {p.subcategory || "—"}</option>}
                                      {targets.map((t) => <option key={t.label} value={`${t.category}|${t.subcategory}`}>{t.label}</option>)}
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">« Rangé dans » propose les emplacements de la gamme. Pour un autre emplacement, ajoutez-le d'abord ci-dessus.</p>
                      </>
                    )}
                  </div>

                  {prods.length === 0 && rows.length > 0 && (
                    <button disabled={busy} onClick={() => run(async () => { check(await supabase.from("product_ranges").delete().eq("code", code)); setOpen(null); }, "Gamme supprimée")} className="flex items-center gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /> Supprimer la gamme (aucun produit)</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminRangeProducts;
