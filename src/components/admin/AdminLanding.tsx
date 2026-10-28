import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlarmClock, ArrowRight, ExternalLink, Link2, Megaphone, MessageCircle, Phone, ShoppingCart, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  requestItems, statusInfo, isLandingRequest, landingKind, landingKindInfo, landingValue, landingInterest, itemPrice,
  isLate, ageLabel, LANDING_KINDS, type ContactRequest,
} from "@/lib/requests";
import { useAnalyticsReport, fillDays, pct, fmt, sourceName } from "@/lib/stats";
import { formatMad } from "@/components/landing/contact";
import AdminRequests from "@/components/admin/AdminRequests";
import { UtmBuilder } from "@/components/admin/AdminStats";
import type { AdminNavigate } from "@/pages/Admin";

/**
 * Admin → Landing page : tout ce qui vient de la landing page des campagnes (/lp/musculation),
 * séparé du site. Vue d'ensemble (chiffres, demandes à traiter, parcours, machines, campagnes)
 * et liste complète des demandes avec la fiche de suivi.
 */

const LANDING_URL = "https://impulsemorocco.com/lp/musculation";
/** mise en ligne de la landing page « Offre de lancement » */
const LAUNCH = new Date("2026-10-22T00:00:00");
const daysSinceLaunch = () => Math.max(1, Math.ceil((Date.now() - LAUNCH.getTime()) / 86400000));

const C = { visits: "#2a78d6", requests: "#e30613", grid: "#e1e0d9", axis: "#898781" };

