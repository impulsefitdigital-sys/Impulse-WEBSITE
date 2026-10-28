import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CalendarClock, Inbox, Megaphone, TrendingUp } from "lucide-react";
import { statusInfo, isOpenStatus, formatDate, formatAmount, requestItems, isLandingRequest, isLate, landingKind, type ContactRequest } from "@/lib/requests";
import { useAnalyticsReport, pct, fmt, sourceName } from "@/lib/stats";
import type { AdminNavigate } from "@/pages/Admin";

const today = () => new Date().toISOString().slice(0, 10);

const Card = ({ title, action, children }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) => (
  <section className="rounded-sm border border-border bg-card p-5">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const AdminDashboard = ({ navigate }: { navigate: AdminNavigate }) => {
  const { data: requests } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ContactRequest[];
    },
  });
  const { data: week } = useAnalyticsReport(7, "site");

  // tableau de bord du SITE : la landing page a son propre écran (bandeau ci-dessous)
  const lp = (requests || []).filter(isLandingRequest);
  const lpNew = lp.filter((r) => r.status === "nouveau");
  const weekAgo = Date.now() - 7 * 86400000;
  const lpWeekOrders = lp.filter((r) => landingKind(r) === "commande" && new Date(r.created_at).getTime() >= weekAgo).length;
  const all = (requests || []).filter((r) => !isLandingRequest(r));
  const fresh = all.filter((r) => r.status === "nouveau");
  const toFollow = all.filter((r) => r.follow_up_date && r.follow_up_date <= today() && isOpenStatus(r.status))
    .sort((a, b) => String(a.follow_up_date).localeCompare(String(b.follow_up_date)));
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthQuotes = all.filter((r) => r.request_type === "devis" && new Date(r.created_at) >= monthStart);
  const won = all.filter((r) => r.status === "gagne" && new Date(r.updated_at) >= monthStart);
  const pipeline = all.filter((r) => r.status === "devis_envoye").reduce((s, r) => s + Number(r.amount || 0), 0);

  const Row = ({ r }: { r: ContactRequest }) => {
    const st = statusInfo(r.status);
    const items = requestItems(r);
    return (
      <button onClick={() => navigate("requests", r.id)} className="flex w-full items-center justify-between gap-3 border-b border-border py-2.5 text-left last:border-0 hover:bg-secondary/40">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{r.full_name}{r.city && <span className="font-normal text-muted-foreground"> · {r.city}</span>}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {r.request_type === "devis" ? `${r.quote_number ?? "Devis"} — ${items.length} équipement(s)` : "Message de contact"} · {formatDate(r.created_at)}
          </span>
        </span>
        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.className}`}>{st.label}</span>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Tableau de bord du site</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · hors landing page</p>
      </div>

      <button onClick={() => navigate("landing")} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-sm border border-red-200 bg-red-50/60 px-4 py-3 text-left text-sm hover:bg-red-50">
        <Megaphone className="h-5 w-5 text-red-600" />
        <span className="font-semibold text-foreground">Landing page (campagne en cours)</span>
        <span className="text-muted-foreground">{lpNew.length} demande{lpNew.length > 1 ? "s" : ""} à traiter{lpNew.some(isLate) ? ` dont ${lpNew.filter(isLate).length} depuis +24 h` : ""} · {lpWeekOrders} commande{lpWeekOrders > 1 ? "s" : ""} cette semaine</span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-red-700">Ouvrir <ArrowRight className="h-3 w-3" /></span>
      </button>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button onClick={() => navigate("requests")} className="rounded-sm border border-border bg-card p-4 text-left hover:border-accent/50">
          <p className="text-xs text-muted-foreground">Demandes à traiter</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{fresh.length}</p>
          <p className="text-[11px] text-muted-foreground">statut « Nouveau »</p>
        </button>
        <div className="rounded-sm border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Devis reçus ce mois-ci</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{monthQuotes.length}</p>
          <p className="text-[11px] text-muted-foreground">{won.length} gagné(s) ce mois-ci</p>
        </div>
        <div className="rounded-sm border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Visites (7 jours)</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{week ? fmt(week.totals.sessions) : "…"}</p>
          <p className="text-[11px] text-muted-foreground">{week ? `conversion en devis ${pct(week.funnel.quote, week.funnel.sessions)}` : ""}</p>
        </div>
        <div className="rounded-sm border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Devis envoyés en attente</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{pipeline ? formatAmount(pipeline) : "—"}</p>
          <p className="text-[11px] text-muted-foreground">montants saisis, statut « Devis envoyé »</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title={<><Inbox className="h-4 w-4 text-accent" /> Nouvelles demandes</>}
          action={<button onClick={() => navigate("requests")} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">Toutes <ArrowRight className="h-3 w-3" /></button>}>
          {fresh.length ? fresh.slice(0, 6).map((r) => <Row key={r.id} r={r} />) : <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>}
        </Card>
        <Card title={<><CalendarClock className="h-4 w-4 text-amber-600" /> À relancer aujourd'hui</>}>
          {toFollow.length ? toFollow.slice(0, 6).map((r) => <Row key={r.id} r={r} />) : <p className="text-sm text-muted-foreground">Aucune relance prévue. Ajoutez une date de relance dans la fiche d'une demande.</p>}
        </Card>
      </div>

      {week && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card title={<><TrendingUp className="h-4 w-4 text-accent" /> Produits les plus vus (7 jours)</>}
            action={<button onClick={() => navigate("stats")} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">Statistiques <ArrowRight className="h-3 w-3" /></button>}>
            {week.products.length ? (
              <ol className="space-y-1.5 text-sm">
                {week.products.slice(0, 5).map((p, i) => (
                  <li key={p.product_id} className="flex justify-between gap-3">
                    <span className="truncate"><span className="mr-2 text-muted-foreground">{i + 1}.</span>{p.name || "Produit supprimé"}</span>
                    <span className="whitespace-nowrap tabular-nums text-muted-foreground">{fmt(p.views)} vues · {fmt(p.adds)} au devis</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted-foreground">Pas encore de données.</p>}
          </Card>
          <Card title="D'où viennent les visiteurs (7 jours)">
            {week.sources.length ? (
              <ol className="space-y-1.5 text-sm">
                {week.sources.slice(0, 5).map((s, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="truncate">{sourceName(s.source)}{s.campaign && <span className="text-muted-foreground"> · {s.campaign}</span>}</span>
                    <span className="whitespace-nowrap tabular-nums text-muted-foreground">{fmt(s.sessions)} visites · {fmt(s.quotes)} devis</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted-foreground">Pas encore de données.</p>}
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
