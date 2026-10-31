import { whatsappHref } from "@/lib/whatsapp";

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
/** Type de demande envoyée depuis la landing (même classement que dans Admin → Landing page). */
export type LeadKind = "devis" | "rdv" | "projet" | "machine" | "rappel" | "questionnaire";
const LEAD_NAMES: Record<LeadKind, string> = {
  questionnaire: "Questionnaire landing accueil (LP2)",
  devis: "Commande landing musculation",
  rdv: "RDV showroom landing",
  projet: "Projet sur mesure landing",
  machine: "Question machine landing",
  rappel: "Contact landing",
};
/** D'après le bouton cliqué (« intérêt » du formulaire simple). */
export const leadKindFromInterest = (interest?: string): LeadKind => {
  const i = (interest || "").toLowerCase();
  return !i ? "rappel" : i.includes("showroom") ? "rdv" : i.includes("projet") ? "projet" : "machine";
};

/**
 * Conversion envoyée au Pixel Meta (« Lead ») et à GA4 (« generate_lead »), s'ils sont chargés
 * (donc acceptés dans le bandeau cookies). Une seule conversion par demande envoyée, marquée « landing »,
 * avec le type de demande et, pour une commande, sa valeur HT en dirhams.
 */
export const reportLead = (kind: LeadKind, value?: number) => {
  const w = window as Win;
  const extra = value ? { value: Math.round(value), currency: "MAD" } : {};
  try { w.fbq?.("track", "Lead", { content_name: LEAD_NAMES[kind], content_category: "landing", ...extra }); } catch { /* pixel absent */ }
  try { w.gtag?.("event", "generate_lead", { form: `landing_${kind}`, site_section: "landing", ...extra }); } catch { /* GA4 absent */ }
};

/** La landing ne renvoie jamais vers le site : les liens « confidentialité » ouvrent une fenêtre dans la page. */
export const PRIVACY_EVENT = "impulse-lp-confidentialite";
export const openLpPrivacy = () => window.dispatchEvent(new CustomEvent(PRIVACY_EVENT));

/** Lien WhatsApp avec message prérempli (proposé seulement après l'envoi d'un formulaire ou d'un devis). */
export const whatsappLink = (number: string, text: string) => whatsappHref(number, text);

export const formatMad = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/[\s\u202f]/g, "\u00a0")}\u00a0DH`;
