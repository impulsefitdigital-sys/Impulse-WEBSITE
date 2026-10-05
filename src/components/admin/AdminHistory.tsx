import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";

type Entry = Database["public"]["Tables"]["audit_log"]["Row"];
type Data = Record<string, Json | undefined>;

const TABLES: Record<string, string> = {
  products: "Produit", product_images: "Photo produit", product_ranges: "Gamme",
  equipment_categories: "Catégorie", equipment_subcategories: "Sous-catégorie", hero_slides: "Carrousel",
  category_cards: "Carte accueil", home_sections: "Section accueil", about_sections: "À propos",
  consulting_services: "Consulting", realisations: "Réalisation", realisation_images: "Image de réalisation",
  testimonials: "Témoignage", blog_posts: "Article de blog", faqs: "FAQ", contact_settings: "Coordonnées",
  contact_requests: "Demande", newsletter_subscribers: "Abonné newsletter",
};
const ACTIONS: Record<string, { label: string; className: string }> = {
  INSERT: { label: "Ajout", className: "bg-green-100 text-green-700" },
  UPDATE: { label: "Modification", className: "bg-blue-100 text-blue-700" },
  DELETE: { label: "Suppression", className: "bg-red-100 text-red-700" },
};
const FIELDS: Record<string, string> = {
  name: "nom", title: "titre", description: "description", short_description: "description courte", image_url: "image",
  hover_image_url: "image survol", is_published: "publié", is_active: "visible", sort_order: "ordre", price: "prix",
  content: "texte", excerpt: "résumé", value: "valeur", status: "statut", notes: "notes", amount: "montant",
  follow_up_date: "relance", caption: "légende", slug: "adresse", category: "catégorie", subcategory: "sous-catégorie",
  range_code: "gamme", subtitle: "sous-titre", question: "question", answer: "réponse", is_read: "lu", key_facts: "chiffres clés",
};

const labelOf = (e: Entry) => {
  const d = (e.new_data || e.old_data || {}) as Data;
  const v = d.name ?? d.title ?? d.question ?? d.full_name ?? d.code ?? d.caption ?? d.key ?? d.email ?? e.record_id;
  return String(v ?? "—").slice(0, 80);
};

const show = (v: Json | undefined) => {
  if (v === null || v === undefined || v === "") return "∅";
  if (typeof v === "boolean") return v ? "oui" : "non";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 180 ? s.slice(0, 180) + "…" : s;
};

// colonnes techniques qu'on ne restaure pas (gérées par la base)
const SKIP = new Set(["created_at", "updated_at"]);

const AdminHistory = () => {
  const qc = useQueryClient();
  const [table, setTable] = useState("");
  const [limit, setLimit] = useState(100);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => { void supabase.rpc("purge_audit_log"); }, []);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["audit-log", table, limit],
    queryFn: async () => {
      let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
      if (table) q = q.eq("table_name", table);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const restore = async (e: Entry) => {
    const from = supabase.from(e.table_name as "products") as unknown as {
      update: (p: Data) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
      insert: (p: Data) => Promise<{ error: unknown }>;
    };
    const old = (e.old_data || {}) as Data;
    let error: unknown = null;
    if (e.action === "UPDATE") {
      if (!confirm(`Remettre les anciennes valeurs (${e.changed_fields.map((f) => FIELDS[f] ?? f).join(", ")}) ?`)) return;
      const patch: Data = {};
      e.changed_fields.filter((f) => !SKIP.has(f)).forEach((f) => { patch[f] = old[f] ?? null; });
      ({ error } = await from.update(patch).eq(old.key !== undefined && old.id === undefined ? "key" : "id", String(old.id ?? old.key)));
    } else if (e.action === "DELETE") {
      if (!confirm("Recréer l'élément supprimé ?")) return;
      ({ error } = await from.insert(old));
    }
    if (error) toast.error("Restauration impossible (l'élément a peut-être été modifié ou recréé entre-temps)");
    else { toast.success("Restauré"); qc.invalidateQueries(); }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Historique des modifications</h1>
          <p className="text-sm text-muted-foreground">Tout ajout, modification ou suppression faite dans l'admin, avec les valeurs avant / après. Conservé 12 mois.</p>
        </div>
        <select value={table} onChange={(e) => setTable(e.target.value)} className="rounded-sm border border-border bg-card px-3 py-2 text-sm">
          <option value="">Tous les éléments</option>
          {Object.entries(TABLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading ? <p className="text-muted-foreground">Chargement…</p> : !entries?.length ? (
        <p className="text-sm text-muted-foreground">Aucune modification enregistrée pour le moment.</p>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border bg-card">
          {entries.map((e) => {
            const a = ACTIONS[e.action] ?? ACTIONS.UPDATE;
            const isOpen = open === e.id;
            const oldD = (e.old_data || {}) as Data;
            const newD = (e.new_data || {}) as Data;
            return (
              <div key={e.id} className="border-b border-border last:border-0">
                <button onClick={() => setOpen(isOpen ? null : e.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-secondary/40">
                  {isOpen ? <ChevronDown className="h-4 w-4 flex-none text-muted-foreground" /> : <ChevronRight className="h-4 w-4 flex-none text-muted-foreground" />}
                  <span className="w-36 flex-none text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className={`w-28 flex-none rounded-full px-2 py-0.5 text-center text-[11px] font-semibold ${a.className}`}>{a.label}</span>
                  <span className="w-40 flex-none text-xs text-muted-foreground">{TABLES[e.table_name] ?? e.table_name}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{labelOf(e)}</span>
                  {e.action === "UPDATE" && <span className="hidden max-w-[260px] truncate text-xs text-muted-foreground lg:block">{e.changed_fields.map((f) => FIELDS[f] ?? f).join(", ")}</span>}
                  <span className="hidden w-44 flex-none truncate text-right text-xs text-muted-foreground md:block">{e.user_email}</span>
                </button>
                {isOpen && (
                  <div className="space-y-3 bg-secondary/30 px-4 py-3 pl-11">
                    {e.action === "UPDATE" ? (
                      <table className="w-full text-xs">
                        <thead><tr className="text-left text-muted-foreground"><th className="w-40 py-1">Champ</th><th className="py-1">Avant</th><th className="py-1">Après</th></tr></thead>
                        <tbody>
                          {e.changed_fields.map((f) => (
                            <tr key={f} className="align-top">
                              <td className="py-1 font-medium">{FIELDS[f] ?? f}</td>
                              <td className="break-all py-1 pr-3 text-red-800 line-through decoration-red-300">{show(oldD[f])}</td>
                              <td className="break-all py-1 text-green-800">{show(newD[f])}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="break-all text-xs text-muted-foreground">
                        {Object.entries(e.action === "DELETE" ? oldD : newD).filter(([k]) => !SKIP.has(k) && k !== "id").slice(0, 8)
                          .map(([k, v]) => `${FIELDS[k] ?? k} : ${show(v)}`).join(" · ")}
                      </p>
                    )}
                    {(e.action === "UPDATE" || e.action === "DELETE") && (
                      <button onClick={() => restore(e)} className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                        <RotateCcw className="h-3.5 w-3.5" /> {e.action === "UPDATE" ? "Revenir à la version d'avant" : "Recréer l'élément"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {entries && entries.length >= limit && (
        <button onClick={() => setLimit(limit + 100)} className="mt-3 text-sm text-accent hover:underline">Afficher plus</button>
      )}
    </div>
  );
};

export default AdminHistory;
