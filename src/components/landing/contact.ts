/**
 * Coordonnées du visiteur de la landing page, gardées dans son navigateur :
 * si la personne remplit d'abord le formulaire simple, le formulaire du devis est déjà rempli (et inversement).
 */
export interface LpContact { name: string; phone: string; email: string }

const KEY = "impulse-lp-coordonnees";
const EVENT = "impulse-lp-coordonnees";
export const LEAD_SENT_KEY = "impulse-lp-envoye";

export const loadContact = (): LpContact => {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<LpContact>;
    return { name: c.name || "", phone: c.phone || "", email: c.email || "" };
  } catch {
    return { name: "", phone: "", email: "" };
  }
};

export const saveContact = (c: LpContact) => {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* stockage indisponible */ }
  window.dispatchEvent(new CustomEvent(EVENT));
};

export const onContactChange = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

export const markLeadSent = () => {
  try { localStorage.setItem(LEAD_SENT_KEY, String(Date.now())); } catch { /* stockage indisponible */ }
};

/** Vérifie les coordonnées ; renvoie un message d'erreur ou "" si tout est bon. */
export const checkContact = (c: LpContact) => {
  const digits = c.phone.replace(/\D/g, "");
  if (c.name.trim().length < 2) return "Indiquez votre nom et prénom.";
  if (digits.length < 9 || digits.length > 15) return "Indiquez un numéro de téléphone valide (ex. 06 12 34 56 78).";
  if (c.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email.trim())) return "L'adresse email n'est pas valide (ou laissez-la vide).";
  return "";
};

type Win = Window & { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };
/** Conversion envoyée au Pixel Meta et à GA4 (s'ils sont chargés, donc acceptés dans le bandeau cookies). */
export const reportLead = (kind: "rappel" | "devis", value?: number) => {
  const w = window as Win;
  const extra = value ? { value, currency: "MAD" } : {};
  try { w.fbq?.("track", "Lead", { content_name: kind === "devis" ? "Devis landing musculation" : "Rappel landing musculation", ...extra }); } catch { /* pixel absent */ }
  try { w.gtag?.("event", "generate_lead", { form: kind === "devis" ? "landing_devis" : "landing_rappel", ...extra }); } catch { /* GA4 absent */ }
};

/** La landing ne renvoie jamais vers le site : les liens « confidentialité » ouvrent une fenêtre dans la page. */
export const PRIVACY_EVENT = "impulse-lp-confidentialite";
export const openLpPrivacy = () => window.dispatchEvent(new CustomEvent(PRIVACY_EVENT));

/** Lien WhatsApp avec message prérempli (proposé seulement après l'envoi d'un formulaire ou d'un devis). */
export const whatsappLink = (number: string, text: string) => `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

export const formatMad = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/[\s\u202f]/g, "\u00a0")}\u00a0DH`;
