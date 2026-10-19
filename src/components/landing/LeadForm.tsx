import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution, track } from "@/lib/analytics";
import { ArrowLeft, ArrowRight, Check, MessageCircle } from "lucide-react";

/**
 * Formulaire de la landing page, en 2 étapes :
 *   1. deux questions à boutons (type de projet, surface) — rien à écrire ;
 *   2. nom, téléphone (obligatoire), email (facultatif).
 * Les demandes arrivent dans Admin → Demandes avec la mention « Landing page ».
 */
export const PROJECTS = ["Salle de sport / club", "Hôtel / résidence", "Entreprise / institution", "Usage personnel"] as const;
export const SURFACES = ["Moins de 100 m²", "100 à 200 m²", "200 à 400 m²", "Plus de 400 m²", "Je ne sais pas encore"] as const;

export const LEAD_SENT_KEY = "impulse-lp-envoye";
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

type Win = Window & { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };

interface Props {
  idPrefix: string;
  /** produit / gamme / visite d'où vient le clic (ex. « Gamme IT95 ») */
  interest?: string;
  whatsappNumber?: string;
  onStarted?: () => void;
  onDone?: () => void;
  compact?: boolean;
}

const LeadForm = ({ idPrefix, interest, whatsappNumber, onStarted, onDone, compact }: Props) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [project, setProject] = useState<string>("");
  const [surface, setSurface] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const started = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const start = () => {
    if (started.current) return;
    started.current = true;
    track("form_start", { label: "landing" });
    onStarted?.();
  };

  useEffect(() => { if (step === 2) nameRef.current?.focus({ preventScroll: true }); }, [step]);

  const pick = (kind: "project" | "surface", v: string) => {
    start();
    if (kind === "project") setProject(v); else setSurface(v);
    const p = kind === "project" ? v : project;
    const s = kind === "surface" ? v : surface;
    if (p && s) window.setTimeout(() => setStep(2), 220);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (name.trim().length < 2) return setError("Indiquez votre nom.");
    if (digits.length < 9 || digits.length > 15) return setError("Indiquez un numéro de téléphone valide (ex. 06 12 34 56 78).");
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("L'adresse email n'est pas valide (ou laissez-la vide).");
    setSending(true);
    const message = [
      "Landing page Musculation professionnelle",
      project && `Projet : ${project}`,
      surface && `Surface : ${surface}`,
      interest && `Intérêt : ${interest}`,
    ].filter(Boolean).join("\n");
    const { error: err } = await supabase.rpc("submit_request", {
      p: {
        request_type: "contact",
        usage_type: project === "Usage personnel" ? "residentiel" : "professionnel",
        full_name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        message,
        source: "landing",
        project_type: project,
        surface,
        ...getAttribution(),
      },
    });
    setSending(false);
    if (err) { setError("L'envoi n'a pas fonctionné. Réessayez, ou appelez-nous / écrivez-nous sur WhatsApp."); return; }
    safeSet(LEAD_SENT_KEY, String(Date.now()));
    track("contact_submit", { label: "landing" });
    const w = window as Win;
    try { w.fbq?.("track", "Lead", { content_name: "Landing musculation" }); } catch { /* pixel absent */ }
    try { w.gtag?.("event", "generate_lead", { form: "landing_musculation" }); } catch { /* GA4 absent */ }
    setStep(3);
    onDone?.();
  };

  const chips = (list: readonly string[], value: string, kind: "project" | "surface", label: string) => (
    <fieldset className="lf-group">
      <legend>{label}</legend>
      <div className="lf-chips">
        {list.map((v) => (
          <button type="button" key={v} className={`lf-chip${value === v ? " on" : ""}`} aria-pressed={value === v} onClick={() => pick(kind, v)}>
            {value === v && <Check aria-hidden="true" />}{v}
          </button>
        ))}
      </div>
    </fieldset>
  );

  if (step === 3) {
    return (
      <div className="lf lf-done" role="status">
        <span className="lf-done-icon"><Check /></span>
        <h3>Merci {name.trim().split(" ")[0]} !</h3>
        <p>Votre demande est bien reçue. Un conseiller Impulse vous rappelle <strong>sous 24 h ouvrées</strong> au <strong>{phone}</strong>.</p>
        {whatsappNumber && (
          <a className="lp-btn lp-btn-wa" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Bonjour, je viens d'envoyer une demande sur votre site pour équiper ma salle.")}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle /> Accélérer sur WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <form className={`lf${compact ? " compact" : ""}`} onSubmit={submit} noValidate>
      <div className="lf-progress" aria-hidden="true"><span style={{ width: step === 1 ? "50%" : "100%" }} /></div>
      <p className="lf-step">Étape {step} sur 2{step === 1 ? " · 2 clics" : " · vos coordonnées"}</p>

      {step === 1 ? (
        <>
          {chips(PROJECTS, project, "project", "Votre projet")}
          {chips(SURFACES, surface, "surface", "Surface de la salle")}
          <button type="button" className="lp-btn lp-btn-red lf-next" disabled={!project || !surface} onClick={() => setStep(2)}>
            Continuer <ArrowRight />
          </button>
        </>
      ) : (
        <>
          <div className="lf-recap">
            <span>{project} · {surface}</span>
            <button type="button" onClick={() => setStep(1)}><ArrowLeft /> Modifier</button>
          </div>
          <label className="lf-field" htmlFor={`${idPrefix}-name`}>Nom et prénom
            <input ref={nameRef} id={`${idPrefix}-name`} name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Karim Benali" required />
          </label>
          <label className="lf-field" htmlFor={`${idPrefix}-phone`}>Téléphone / WhatsApp
            <input id={`${idPrefix}-phone`} name="tel" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" required />
          </label>
          <label className="lf-field" htmlFor={`${idPrefix}-email`}><span>Email <small>(facultatif)</small></span>
            <input id={`${idPrefix}-email`} name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.ma" />
          </label>
          {error && <p className="lf-error" role="alert">{error}</p>}
          <button type="submit" className="lp-btn lp-btn-red lf-next" disabled={sending}>
            {sending ? "Envoi…" : <>Recevoir mon offre <ArrowRight /></>}
          </button>
        </>
      )}
      <p className="lf-legal">
        En envoyant ce formulaire, vous acceptez d'être recontacté par Impulse Fitness Maroc au sujet de votre projet.
        Vos données ne sont jamais revendues. <a href="/politique-de-confidentialite" target="_blank" rel="noopener">Politique de confidentialité</a>.
      </p>
    </form>
  );
};

export default LeadForm;