const Tile = ({ label, value, hint, tone }: { label: string; value: string; hint?: React.ReactNode; tone?: "alert" }) => (
  <div className={`rounded-sm border bg-card p-4 ${tone === "alert" ? "border-red-300 bg-red-50/60" : "border-border"}`}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "alert" ? "text-red-700" : "text-foreground"}`}>{value}</p>
    {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const Panel = ({ title, subtitle, action, children, className = "" }: { title: React.ReactNode; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={`rounded-sm border border-border bg-card p-5 ${className}`}>
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const waLink = (r: ContactRequest) => {
  const digits = (r.phone || "").replace(/[^\d+]/g, "");
  const n = digits.startsWith("0") ? "212" + digits.slice(1) : digits.replace(/^\+/, "");
  const first = r.full_name.trim().split(/\s+/)[0];
  const text = `Bonjour ${first}, ici Impulse Fitness Maroc. Nous revenons vers vous suite à votre demande${r.quote_number ? ` ${r.quote_number}` : ""} sur notre offre de lancement.`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
};

const AdminLanding = ({ param, navigate }: { param: string | null; navigate: AdminNavigate }) => {
  const PERIODS = [
    { days: 1, label: "Aujourd'hui" },
    { days: 7, label: "7 jours" },
    { days: 30, label: "30 jours" },
    { days: daysSinceLaunch(), label: "Depuis le lancement" },
  ];
  const [days, setDays] = useState(PERIODS[3].days);
  const [showUtm, setShowUtm] = useState(false);

  const { data: requests } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ContactRequest[];
    },
  });
  const { data: report } = useAnalyticsReport(days, "landing");
  // conservation des statistiques (6 mois) : le ménage se fait à l'ouverture de l'écran
  useEffect(() => { void supabase.rpc("purge_analytics_events"); }, []);

  const lp = useMemo(() => (requests || []).filter(isLandingRequest), [requests]);
  const since = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() - (days - 1) * 86400000; }, [days]);
  const inPeriod = useMemo(() => lp.filter((r) => new Date(r.created_at).getTime() >= since), [lp, since]);

  const orders = inPeriod.filter((r) => landingKind(r) === "commande");
  const orderValue = orders.reduce((s, r) => s + landingValue(r), 0);
  const machines = orders.reduce((s, r) => s + requestItems(r).reduce((n, i) => n + Number(i.quantity || 0), 0), 0);
  const fresh = lp.filter((r) => r.status === "nouveau").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const late = fresh.filter(isLate);
  const won = inPeriod.filter((r) => r.status === "gagne");
  const wonAmount = won.reduce((s, r) => s + Number(r.amount || 0), 0);
  const sessions = report?.totals.sessions ?? 0;
  const mobile = report?.devices.find((d) => d.device === "mobile")?.sessions ?? 0;

  // visites (statistiques) + demandes (base) par jour
  const daily = useMemo(() => {
    const visits = report ? fillDays(report.daily, days) : [];
    const perDay = new Map<string, number>();
    inPeriod.forEach((r) => perDay.set(localDay(r.created_at), (perDay.get(localDay(r.created_at)) || 0) + 1));
    return visits.map((d) => ({ day: d.day, visites: d.sessions, demandes: perDay.get(d.day) || 0 }));
  }, [report, days, inPeriod]);

  // machines : vues et ajouts (statistiques) + quantités commandées et valeur (demandes)
  const topMachines = useMemo(() => {
    const m = new Map<string, { name: string; views: number; adds: number; qty: number; orders: number; value: number }>();
    const get = (id: string, name: string) => {
      if (!m.has(id)) m.set(id, { name, views: 0, adds: 0, qty: 0, orders: 0, value: 0 });
      return m.get(id)!;
    };
    report?.products.forEach((p) => { const x = get(p.product_id, p.name || "Produit"); x.views += p.views; x.adds += p.adds; });
    orders.forEach((r) => requestItems(r).forEach((i) => {
      // « Chest Press IFP1201 (IFP1201) » → « Chest Press IFP1201 »
      const ref = /\(([A-Z0-9]+)\)$/.exec(i.name)?.[1];
      const clean = ref && i.name.slice(0, -ref.length - 2).includes(ref) ? i.name.slice(0, -ref.length - 2).trim() : i.name;
      const x = get(String(i.id), clean);
      x.qty += Number(i.quantity || 0); x.orders += 1; x.value += itemPrice(i) * Number(i.quantity || 0);
    }));
    return [...m.values()].sort((a, b) => b.qty - a.qty || b.adds - a.adds || b.views - a.views).slice(0, 12);
  }, [report, orders]);

  // campagnes : visites (statistiques) + demandes, commandes et valeur (demandes)
  const campaigns = useMemo(() => {
    const m = new Map<string, { source: string; campaign: string; visits: number; requests: number; orders: number; value: number }>();
    const get = (source: string, campaign: string) => {
      const k = `${source}|${campaign}`;
      if (!m.has(k)) m.set(k, { source, campaign, visits: 0, requests: 0, orders: 0, value: 0 });
      return m.get(k)!;
    };
    report?.sources.forEach((s) => { get(s.source || "direct", s.campaign || "").visits += s.sessions; });
    inPeriod.forEach((r) => {
      const x = get(r.utm_source || r.referrer || "direct", r.utm_campaign || "");
      x.requests += 1;
      if (landingKind(r) === "commande") { x.orders += 1; x.value += landingValue(r); }
    });
    return [...m.values()].sort((a, b) => b.requests - a.requests || b.visits - a.visits);
  }, [report, inPeriod]);

  const kinds = LANDING_KINDS.map((k) => ({ ...k, count: inPeriod.filter((r) => landingKind(r) === k.value).length }));
  const maxKind = Math.max(1, ...kinds.map((k) => k.count));

  const listView = !!param;
  const listStatus = param === "nouveau" ? "nouveau" : param === "retard" ? "retard" : "tous";
  const selectedId = param && !["demandes", "nouveau", "retard"].includes(param) ? param : null;

  return (
    <div className="space-y-5">
      {/* en-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"><Megaphone className="h-3 w-3" /> Campagne en cours</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-foreground">Landing page — Offre de lancement</h1>
          <p className="text-sm text-muted-foreground">Visites et demandes de la landing page uniquement. Le site a ses propres écrans (menu « Site web »).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/lp/musculation" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary"><ExternalLink className="h-4 w-4" /> Ouvrir la landing</a>
          <button onClick={() => setShowUtm((v) => !v)} className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary"><Link2 className="h-4 w-4" /> Lien de campagne</button>
        </div>
      </div>

      {showUtm && (
        <Panel title="Lien de campagne pour la landing page" subtitle="À mettre dans chaque publicité : les visites, demandes et commandes de la campagne apparaissent ci-dessous dans « Campagnes ».">
          <UtmBuilder defaultPage={LANDING_URL} defaultCampaign="offre-lancement-musculation" />
        </Panel>
      )}

      {/* onglets */}
      <div className="flex items-center gap-1 border-b border-border">
        <button onClick={() => navigate("landing")} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${!listView ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Vue d'ensemble</button>
        <button onClick={() => navigate("landing", "demandes")} className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold ${listView ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Demandes ({lp.length})
          {fresh.length > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{fresh.length} nouv.</span>}
        </button>
      </div>

      {late.length > 0 && (
        <button onClick={() => navigate("landing", "retard")} className="flex w-full items-center gap-3 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-left text-sm text-red-800 hover:bg-red-100">
          <AlarmClock className="h-5 w-5 flex-none" />
          <span className="flex-1"><strong>{late.length} demande{late.length > 1 ? "s" : ""} sans réponse depuis plus de 24 h.</strong> La landing promet un rappel sous 24 h : à traiter en priorité.</span>
          <span className="inline-flex items-center gap-1 font-semibold">Voir <ArrowRight className="h-4 w-4" /></span>
        </button>
      )}

      {listView ? (
        <AdminRequests key={listStatus} scope="landing" selectedId={selectedId} navigate={navigate} initialStatus={listStatus} />
      ) : (
        <>
          {/* période */}
          <div className="flex flex-wrap items-center gap-2">
            {PERIODS.map((p) => (
              <button key={p.label} onClick={() => setDays(p.days)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${days === p.days ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-secondary"}`}>{p.label}</button>
            ))}
            <span className="text-xs text-muted-foreground">Depuis le {new Date(since).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span>
          </div>

          {report?.unscoped && (
            <p className="flex items-start gap-2 rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <span>Les visites affichées sont encore celles de <strong>tout le site</strong> : exécutez la mise à jour <code>supabase/mises-a-jour/2026-10-27-stats-landing.sql</code> dans Supabase (SQL Editor) pour ne compter que la landing page. Les demandes, elles, sont déjà séparées.</span>
            </p>
          )}

          {/* chiffres clés */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Tile label="Visites" value={report ? fmt(sessions) : "…"} hint={report ? `${pct(mobile, sessions)} sur téléphone` : ""} />
            <Tile label="Demandes reçues" value={fmt(inPeriod.length)} hint={<>conversion <strong>{pct(inPeriod.length, sessions)}</strong> des visites</>} />
            <Tile label="Commandes (devis)" value={fmt(orders.length)} hint={`${fmt(machines)} machine${machines > 1 ? "s" : ""} demandée${machines > 1 ? "s" : ""}`} />
            <Tile label="Valeur des commandes" value={orderValue ? formatMad(orderValue) : "—"} hint={orders.length ? `HT · panier moyen ${formatMad(orderValue / orders.length)}` : "HT, prix affichés"} />
            <Tile label="À traiter" value={fmt(fresh.length)} tone={late.length ? "alert" : undefined} hint={late.length ? <span className="font-semibold text-red-700">{late.length} depuis plus de 24 h</span> : "statut « Nouveau », toutes dates"} />
            <Tile label="Ventes gagnées" value={fmt(won.length)} hint={wonAmount ? formatMad(wonAmount) : "statut « Gagné »"} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            {/* à traiter */}
            <Panel title={<><AlarmClock className="h-4 w-4 text-accent" /> À traiter maintenant</>} subtitle="Demandes « Nouveau », la plus ancienne en premier."
              action={fresh.length > 0 && <button onClick={() => navigate("landing", "nouveau")} className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-accent hover:underline">Toutes ({fresh.length}) <ArrowRight className="h-3 w-3" /></button>}>
              {fresh.length ? (
                <ul className="divide-y divide-border">
                  {fresh.slice(0, 8).map((r) => {
                    const k = landingKindInfo(landingKind(r));
                    const v = landingValue(r);
                    return (
                      <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                        <button onClick={() => navigate("landing", r.id)} className="min-w-0 flex-1 text-left">
                          <span className="flex items-center gap-2">
                            <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${k.className}`}>{k.label}</span>
                            <span className="truncate text-sm font-semibold text-foreground hover:text-accent">{r.full_name}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {r.quote_number ? `${r.quote_number} · ` : ""}{v ? `${formatMad(v)} HT · ` : ""}{landingInterest(r) && !v ? `${landingInterest(r)} · ` : ""}
                            <span className={isLate(r) ? "font-semibold text-red-600" : ""}>{ageLabel(r)}</span>
                          </span>
                        </button>
                        <span className="flex gap-1.5">
                          {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 rounded-sm border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary" title={r.phone}><Phone className="h-3.5 w-3.5" /> Appeler</a>}
                          {r.phone && <a href={waLink(r)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-sm border border-green-300 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Tout est traité. Les nouvelles demandes de la landing page apparaîtront ici.</p>}
            </Panel>

            {/* types de demandes */}
            <Panel title="Ce que demandent les visiteurs" subtitle="Demandes reçues sur la période, par bouton utilisé.">
              <div className="space-y-2.5">
                {kinds.map((k) => (
                  <div key={k.value} className="grid grid-cols-[130px_1fr_40px] items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{k.label}</span>
                    <div className="h-5 rounded-r-[4px] bg-secondary/60"><div className="h-5 rounded-r-[4px]" style={{ width: `${(k.count / maxKind) * 100}%`, background: k.value === "commande" ? C.requests : C.visits }} /></div>
                    <span className="text-right font-semibold tabular-nums">{k.count}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Commande = devis composé sur la landing (panier). RDV showroom = bouton « Prendre rendez-vous ». Projet sur mesure = bandeau « Demander un devis personnalisé ». Question machine = « Nous contacter » depuis une fiche. Contact = pop-up ou barre du bas.</p>
            </Panel>
          </div>

          {/* par jour */}
          {days > 1 && (
            <Panel title="Visites et demandes par jour" subtitle="Barres rouges : demandes reçues · ligne bleue : visites de la landing page.">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="day" tickFormatter={dayLabel} tick={{ fontSize: 11, fill: C.axis }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis yAxisId="v" tick={{ fontSize: 11, fill: C.axis }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis yAxisId="d" orientation="right" tick={{ fontSize: 11, fill: C.axis }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip labelFormatter={(l) => dayLabel(String(l))} formatter={(v: number, n: string) => [fmt(v), n === "visites" ? "Visites" : "Demandes"]} />
                    <Bar yAxisId="d" dataKey="demandes" fill={C.requests} radius={[3, 3, 0, 0]} maxBarSize={22} />
                    <Line yAxisId="v" dataKey="visites" stroke={C.visits} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            {/* parcours */}
            <Panel title="Parcours des visiteurs" subtitle="Combien de visiteurs passent chaque étape (sessions de la landing page).">
              {report ? (() => {
                const f = report.funnel;
                const steps = [
                  { label: "Visites", value: f.sessions },
                  { label: "Ont ouvert une fiche machine", value: f.product },
                  { label: "Ont ajouté au devis", value: f.add },
                  { label: "Ont commencé un formulaire", value: f.form },
                  { label: "Ont envoyé une commande", value: f.quote },
                ];
                const max = Math.max(f.sessions, 1);
                return (
                  <div className="space-y-2.5">
                    {steps.map((st, i) => (
                      <div key={st.label} className="grid grid-cols-[190px_1fr_110px] items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{st.label}</span>
                        <div className="h-6 rounded-r-[4px] bg-secondary/60"><div className="h-6 rounded-r-[4px]" style={{ width: `${Math.max((st.value / max) * 100, st.value ? 1 : 0)}%`, background: i === steps.length - 1 ? C.requests : C.visits }} /></div>
                        <span className="tabular-nums"><strong>{fmt(st.value)}</strong>{i > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{pct(st.value, steps[i - 1].value)}</span>}</span>
                      </div>
                    ))}
                    <p className="pt-1 text-xs text-muted-foreground">
                      + <strong className="text-foreground">{fmt(report.totals.contact_submits)}</strong> demandes de contact / rendez-vous envoyées ·{" "}
                      <strong className="text-foreground">{fmt(Math.max(f.form - f.quote - report.totals.contact_submits, 0))}</strong> formulaires commencés jamais envoyés
                    </p>
                  </div>
                );
              })() : <p className="text-sm text-muted-foreground">Chargement…</p>}
            </Panel>

            {/* campagnes */}
            <Panel title="Campagnes" subtitle="D'où viennent les visiteurs et les demandes (lien de campagne, Facebook, Instagram…).">
              {campaigns.length ? (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-1.5 font-medium">Source · campagne</th><th className="py-1.5 text-right font-medium">Visites</th><th className="py-1.5 text-right font-medium">Demandes</th><th className="py-1.5 text-right font-medium">Commandes</th><th className="py-1.5 text-right font-medium">Valeur HT</th>
                  </tr></thead>
                  <tbody>
                    {campaigns.slice(0, 10).map((c) => (
                      <tr key={`${c.source}|${c.campaign}`} className="border-b border-border/60 last:border-0">
                        <td className="max-w-[220px] truncate py-1.5 pr-3">{sourceName(c.source)}{c.campaign && <span className="text-muted-foreground"> · {c.campaign}</span>}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmt(c.visits)}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmt(c.requests)}{c.visits > 0 && <span className="ml-1 text-[11px] text-muted-foreground">{pct(c.requests, c.visits)}</span>}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmt(c.orders)}</td>
                        <td className="py-1.5 text-right tabular-nums">{c.value ? formatMad(c.value) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-muted-foreground">Pas encore de visites. Utilisez « Lien de campagne » pour créer les liens des publicités.</p>}
            </Panel>
          </div>

          {/* machines */}
          <Panel title={<><ShoppingCart className="h-4 w-4 text-accent" /> Machines les plus demandées</>} subtitle="Fiches vues et ajouts au devis (visiteurs), quantités et valeur des commandes envoyées.">
            {topMachines.length ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 font-medium">Machine</th><th className="py-1.5 text-right font-medium">Fiches vues</th><th className="py-1.5 text-right font-medium">Ajouts au devis</th><th className="py-1.5 text-right font-medium">Qté commandée</th><th className="py-1.5 text-right font-medium">Valeur HT</th>
                </tr></thead>
                <tbody>
                  {topMachines.map((m, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-0">
                      <td className="max-w-[360px] truncate py-1.5 pr-3"><span className="mr-2 text-muted-foreground">{i + 1}.</span>{m.name}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(m.views)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(m.adds)}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">{fmt(m.qty)}</td>
                      <td className="py-1.5 text-right tabular-nums">{m.value ? formatMad(m.value) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground">Pas encore de données sur la période.</p>}
          </Panel>

          {/* dernières demandes */}
          <Panel title="Dernières demandes" action={<button onClick={() => navigate("landing", "demandes")} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">Toutes les demandes <ArrowRight className="h-3 w-3" /></button>}>
            {lp.length ? (
              <ul className="divide-y divide-border">
                {lp.slice(0, 6).map((r) => {
                  const k = landingKindInfo(landingKind(r));
                  const st = statusInfo(r.status);
                  const v = landingValue(r);
                  return (
                    <li key={r.id}>
                      <button onClick={() => navigate("landing", r.id)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-secondary/40">
                        <span className={`w-28 flex-none rounded-sm px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide ${k.className}`}>{k.label}</span>
                        <span className="min-w-0 flex-1 truncate text-sm"><strong className="font-semibold">{r.full_name}</strong> <span className="text-muted-foreground">· {ageLabel(r)}{r.quote_number ? ` · ${r.quote_number}` : ""}</span></span>
                        {v > 0 && <span className="whitespace-nowrap text-sm tabular-nums">{formatMad(v)}</span>}
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.className}`}>{st.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Aucune demande pour le moment.</p>}
          </Panel>
        </>
      )}
    </div>
  );
};

export default AdminLanding;
