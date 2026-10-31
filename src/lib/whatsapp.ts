/**
 * Liens WhatsApp (wa.me) : le numéro doit être au format international, chiffres seuls, sans « + » ni 0
 * initial (ex. 212661464603). Les numéros saisis dans l'admin (« 06 61 46 46 03 », « +212 661-464603 »…)
 * sont convertis ici : sinon le lien wa.me ne s'ouvre pas.
 */

/** Numéro WhatsApp d'Impulse Fitness Maroc (+212 661-464603), utilisé si le réglage de l'admin est vide ou invalide. */
export const WHATSAPP_NUMBER = "212661464603";

/** « 06 61 46 46 03 », « +212 661‑464603 », « 00212… » → « 212661464603 » ; chaîne vide si ce n'est pas un numéro. */
export const normalizeWhatsApp = (raw?: string | null): string => {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (/^0[5-7]\d{8}$/.test(d)) d = "212" + d.slice(1); // numéro marocain national (06…, 07…, 05…)
  else if (/^[5-7]\d{8}$/.test(d)) d = "212" + d; // 9 chiffres sans le 0
  return /^\d{10,15}$/.test(d) ? d : "";
};

/** Lien wa.me vers le numéro d'Impulse (réglage de l'admin s'il est valide), avec un message prérempli facultatif. */
export const whatsappHref = (raw?: string | null, text?: string) =>
  `https://wa.me/${normalizeWhatsApp(raw) || WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
