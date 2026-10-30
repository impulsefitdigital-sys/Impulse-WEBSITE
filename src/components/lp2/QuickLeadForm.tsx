import { useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution, track } from "@/lib/analytics";
import { LP2_MARK } from "@/lib/requests";
import { checkContact, reportLead, whatsappLink } from "@/components/landing/contact";
import WhatsAppIcon from "@/components/landing/WhatsAppIcon";

/**
 * Questionnaire rapide de la landing page 2 (/lp2) et de sa barre de relance :
 * nom et prénom, téléphone, type de projet, superficie. La demande arrive dans
 * Admin → Landing pages, type « Questionnaire LP2 » (projet et superficie dans la fiche).
 */
export const PROJECTS = ["Salle de gym", "Hôtel", "Résidentiel", "Autre"] as const;
export const SURFACES = ["Moins de 100 m²", "100 à 500 m²", "Plus de 500 m²"] as const;
export const LP2_SENT_KEY = "impulse-lp2-envoye";
export const LP2_SENT_EVENT = "impulse-lp2-envoye";
/** WhatsApp des campagnes : proposé seulement après l'envoi (contact déjà qualifié) */
const CAMPAIGN_WHATSAPP = "212668818164";

export const lp2Sent = () => { try { return !!localStorage.getItem(LP2_SENT_KEY); } catch { return false; } };

interface Props {
  idPrefix: string;
  /** « accueil » : formulaire du haut de /lp2 ; « barre » : fenêtre ouverte depuis la barre de relance */
  origin: "accueil" | "barre";
  /** bouton croix : fermer le formulaire et voir le site */
  onClose?: () => void;
  /** après l'envoi, bouton « Découvrir le site » */
  onContinue?: () => void;
}

const QuickLeadForm = ({ idPrefix, origin, onClose, onContinue }: Props) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [project, setProject] = useState("");
  const [surface, setSurface] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  const start = () => {
    if (started.current) return;
    started.current = true;
    track("form_start", { label: "lp2" }, { relay: false });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = !project ? "Choisissez le type de projet." : !surface ? "Choisissez la superficie à équiper." : checkContact({ name, phone, email: "" });
    setError(err);
    if (err) return;
    setSending(true);
    const where = origin === "barre" ? `barre de relance (${window.location.pathname})` : "haut de l'accueil";
    const { error: rpcError } = await supabase.rpc("submit_request", {
      p: {
        request_type: "contact",
        usage_type: project === "Résidentiel" ? "residentiel" : "professionnel",
        full_name: name.trim(),
        phone: phone.trim(),
        email: "",
        project_type: project,
        surface,
        message: `${LP2_MARK}\nType de projet : ${project}\nSuperficie : ${surface}\nFormulaire : ${where}`,
        source: "landing",
        ...getAttribution(),
      },
    });
    setSending(false);
    if (rpcError) { setError("L'envoi n'a pas fonctionné. Réessayez ou appelez-nous."); return; }
    try { localStorage.setItem(LP2_SENT_KEY, String(Date.now())); } catch { /* stockage indisponible */ }
    window.dispatchEvent(new CustomEvent(LP2_SENT_EVENT));
    track("contact_submit", { label: "lp2" }, { relay: false });
    reportLead("questionnaire");
    setDone(true);
  };

  const close = onClose && (
    <button type="button" className="lp2-x" onClick={onClose} aria-label="Fermer le formulaire et voir le site"><X /></button>
  );

  if (done) {
    const first = name.trim().split(/\s+/)[0];
    return (
      <div className="lp2-form lp2-done" role="status">
        {close}
        <span className="lp2-done-icon"><Check /></span>
        <h2>Merci {first} !</h2>
        <p>Votre demande est bien reçue. Un conseiller Impulse vous contactera dans les plus brefs délais au <strong>{phone}</strong>.</p>
        <div className="lp2-done-actions">
          <a className="lp2-btn lp2-btn-wa" href={whatsappLink(CAMPAIGN_WHATSAPP, `Bonjour, je suis ${name.trim()}. Je viens de laisser mes coordonnées sur votre site (projet : ${project}, ${surface}).`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> Écrire sur WhatsApp</a>
          {onContinue && <button type="button" className="lp2-btn lp2-btn-dark" onClick={onContinue}>Découvrir le site <ArrowRight /></button>}
        </div>
      </div>
    );
  }

  const chips = (label: string, list: readonly string[], value: string, set: (v: string) => void) => (
    <fieldset className="lp2-q">
      <legend>{label}</legend>
      <div className="lp2-chips">
        {list.map((o) => (
          <button key={o} type="button" className={value === o ? "on" : ""} aria-pressed={value === o} onClick={() => { start(); set(o); }}>
            {value === o && <Check />}{o}
          </button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <form className="lp2-form" onSubmit={submit} noValidate>
      {close}
      <h2>Parlons de votre projet</h2>
      <p className="lp2-sub">Merci de partager vos coordonnées, nous vous contacterons dans les plus brefs délais.</p>
      <div className="lp2-fields">
        <label htmlFor={`${idPrefix}-name`}>Nom et prénom
          <input id={`${idPrefix}-name`} autoComplete="name" value={name} onChange={(e) => { start(); setName(e.target.value); }} placeholder="Ex. Karim Benali" required />
        </label>
        <label htmlFor={`${idPrefix}-phone`}>Téléphone
          <input id={`${idPrefix}-phone`} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => { start(); setPhone(e.target.value); }} placeholder="06 12 34 56 78" required />
        </label>
      </div>
      {chips("Quel type de projet souhaitez-vous équiper ?", PROJECTS, project, setProject)}
      {chips("Quelle est la superficie à équiper ?", SURFACES, surface, setSurface)}
      {error && <p className="lp2-error" role="alert">{error}</p>}
      <button type="submit" className="lp2-btn lp2-btn-red lp2-submit" disabled={sending}>{sending ? "Envoi…" : <>Envoyer <ArrowRight /></>}</button>
      <p className="lp2-legal">
        En envoyant ce formulaire, vous acceptez d'être recontacté par Impulse Fitness Maroc au sujet de votre projet. Vos données ne sont jamais revendues.{" "}
        <a href="/politique-de-confidentialite" target="_blank" rel="noopener">Politique de confidentialité</a>.
      </p>
    </form>
  );
};

export default QuickLeadForm;
