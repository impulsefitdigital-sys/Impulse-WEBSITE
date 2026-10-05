import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase, IS_DEMO } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Copy, Link2, Sparkles } from "lucide-react";
import { PERIODS, useAnalyticsReport, fillDays, pct, fmt, sourceName, type AnalyticsReport } from "@/lib/stats";

// couleurs du graphique (palette validée : une seule série par graphique)
const C = { series: "#2a78d6", grid: "#e1e0d9", axis: "#898781", ink: "#0b0b0b", ink2: "#52514e" };

const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const Tile = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-sm border border-border bg-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const Panel = ({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) => (
  <section className={`rounded-sm border border-border bg-card p-5 ${className}`}>
    <h2 className="text-sm font-bold text-foreground">{title}</h2>
    {subtitle && <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>}
    <div className={subtitle ? "" : "mt-3"}>{children}</div>
  </section>
);

const ChartTooltip = ({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) =>
  active && payload?.length ? (
    <div className="rounded-sm border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{label && dayLabel(label)}</p>
      <p className="font-semibold text-foreground">{fmt(payload[0].value)} {unit}</p>
    </div>
  ) : null;

const Funnel = ({ f }: { f: AnalyticsReport["funnel"] }) => {
  const steps = [
    { label: "Visites", value: f.sessions },
    { label: "Ont vu un produit", value: f.product },
    { label: "Ont ajouté au devis", value: f.add },
    { label: "Ont commencé le formulaire", value: f.form },
    { label: "Ont envoyé le devis", value: f.quote },
  ];
  const max = Math.max(f.sessions, 1);
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => (
        <div key={s.label} className="grid grid-cols-[170px_1fr_120px] items-center gap-3 text-sm">
          <span className="text-muted-foreground">{s.label}</span>
          <div className="h-6 rounded-r-[4px] bg-secondary/60">
            <div className="h-6 rounded-r-[4px]" style={{ width: `${Math.max((s.value / max) * 100, s.value ? 1 : 0)}%`, background: C.series }} title={`${fmt(s.value)} visites`} />
          </div>
          <span className="tabular-nums text-foreground">
            <strong>{fmt(s.value)}</strong>
            {i > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{pct(s.value, steps[i - 1].value)}</span>}
          </span>
        </div>
      ))}
      <p className="pt-1 text-xs text-muted-foreground">
        <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-amber-600" />
        <strong className="text-foreground">{fmt(Math.max(f.form - f.quote, 0))} devis abandonnés</strong> — formulaire commencé mais jamais envoyé
        ({pct(Math.max(f.form - f.quote, 0), f.form)} des formulaires commencés).
      </p>
    </div>
  );
};

const Table = ({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) =>
  rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
        {head.map((h, i) => <th key={h} className={`py-1.5 font-medium ${i ? "text-right" : ""}`}>{h}</th>)}
      </tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={i} className="border-b border-border/60 last:border-0">
          {r.map((c, j) => <td key={j} className={`py-1.5 ${j ? "text-right tabular-nums" : "max-w-[260px] truncate pr-3"}`}>{c}</td>)}
        </tr>
      ))}</tbody>
    </table>
  );

