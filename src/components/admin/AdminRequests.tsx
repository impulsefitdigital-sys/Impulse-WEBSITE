import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, IS_DEMO } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, FileDown, Phone, Mail, MessageCircle, Trash2, Search, X, Save, CalendarClock, Sparkles } from "lucide-react";
import {
  STATUSES, statusInfo, isOpenStatus, requestItems, realEmail, sourceLabel, formatDate, formatAmount,
  exportRequestsCsv, downloadRequestPdf, type ContactRequest,
} from "@/lib/requests";
import type { AdminNavigate } from "@/pages/Admin";
import logo from "@/assets/logo-new.png";

type TypeFilter = "tous" | "devis" | "contact";

const today = () => new Date().toISOString().slice(0, 10);
const due = (r: ContactRequest) => !!r.follow_up_date && r.follow_up_date <= today() && isOpenStatus(r.status);

const AdminRequests = ({ selectedId, navigate }: { selectedId: string | null; navigate: AdminNavigate }) => {
  const qc = useQueryClient();
  const [type, setType] = useState<TypeFilter>("tous");
  const [status, setStatus] = useState<string | "tous" | "relance">("tous");
  const [q, setQ] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ContactRequest[];
    },
  });

  const { data: company } = useQuery({
    queryKey: ["contact-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_settings").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });

  const all = useMemo(() => requests || [], [requests]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((r) =>
      (type === "tous" || r.request_type === type) &&
      (status === "tous" || (status === "relance" ? due(r) : r.status === status)) &&
      (!term || [r.full_name, r.phone, r.email, r.company, r.city, r.quote_number, r.notes]
        .some((v) => String(v ?? "").toLowerCase().includes(term))));
  }, [all, type, status, q]);

  const selected = all.find((r) => r.id === selectedId) ?? null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-requests"] });
    qc.invalidateQueries({ queryKey: ["admin-requests-new-count"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ContactRequest> }) => {
      const { error } = await supabase.from("contact_requests").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); navigate("requests"); toast.success("Demande supprimée (elle reste dans le Google Sheet)"); },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  // une demande ouverte est « lue »
  useEffect(() => {
    if (selected && !selected.is_read) update.mutate({ id: selected.id, patch: { is_read: true } });
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const seedDemo = async () => {
    const { error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ error: { message: string } | null }>)("demo_seed");
    if (error) toast.error(error.message); else { toast.success("Données fictives générées"); invalidate(); qc.invalidateQueries({ queryKey: ["admin-stats"] }); }
  };

  const countBy = (s: string) => all.filter((r) => (s === "relance" ? due(r) : r.status === s)).length;

  if (isLoading) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Demandes</h1>
          <p className="text-sm text-muted-foreground">Devis et messages reçus par le site — suivi commercial.</p>
        </div>
        <div className="flex gap-2">
          {IS_DEMO && (
            <button onClick={seedDemo} className="inline-flex items-center gap-2 rounded-sm border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary">
              <Sparkles className="h-3.5 w-3.5" /> Données fictives (démo)
            </button>
          )}
          <button onClick={() => exportRequestsCsv(filtered)} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50">
            <Download className="h-4 w-4" /> Exporter ({filtered.length})
          </button>
        </div>
      </div>

      {/* filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-sm border border-border">
          {(["tous", "devis", "contact"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)} className={`px-3 py-1.5 text-xs font-semibold ${type === t ? "bg-accent text-accent-foreground" : "bg-card hover:bg-muted"}`}>
              {t === "tous" ? "Tous" : t === "devis" ? "Devis" : "Contact"}
            </button>
          ))}
        </div>
        <button onClick={() => setStatus("tous")} className={`rounded-full border px-3 py-1 text-xs ${status === "tous" ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}>Tous statuts ({all.length})</button>
        {STATUSES.map((s) => (
          <button key={s.value} onClick={() => setStatus(s.value)} className={`rounded-full border px-3 py-1 text-xs ${status === s.value ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}>
            {s.label} ({countBy(s.value)})
          </button>
        ))}
        <button onClick={() => setStatus("relance")} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${status === "relance" ? "border-foreground bg-foreground text-background" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
          <CalendarClock className="h-3 w-3" /> À relancer ({countBy("relance")})
        </button>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, téléphone, ville, n°…" className="w-64 rounded-sm border border-border bg-card py-1.5 pl-8 pr-3 text-sm" />
        </div>
      </div>

      <div className={`grid gap-5 ${selected ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" : ""}`}>
        {/* liste */}
        <div className="overflow-hidden rounded-sm border border-border bg-card">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{all.length ? "Aucune demande ne correspond aux filtres." : "Aucune demande pour le moment."}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Client</th><th className="hidden px-3 py-2 md:table-cell">Demande</th><th className="px-3 py-2">Statut</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const st = statusInfo(r.status);
                  const items = requestItems(r);
                  return (
                    <tr key={r.id} onClick={() => navigate("requests", r.id)} className={`cursor-pointer border-b border-border last:border-0 hover:bg-secondary/40 ${r.id === selectedId ? "bg-accent/5" : ""}`}>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top text-xs text-muted-foreground">
                        {formatDate(r.created_at, false)}
                        {due(r) && <CalendarClock className="ml-1 inline h-3.5 w-3.5 text-amber-600" aria-label="À relancer" />}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <p className={`text-foreground ${r.is_read ? "font-medium" : "font-bold"}`}>{r.full_name}</p>
                        <p className="text-xs text-muted-foreground">{[r.city, r.company].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td className="hidden px-3 py-2.5 align-top md:table-cell">
                        <p className="text-xs font-semibold">{r.request_type === "devis" ? (r.quote_number || "Devis") : "Contact"}</p>
                        <p className="max-w-[260px] truncate text-xs text-muted-foreground">
                          {items.length ? items.map((i) => `${i.name} ×${i.quantity}`).join(", ") : r.message}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 align-top"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.className}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* fiche */}
        {selected && (
          <RequestDetail
            key={selected.id}
            r={selected}
            onClose={() => navigate("requests")}
            onSave={(patch) => update.mutateAsync({ id: selected.id, patch }).then(() => toast.success("Suivi enregistré"))}
            onDelete={() => { if (confirm("Supprimer cette demande du site ? Elle restera dans le Google Sheet.")) remove.mutate(selected.id); }}
            onPdf={() => downloadRequestPdf(selected, {
              phone: company?.phone_1, email: company?.email_1,
              address: [company?.address_line_1, company?.address_line_2].filter(Boolean).join(", "), website: "impulsefitness.ma",
            }, logo).catch(() => toast.error("Génération du PDF impossible"))}
          />
        )}
      </div>
    </div>
  );
};

const RequestDetail = ({ r, onClose, onSave, onDelete, onPdf }: {
  r: ContactRequest;
  onClose: () => void;
  onSave: (patch: Partial<ContactRequest>) => Promise<unknown>;
  onDelete: () => void;
  onPdf: () => void;
}) => {
  const [status, setStatus] = useState(r.status);
  const [notes, setNotes] = useState(r.notes || "");
  const [followUp, setFollowUp] = useState(r.follow_up_date || "");
  const [amount, setAmount] = useState(r.amount == null ? "" : String(r.amount));
  const dirty = status !== r.status || notes !== (r.notes || "") || followUp !== (r.follow_up_date || "") || amount !== (r.amount == null ? "" : String(r.amount));
  const items = requestItems(r);
  const email = realEmail(r.email);
  const phoneDigits = (r.phone || "").replace(/[^\d+]/g, "");
  const waNumber = phoneDigits.startsWith("0") ? "212" + phoneDigits.slice(1) : phoneDigits.replace(/^\+/, "");

  const save = () => onSave({
    status,
    notes,
    follow_up_date: followUp || null,
    amount: amount.trim() === "" ? null : Number(amount.replace(",", ".")),
  });

  return (
    <div className="self-start rounded-sm border border-border bg-card xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{r.request_type === "devis" ? `Devis ${r.quote_number || ""}` : "Demande de contact"}</p>
          <h2 className="mt-1 text-lg font-bold text-foreground">{r.full_name}</h2>
          <p className="text-xs text-muted-foreground">Reçue le {formatDate(r.created_at)}</p>
        </div>
        <button onClick={onClose} className="rounded-sm p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Fermer"><X className="h-4 w-4" /></button>
      </div>

      <div className="space-y-5 p-5">
        {/* contacter */}
        <div className="flex flex-wrap gap-2">
          {r.phone && <a href={`tel:${phoneDigits}`} className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"><Phone className="h-3.5 w-3.5" /> {r.phone}</a>}
          {r.phone && <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>}
          {email && <a href={`mailto:${email}?subject=${encodeURIComponent(`Votre demande ${r.quote_number || ""} — Impulse Fitness Maroc`)}`} className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"><Mail className="h-3.5 w-3.5" /> {email}</a>}
          <button onClick={onPdf} className="inline-flex items-center gap-1.5 rounded-sm bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90"><FileDown className="h-3.5 w-3.5" /> PDF</button>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><dt className="text-[11px] uppercase text-muted-foreground">Entreprise</dt><dd>{r.company || "—"}</dd></div>
          <div><dt className="text-[11px] uppercase text-muted-foreground">Ville</dt><dd>{r.city || "—"}</dd></div>
          <div><dt className="text-[11px] uppercase text-muted-foreground">Usage</dt><dd>{r.usage_type === "professionnel" ? "Professionnel" : r.usage_type === "residentiel" ? "Résidentiel" : "—"}</dd></div>
          <div><dt className="text-[11px] uppercase text-muted-foreground">Provenance</dt><dd className="break-words">{sourceLabel(r)}</dd></div>
        </dl>

        {items.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] uppercase text-muted-foreground">Équipements ({items.reduce((s, i) => s + Number(i.quantity || 0), 0)})</p>
            <ul className="divide-y divide-border rounded-sm border border-border">
              {items.map((i, idx) => (
                <li key={idx} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <a href={`/produit/${i.id}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline">{i.name}</a>
                  <span className="whitespace-nowrap font-semibold">× {i.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.message && (
          <div>
            <p className="mb-1.5 text-[11px] uppercase text-muted-foreground">Message</p>
            <p className="whitespace-pre-line rounded-sm bg-secondary/50 p-3 text-sm">{r.message}</p>
          </div>
        )}

        {/* suivi */}
        <div className="space-y-3 rounded-sm border border-border bg-secondary/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-foreground">Suivi commercial</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button key={s.value} onClick={() => setStatus(s.value)} className={`rounded-full px-3 py-1 text-xs font-semibold ring-2 ${status === s.value ? `${s.className} ring-foreground/60` : "bg-card text-muted-foreground ring-transparent hover:bg-secondary"}`}>{s.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">Date de relance
              <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="mt-1 w-full rounded-sm border border-border bg-card px-2 py-1.5 text-sm text-foreground" />
            </label>
            <label className="text-xs text-muted-foreground">Montant du devis (MAD)
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="ex. 85000" className="mt-1 w-full rounded-sm border border-border bg-card px-2 py-1.5 text-sm text-foreground" />
            </label>
          </div>
          <label className="block text-xs text-muted-foreground">Notes internes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Appel du 02/10 : souhaite une visite du showroom…" className="mt-1 w-full rounded-sm border border-border bg-card px-2 py-1.5 text-sm text-foreground" />
          </label>
          <div className="flex items-center justify-between">
            <button onClick={onDelete} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
            <button onClick={save} disabled={!dirty} className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-40">
              <Save className="h-4 w-4" /> Enregistrer{dirty ? "*" : ""}
            </button>
          </div>
          {r.amount != null && r.status === "gagne" && <p className="text-xs text-green-700">Affaire gagnée : {formatAmount(r.amount)}</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminRequests;
