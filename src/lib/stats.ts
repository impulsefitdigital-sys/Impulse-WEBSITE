import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsReport {
  totals: {
    sessions: number; visitors: number; page_views: number; product_views: number; searches: number;
    quote_adds: number; quote_opens: number; form_starts: number; quote_submits: number; contact_submits: number;
    whatsapp_clicks: number; phone_clicks: number; email_clicks: number;
  };
  funnel: { sessions: number; product: number; add: number; form: number; quote: number };
  daily: { day: string; sessions: number; page_views: number; quotes: number; contacts: number }[];
  pages: { path: string; views: number }[];
  products: { product_id: string; name: string | null; views: number; adds: number }[];
  searches: { term: string; count: number; no_result: number }[];
  sources: { source: string; medium: string; campaign: string; sessions: number; quotes: number; contacts: number }[];
  devices: { device: string; sessions: number }[];
  /** la base n'a pas encore la mise à jour « p_scope » : chiffres de tout le site */
  unscoped?: boolean;
}

export const PERIODS = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
  { days: 365, label: "12 mois" },
] as const;

export const periodRange = (days: number) => {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to.getTime() - days * 86400000 + 1);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: new Date(to.getTime() + 1).toISOString() };
};

/**
 * Périmètre des statistiques : « site » (tout sauf la landing page), « landing » (pages /lp/…) ou « all ».
 * Nécessite la mise à jour SQL du 27/10/2026 (paramètre p_scope). Sans elle, on retombe sur les chiffres
 * de tout le site et le rapport porte « unscoped: true » (l'écran affiche alors un avertissement).
 */
export type StatsScope = "site" | "landing" | "all";

export const useAnalyticsReport = (days: number, scope: StatsScope = "all") =>
  useQuery({
    queryKey: ["admin-stats", days, scope],
    queryFn: async () => {
      const { from, to } = periodRange(days);
      const args = scope === "all" ? { p_from: from, p_to: to } : { p_from: from, p_to: to, p_scope: scope };
      // .bind : sans lui, supabase.rpc perd son « this » (erreur « reading 'rest' »)
      const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, a: Record<string, string>) => Promise<{ data: unknown; error: { message: string } | null }>;
      const res = await rpc("analytics_report", args);
      if (res.error && scope !== "all") {
        const old = await rpc("analytics_report", { p_from: from, p_to: to });
        if (old.error) throw old.error;
        return { ...(old.data as AnalyticsReport), unscoped: true };
      }
      if (res.error) throw res.error;
      return res.data as AnalyticsReport;
    },
  });

/** Jours sans activité ajoutés à zéro : une courbe continue, sans trou trompeur. */
export const fillDays = (daily: AnalyticsReport["daily"], days: number) => {
  const map = new Map(daily.map((d) => [d.day, d]));
  const out: AnalyticsReport["daily"] = [];
  const start = new Date(periodRange(days).from);
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000 + 12 * 3600000); // midi : pas de décalage de fuseau
    const key = d.toISOString().slice(0, 10);
    out.push(map.get(key) ?? { day: key, sessions: 0, page_views: 0, quotes: 0, contacts: 0 });
  }
  return out;
};

export const pct = (part: number, total: number) => (total ? `${((part / total) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` : "—");

export const fmt = (n: number) => n.toLocaleString("fr-FR");

export const SOURCE_LABELS: Record<string, string> = {
  direct: "Accès direct",
  facebook: "Facebook", "m.facebook.com": "Facebook", "l.facebook.com": "Facebook", "lm.facebook.com": "Facebook",
  instagram: "Instagram", "l.instagram.com": "Instagram",
  google: "Google", "google.com": "Google (naturel)", "google.co.ma": "Google (naturel)",
  "bing.com": "Bing", whatsapp: "WhatsApp", tiktok: "TikTok",
};
export const sourceName = (s: string) => SOURCE_LABELS[s] ?? s;