/** Génère un lien de campagne avec paramètres UTM (à mettre dans les publicités). */
const UtmBuilder = () => {
  const [page, setPage] = useState("https://impulsefitness.ma/");
  const [source, setSource] = useState("facebook");
  const [medium, setMedium] = useState("paid_social");
  const [campaign, setCampaign] = useState("");
  const slug = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let url = "";
  try {
    const u = new URL(page);
    if (source) u.searchParams.set("utm_source", slug(source));
    if (medium) u.searchParams.set("utm_medium", slug(medium));
    if (campaign) u.searchParams.set("utm_campaign", slug(campaign));
    url = u.toString();
  } catch { url = ""; }
  const input = "mt-1 w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm";
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-xs text-muted-foreground md:col-span-4">Page de destination<input value={page} onChange={(e) => setPage(e.target.value)} className={input} /></label>
        <label className="text-xs text-muted-foreground">Source
          <select value={source} onChange={(e) => setSource(e.target.value)} className={input}>
            {["facebook", "instagram", "google", "tiktok", "whatsapp", "email", "sms"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Type
          <select value={medium} onChange={(e) => setMedium(e.target.value)} className={input}>
            <option value="paid_social">Publicité réseaux sociaux</option>
            <option value="social">Publication (non payée)</option>
            <option value="cpc">Publicité Google</option>
            <option value="email">Email</option>
            <option value="qr">QR code / print</option>
          </select>
        </label>
        <label className="text-xs text-muted-foreground md:col-span-2">Nom de la campagne<input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="ex. Promo tapis octobre" className={input} /></label>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-sm border border-border bg-secondary/50 px-3 py-2 text-xs">{url || "Adresse de page invalide"}</code>
        <button disabled={!url || !campaign} onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Lien copié"))} className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-40">
          <Copy className="h-3.5 w-3.5" /> Copier
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">Utilisez ce lien dans la publicité : les visites et les devis de la campagne apparaîtront dans « Provenance des visiteurs ».</p>
    </div>
  );
};

const AdminStats = () => {
  const [days, setDays] = useState(30);
  const qc = useQueryClient();
  const { data: r, isLoading, error } = useAnalyticsReport(days);
  const daily = useMemo(() => (r ? fillDays(r.daily, days) : []), [r, days]);
  useEffect(() => { void supabase.rpc("purge_analytics_events"); }, []); // garde 13 mois

  const seedDemo = async () => {
    const { error: e } = await (supabase.rpc as unknown as (fn: string) => Promise<{ error: { message: string } | null }>)("demo_seed");
    if (e) toast.error(e.message); else { toast.success("30 jours de visites fictives générés"); qc.invalidateQueries({ queryKey: ["admin-stats"] }); qc.invalidateQueries({ queryKey: ["admin-requests"] }); }
  };

  const t = r?.totals;
  const requestsDaily = daily.map((d) => ({ day: d.day, demandes: d.quotes + d.contacts }));
  const tick = days > 90 ? { interval: Math.floor(days / 6) } : days > 30 ? { interval: 13 } : days > 7 ? { interval: 4 } : { interval: 0 };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Statistiques</h1>
          <p className="text-sm text-muted-foreground">Visites, parcours jusqu'au devis et provenance des visiteurs.</p>
        </div>
        <div className="flex items-center gap-2">
          {IS_DEMO && (
            <button onClick={seedDemo} className="inline-flex items-center gap-2 rounded-sm border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary">
              <Sparkles className="h-3.5 w-3.5" /> Données fictives (démo)
            </button>
          )}
          <div className="inline-flex overflow-hidden rounded-sm border border-border" role="group" aria-label="Période">
            {PERIODS.map((p) => (
              <button key={p.days} onClick={() => setDays(p.days)} aria-pressed={days === p.days} className={`px-3 py-1.5 text-xs font-semibold ${days === p.days ? "bg-accent text-accent-foreground" : "bg-card hover:bg-muted"}`}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? <p className="text-muted-foreground">Chargement…</p> : error || !r || !t ? (
        <p className="text-sm text-destructive">Statistiques indisponibles : {(error as Error)?.message}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <Tile label="Visites" value={fmt(t.sessions)} hint={t.visitors ? `${fmt(t.visitors)} visiteurs identifiés*` : undefined} />
            <Tile label="Pages vues" value={fmt(t.page_views)} hint={t.sessions ? `${(t.page_views / t.sessions).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} par visite` : undefined} />
            <Tile label="Produits consultés" value={fmt(t.product_views)} />
            <Tile label="Devis envoyés" value={fmt(t.quote_submits)} hint={`Taux de conversion ${pct(r.funnel.quote, r.funnel.sessions)}`} />
            <Tile label="Messages de contact" value={fmt(t.contact_submits)} />
            <Tile label="Clics WhatsApp · tél. · email" value={`${fmt(t.whatsapp_clicks)} · ${fmt(t.phone_clicks)} · ${fmt(t.email_clicks)}`} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Visites par jour">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={C.grid} />
                    <XAxis dataKey="day" tickFormatter={dayLabel} {...tick} tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={{ stroke: "#c3c2b7" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip unit="visites" />} cursor={{ stroke: C.axis, strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="sessions" stroke={C.series} strokeWidth={2} fill={C.series} fillOpacity={0.1} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Demandes reçues par jour" subtitle="Devis + messages de contact">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={requestsDaily} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={C.grid} />
                    <XAxis dataKey="day" tickFormatter={dayLabel} {...tick} tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={{ stroke: "#c3c2b7" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip unit="demandes" />} cursor={{ fill: "rgba(11,11,11,.04)" }} />
                    <Bar dataKey="demandes" fill={C.series} maxBarSize={24} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel title="Du visiteur au devis" subtitle="Nombre de visites ayant atteint chaque étape (pourcentage : par rapport à l'étape précédente)">
            <Funnel f={r.funnel} />
          </Panel>

          <Panel title="Provenance des visiteurs" subtitle="Campagnes (liens UTM), réseaux sociaux, Google, accès direct">
            <Table
              head={["Source", "Campagne", "Visites", "Devis", "Contacts", "Conversion"]}
              empty="Aucune visite sur la période."
              rows={r.sources.map((s) => [
                <span key="s"><strong>{sourceName(s.source)}</strong>{s.medium && <span className="ml-1 text-xs text-muted-foreground">({s.medium})</span>}</span>,
                s.campaign || "—", fmt(s.sessions), fmt(s.quotes), fmt(s.contacts), pct(s.quotes + s.contacts, s.sessions),
              ])}
            />
          </Panel>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Produits les plus consultés">
              <Table head={["Produit", "Vues", "Ajouts au devis"]} empty="Aucun produit consulté."
                rows={r.products.map((p) => [
                  <a key="p" href={`/produit/${p.product_id}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline">{p.name || "Produit supprimé"}</a>,
                  fmt(p.views), fmt(p.adds),
                ])} />
            </Panel>
            <Panel title="Recherches des visiteurs" subtitle="Les recherches sans résultat montrent ce que les clients cherchent et ne trouvent pas">
              <Table head={["Recherche", "Fois", "Sans résultat"]} empty="Aucune recherche."
                rows={r.searches.map((s) => [
                  s.term, fmt(s.count),
                  s.no_result ? <span key="n" className="inline-flex items-center gap-1 font-semibold text-amber-800"><AlertTriangle className="h-3.5 w-3.5" /> {fmt(s.no_result)}</span> : "0",
                ])} />
            </Panel>
            <Panel title="Pages les plus vues">
              <Table head={["Page", "Vues"]} empty="Aucune page vue." rows={r.pages.map((p) => [p.path, fmt(p.views)])} />
            </Panel>
            <Panel title="Appareils">
              <Table head={["Appareil", "Visites", "Part"]} empty="—"
                rows={r.devices.map((d) => [
                  ({ mobile: "Téléphone", desktop: "Ordinateur", tablet: "Tablette" } as Record<string, string>)[d.device] ?? d.device,
                  fmt(d.sessions), pct(d.sessions, r.funnel.sessions),
                ])} />
            </Panel>
          </div>

          <Panel title="Créer un lien de campagne" subtitle="Pour savoir quelle publicité apporte des visites et des devis">
            <div className="flex items-start gap-2"><Link2 className="mt-1 h-4 w-4 flex-none text-muted-foreground" /><div className="flex-1"><UtmBuilder /></div></div>
          </Panel>

          <p className="text-[11px] text-muted-foreground">
            * Visiteurs identifiés : uniquement ceux qui ont accepté les cookies « Statistiques ». Les visites, pages et devis sont comptés pour tous, de façon anonyme.
            Les pages de l'administration ne sont pas comptées.
          </p>
        </>
      )}
    </div>
  );
};

export default AdminStats;
