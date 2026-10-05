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

export const useAnalyticsReport = (days: number) =>
  useQuery({
    queryKey: ["admin-stats", days],
    queryFn: async () => {
      const { from, to } = periodRange(days);
      const { data, error } = await supabase.rpc("analytics_report", { p_from: from, p_to: to });
      if (error) throw error;
      return data as unknown as AnalyticsReport;
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
