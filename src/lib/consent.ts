/**
 * Consentement cookies (loi 09-08 / CNDP).
 * - stats : identifiant visiteur de la mesure maison + Google Analytics + Microsoft Clarity
 * - ads   : Meta Pixel (publicité Facebook / Instagram)
 * Choix conservé 6 mois, puis redemandé.
 */
export interface Consent {
  stats: boolean;
  ads: boolean;
  decided: boolean;
}

const KEY = "imp_consent";
const TTL = 182 * 24 * 60 * 60 * 1000;
const EVENT = "imp-consent-change";
const OPEN_EVENT = "imp-consent-open";

const NONE: Consent = { stats: false, ads: false, decided: false };

export const getConsent = (): Consent => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as (Consent & { at: number }) | null;
    if (!raw || Date.now() - raw.at > TTL) return NONE;
    return { stats: !!raw.stats, ads: !!raw.ads, decided: true };
  } catch {
    return NONE;
  }
};

export const setConsent = (c: { stats: boolean; ads: boolean }) => {
  try { localStorage.setItem(KEY, JSON.stringify({ ...c, at: Date.now() })); } catch { /* navigation privée */ }
  window.dispatchEvent(new CustomEvent(EVENT));
};

export const onConsentChange = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

/** Rouvre le panneau (lien « Gérer les cookies » du pied de page). */
export const openConsentSettings = () => window.dispatchEvent(new CustomEvent(OPEN_EVENT));
export const onConsentOpen = (cb: () => void) => {
  window.addEventListener(OPEN_EVENT, cb);
  return () => window.removeEventListener(OPEN_EVENT, cb);
};
