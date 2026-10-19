import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Undo2, X } from "lucide-react";

/**
 * Bouton « Annuler la dernière action » de l'admin.
 * S'appuie sur l'historique (table audit_log, alimentée automatiquement par la base) :
 * la dernière action = la dernière rafale d'écritures (moins de 3 s entre deux écritures : un
 * « Sauvegarder » peut modifier plusieurs lignes d'un coup). On les défait dans l'ordre inverse :
 *   suppression → l'élément est recréé ; modification → anciennes valeurs ; ajout → l'élément est retiré.
 * Annuler une annulation refait l'action.
 */
type Entry = Database["public"]["Tables"]["audit_log"]["Row"];
type Data = Record<string, Json | undefined>;
type Table = { insert: (r: Data) => PromiseLike<{ error: { message: string } | null }>; update: (r: Data) => Filter; delete: () => Filter };
type Filter = { eq: (c: string, v: string) => PromiseLike<{ error: { message: string } | null }> };

const LABELS: Record<string, string> = {
  products: "produit", product_images: "photo produit", product_ranges: "gamme", equipment_categories: "catégorie",
  equipment_subcategories: "sous-catégorie", hero_slides: "image du carrousel", category_cards: "carte d'accueil",
  home_sections: "section d'accueil", about_sections: "section À propos", consulting_services: "solution",
  realisations: "réalisation", realisation_images: "image de réalisation", testimonials: "témoignage",
  blog_posts: "article", faqs: "question FAQ", contact_settings: "coordonnée",
};
const VERB: Record<string, string> = { DELETE: "suppression", UPDATE: "modification", INSERT: "ajout" };
const WINDOW_MS = 60_000; // limite de sécurité
const GAP_MS = 3_000;
const SKIP = new Set(["created_at", "updated_at"]);

const nameOf = (e: Entry) => {
  const d = (e.old_data || e.new_data || {}) as Data;
  return String(d.name ?? d.title ?? d.question ?? d.code ?? d.key ?? d.caption ?? "").slice(0, 50);
};

const AdminUndo = () => {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: batch } = useQuery({
    queryKey: ["admin-undo-batch"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      if (auth.user?.id) q = q.eq("user_id", auth.user.id);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []).filter((e) => e.table_name in LABELS);
      if (!rows.length) return [];
      const last = new Date(rows[0].created_at).getTime();
      // l'action la plus récente doit dater de moins de 24 h
      if (Date.now() - last > 24 * 3600 * 1000) return [];
      // un même « Sauvegarder » écrit en rafale : on prend les écritures espacées de moins de 3 s
      const out = [rows[0]];
      for (let i = 1; i < rows.length; i++) {
        const gap = new Date(out[out.length - 1].created_at).getTime() - new Date(rows[i].created_at).getTime();
        if (gap > GAP_MS || last - new Date(rows[i].created_at).getTime() > WINDOW_MS) break;
        out.push(rows[i]);
      }
      return out;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  if (!batch?.length) return null;

  const counts = batch.reduce<Record<string, number>>((acc, e) => {
    const k = `${VERB[e.action] ?? e.action} · ${LABELS[e.table_name]}`;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(counts).map(([k, n]) => (n > 1 ? `${k} (×${n})` : k)).join(", ");
  const hasDelete = batch.some((e) => e.action === "DELETE");
  const one = batch.length === 1 ? nameOf(batch[0]) : "";

  const undo = async () => {
    setBusy(true);
    let failed = 0;
    // du plus récent au plus ancien
    for (const e of batch) {
      const t = supabase.from(e.table_name as "products") as unknown as Table;
      const oldD = (e.old_data || {}) as Data;
      const newD = (e.new_data || {}) as Data;
      const keyCol = oldD.id !== undefined || newD.id !== undefined ? "id" : "key";
      const keyVal = String(oldD[keyCol] ?? newD[keyCol]);
      let res: { error: { message: string } | null };
      if (e.action === "DELETE") res = await t.insert(oldD);
      else if (e.action === "INSERT") res = await t.delete().eq(keyCol, keyVal);
      else {
        const patch: Data = {};
        e.changed_fields.filter((f) => !SKIP.has(f)).forEach((f) => { patch[f] = oldD[f] ?? null; });
        res = await t.update(patch).eq(keyCol, keyVal);
      }
      if (res.error) failed++;
    }
    setBusy(false);
    setConfirming(false);
    qc.invalidateQueries();
    if (failed) toast.error(`${batch.length - failed} élément(s) rétabli(s), ${failed} impossible(s) : voir Paramètres → Historique.`);
    else toast.success("Dernière action annulée. Les pages de l'admin sont rechargées.");
  };

  return (
    <div className="fixed bottom-4 left-60 z-50 max-w-sm" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className={`flex items-center gap-2 rounded-sm border px-4 py-2.5 text-sm font-semibold shadow-lg transition-colors ${hasDelete ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90" : "border-border bg-card text-foreground hover:bg-secondary"}`}
          title={`Dernière action : ${summary}`}
        >
          <Undo2 className="h-4 w-4" /> Annuler la dernière action
        </button>
      ) : (
        <div className="rounded-sm border border-border bg-card p-4 text-sm shadow-xl">
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="font-semibold text-foreground">Annuler la dernière action ?</p>
            <button onClick={() => setConfirming(false)} aria-label="Fermer" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-muted-foreground">{summary}{one && ` : « ${one} »`}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Faite le {new Date(batch[0].created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.
            Pour une action plus ancienne : Paramètres → Historique.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={undo} disabled={busy} className="flex items-center gap-2 rounded-sm bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
              <Undo2 className="h-4 w-4" /> {busy ? "Annulation…" : "Oui, annuler"}
            </button>
            <button onClick={() => setConfirming(false)} className="rounded-sm border border-border px-3 py-2 text-sm hover:bg-secondary">Non</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUndo;
