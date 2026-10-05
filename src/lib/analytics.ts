/**
 * Mesure d'audience maison (table analytics_events) + relais vers Meta Pixel / GA4 si chargés.
 *
 * Données personnelles : aucune. Chaque onglet reçoit un identifiant de session aléatoire
 * (sessionStorage, 30 min d'inactivité). L'identifiant de visiteur (localStorage, pour compter
 * les visiteurs uniques et relier une campagne à un devis envoyé plus tard) n'existe que si le
 * visiteur a accepté les cookies « Statistiques ».
 */
import { supabase } from "@/integrations/supabase/client";
import { getConsent } from "@/lib/consent";

export type AnalyticsEvent =
  | "session_start" | "page_view" | "product_view" | "search" | "quote_add" | "quote_open"
  | "form_start" | "quote_submit" | "contact_submit" | "whatsapp_click" | "phone_click" | "email_click";

interface Attribution {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landing_page: string | null;
}

const SESSION_KEY = "imp_session";
const VISITOR_KEY = "imp_visitor";
const ATTRIBUTION_KEY = "imp_attribution"; // dernière campagne connue (30 jours, avec consentement)
const SESSION_TTL = 30 * 60 * 1000;
const ATTRIBUTION_TTL = 30 * 24 * 60 * 60 * 1000;

const randomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const safe = <T>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };

// pages de l'administration, robots et navigateurs automatisés : pas de mesure
const isExcluded = () =>
  typeof window === "undefined" ||
  /^\/(admin|login)/.test(window.location.pathname) ||
  /bot|crawler|spider|lighthouse|headless/i.test(navigator.userAgent);

const device = (): "mobile" | "tablet" | "desktop" => {
  const w = window.innerWidth;
  return w < 768 ? "mobile" : w < 1100 ? "tablet" : "desktop";
};

const externalReferrer = (): string | null => {
  if (!document.referrer) return null;
  return safe(() => {
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    return host === window.location.hostname.replace(/^www\./, "") ? null : host;
  }, null);
};

const readUtm = (): Pick<Attribution, "utm_source" | "utm_medium" | "utm_campaign"> => {
  const q = new URLSearchParams(window.location.search);
  // fbclid / gclid sans UTM : on déduit au moins la plateforme
  const source = q.get("utm_source") || (q.get("fbclid") ? "facebook" : q.get("gclid") ? "google" : null);
  return {
    utm_source: source?.slice(0, 120) || null,
    utm_medium: q.get("utm_medium")?.slice(0, 120) || (q.get("gclid") ? "cpc" : q.get("fbclid") ? "social" : null),
    utm_campaign: q.get("utm_campaign")?.slice(0, 200) || null,
  };
};

interface SessionState { id: string; last: number; attribution: Attribution }

let memorySession: SessionState | null = null;

/** Session courante ; en crée une (et envoie session_start) si besoin. */
const ensureSession = (): SessionState => {
  const now = Date.now();
  const stored = memorySession ?? safe(() => JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") as SessionState | null, null);
  const utm = readUtm();
  const hasNewCampaign = !!utm.utm_source && stored?.attribution.utm_source !== utm.utm_source;

  let session = stored;
  if (!session || now - session.last > SESSION_TTL || hasNewCampaign) {
    const attribution: Attribution = {
      ...utm,
      referrer: externalReferrer(),
      landing_page: window.location.pathname.slice(0, 300),
    };
    session = { id: randomId(), last: now, attribution };
    persistSession(session);
    rememberCampaign(attribution);
    send("session_start", { ...attribution, path: attribution.landing_page }, session);
  } else {
    session.last = now;
    persistSession(session);
  }
  return session;
};

const persistSession = (s: SessionState) => {
  memorySession = s;
  safe(() => sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)), undefined);
};

const rememberCampaign = (a: Attribution) => {
  if (!getConsent().stats || !(a.utm_source || a.referrer)) return;
  safe(() => localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ ...a, at: Date.now() })), undefined);
};

const visitorId = (): string | null => {
  if (!getConsent().stats) return null;
  return safe(() => {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) { id = randomId(); localStorage.setItem(VISITOR_KEY, id); }
    return id;
  }, null);
};

