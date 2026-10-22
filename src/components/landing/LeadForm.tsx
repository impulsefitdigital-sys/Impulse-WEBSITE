import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution, track } from "@/lib/analytics";
import { ArrowRight, Check } from "lucide-react";
import ContactFields, { LegalLine } from "./ContactFields";
import { checkContact, loadContact, markLeadSent, onContactChange, reportLead, saveContact, type LpContact } from "./contact";

export { LEAD_SENT_KEY } from "./contact";

/**
 * Formulaire simple de la landing page : nom et prénom, téléphone, email (facultatif).
 * Les coordonnées saisies sont gardées : le formulaire du devis est ensuite déjà rempli.
 * La demande arrive dans Admin → Demandes, filtre « Landing page ».
 */
interface Props {
  idPrefix: string;
  /** machine ou action d'où vient le clic (ex. « Visite du showroom ») */
  interest?: string;
  onStarted?: () => void;
  onDone?: () => void;
  /** après l'envoi : bouton pour passer au devis */
  onOpenDevis?: () => void;
  submitLabel?: string;
}

const LeadForm = ({ idPrefix, interest, onStarted, onDone, onOpenDevis, submitLabel = "Être rappelé" }: Props) => {
  const [contact, setContact] = useState<LpContact>(loadContact);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  // un autre formulaire de la page a été rempli : on reprend ses coordonnées
  useEffect(() => onContactChange(() => setContact(loadContact())), []);

  const change = (c: LpContact) => {
    if (!started.current) { started.current = true; track("form_start", { label: "landing" }); onStarted?.(); }
    setContact(c);
    saveContact(c);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = checkContact(contact);
    setError(err);
    if (err) return;
    setSending(true);
    const { error: rpcError } = await supabase.rpc("submit_request", {
      p: {
        request_type: "contact",
        usage_type: "professionnel",
        full_name: contact.name.trim(),
        phone: contact.phone.trim(),
        email: contact.email.trim(),
        message: ["Landing page Musculation professionnelle : demande de rappel", interest && `Intérêt : ${interest}`].filter(Boolean).join("\n"),
        source: "landing",
        ...getAttribution(),
      },
    });
    setSending(false);
    if (rpcError) { setError("L'envoi n'a pas fonctionné. Réessayez ou appelez-nous."); return; }
    markLeadSent();
    track("contact_submit", { label: "landing" });
    reportLead("rappel");
    setDone(true);
    onDone?.();
  };

  if (done) {
    return (
      <div className="lf lf-done" role="status">
        <span className="lf-done-icon"><Check /></span>
        <h3>Merci {contact.name.trim().split(" ")[0]} !</h3>
        <p>Votre demande est bien reçue. Un conseiller Impulse vous rappelle <strong>sous 24 h ouvrées</strong> au <strong>{contact.phone}</strong>.</p>
        {onOpenDevis && (
          <button type="button" className="lp-btn lp-btn-dark" onClick={onOpenDevis}>Préparer mon devis <ArrowRight /></button>
        )}
      </div>
    );
  }

  return (
    <form className="lf" onSubmit={submit} noValidate>
      <ContactFields idPrefix={idPrefix} value={contact} onChange={change} />
      {error && <p className="lf-error" role="alert">{error}</p>}
      <button type="submit" className="lp-btn lp-btn-red lf-next" disabled={sending}>
        {sending ? "Envoi…" : <>{submitLabel} <ArrowRight /></>}
      </button>
      <LegalLine />
    </form>
  );
};

export default LeadForm;