/** Efface les identifiants persistants (retrait du consentement). */
export const forgetVisitor = () => {
  safe(() => { localStorage.removeItem(VISITOR_KEY); localStorage.removeItem(ATTRIBUTION_KEY); }, undefined);
};

interface EventProps {
  path?: string | null;
  product_id?: string | null;
  label?: string | null;
  value?: number | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
}

const send = (event: AnalyticsEvent, props: EventProps, session: SessionState) => {
  void supabase.from("analytics_events").insert({
    event,
    session_id: session.id,
    visitor_id: visitorId(),
    path: (props.path ?? window.location.pathname).slice(0, 300),
    product_id: props.product_id ?? null,
    label: props.label?.slice(0, 200) ?? null,
    value: props.value ?? null,
    utm_source: props.utm_source ?? null,
    utm_medium: props.utm_medium ?? null,
    utm_campaign: props.utm_campaign ?? null,
    referrer: props.referrer?.slice(0, 300) ?? null,
    device: device(),
  }).then(({ error }) => { if (error && import.meta.env.DEV) console.warn("[stats]", error.message); });
};

// correspondance avec les événements standard Meta / Google
const PIXEL_EVENTS: Partial<Record<AnalyticsEvent, string>> = {
  product_view: "ViewContent", quote_add: "AddToCart", form_start: "InitiateCheckout",
  quote_submit: "Lead", contact_submit: "Contact", search: "Search",
};
const GA_EVENTS: Partial<Record<AnalyticsEvent, string>> = {
  product_view: "view_item", quote_add: "add_to_cart", form_start: "begin_checkout",
  quote_submit: "generate_lead", contact_submit: "generate_lead", search: "search",
  whatsapp_click: "contact_whatsapp", phone_click: "contact_phone", email_click: "contact_email",
};

type Fbq = (...args: unknown[]) => void;
type Gtag = (...args: unknown[]) => void;

/** Enregistre un événement. Sans effet dans l'admin et pour les robots. */
export const track = (event: Exclude<AnalyticsEvent, "session_start">, props: EventProps = {}) => {
  if (isExcluded()) return;
  const session = ensureSession();
  send(event, props, session);

  const w = window as unknown as { fbq?: Fbq; gtag?: Gtag };
  const pixelName = PIXEL_EVENTS[event];
  if (pixelName && w.fbq) w.fbq("track", pixelName, props.product_id ? { content_ids: [props.product_id] } : props.label ? { search_string: props.label } : {});
  const gaName = GA_EVENTS[event];
  if (gaName && w.gtag) w.gtag("event", gaName, { item_id: props.product_id ?? undefined, search_term: props.label ?? undefined });
};

/** Provenance à joindre à une demande de devis / contact. */
export const getAttribution = (): Attribution & { session_id: string | null } => {
  if (isExcluded()) return { utm_source: null, utm_medium: null, utm_campaign: null, referrer: null, landing_page: null, session_id: null };
  const session = ensureSession();
  let a = session.attribution;
  // session arrivée « en direct » : on reprend la dernière campagne connue (≤ 30 jours)
  if (!a.utm_source && !a.referrer && getConsent().stats) {
    const saved = safe(() => JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || "null"), null) as (Attribution & { at: number }) | null;
    if (saved && Date.now() - saved.at < ATTRIBUTION_TTL) a = saved;
  }
  return { ...a, session_id: session.id };
};

/** Clics sortants WhatsApp / téléphone / email, où qu'ils soient dans le site. */
export const installClickTracking = () => {
  if (typeof document === "undefined") return () => {};
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (/^tel:/i.test(href)) track("phone_click", { label: href.slice(4) });
    else if (/^mailto:/i.test(href)) track("email_click", { label: href.slice(7).split("?")[0] });
    else if (/wa\.me|whatsapp\.com/i.test(href)) track("whatsapp_click");
  };
  document.addEventListener("click", onClick, { capture: true });
  return () => document.removeEventListener("click", onClick, { capture: true });
};
