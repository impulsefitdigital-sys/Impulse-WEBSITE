import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution, track } from "@/lib/analytics";
import { thumbProps } from "@/lib/images";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, Trash2, X } from "lucide-react";
import ContactFields, { LegalLine } from "./ContactFields";
import { checkContact, formatMad, loadContact, markLeadSent, onContactChange, reportLead, saveContact, whatsappLink, type LpContact } from "./contact";
import WhatsAppIcon from "./WhatsAppIcon";

export interface DevisLine {
  ref: string;
  productId: string;
  name: string;
  image: string;
  category: string;
  pu: number;
  qty: number;
}

interface Props {
  lines: DevisLine[];
  setQty: (ref: string, qty: number) => void;
  onClose: () => void;
  onSent: () => void;
  onBrowse: () => void;
  /** numéro WhatsApp (Admin → Coordonnées) : bouton affiché seulement après l'envoi */
  whatsappNumber?: string;
}

/**
 * Panneau « Mon devis » : machines choisies, quantités, total HT, puis coordonnées.
 * Envoi = une demande de devis (numéro DEV-…) dans Admin → Demandes, filtre « Landing page ».
 */
const DevisDrawer = ({ lines, setQty, onClose, onSent, onBrowse, whatsappNumber }: Props) => {
  const [step, setStep] = useState<"panier" | "coordonnees" | "envoye">("panier");
  const [contact, setContact] = useState<LpContact>(loadContact);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [quote, setQuote] = useState<{ number: string; total: number; count: number } | null>(null);

  useEffect(() => onContactChange(() => setContact(loadContact())), []);

  const total = lines.reduce((s, l) => s + l.pu * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const filled = !checkContact(contact);

  const change = (c: LpContact) => { setContact(c); saveContact(c); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = checkContact(contact);
    setError(err);
    if (err || !lines.length) return;
    setSending(true);
    const detail = lines.map((l) => `• ${l.name} (${l.ref}) × ${l.qty} : ${formatMad(l.pu)} HT l'unité`).join("\n");
    const { data, error: rpcError } = await supabase.rpc("submit_request", {
      p: {
        request_type: "devis",
        usage_type: "professionnel",
        full_name: contact.name.trim(),
        phone: contact.phone.trim(),
        email: contact.email.trim(),
        items: lines.map((l) => ({ id: l.productId, name: `${l.name} (${l.ref})`, category: l.category, quantity: l.qty })),
        message: `Devis préparé sur la landing page Musculation (prix du stock affichés)\n${detail}\nTotal affiché : ${formatMad(total)} HT pour ${count} machine${count > 1 ? "s" : ""}`,
        source: "landing",
        ...getAttribution(),
      },
    });
    setSending(false);
    if (rpcError) { setError("L'envoi n'a pas fonctionné. Réessayez ou appelez-nous."); return; }
    markLeadSent();
    track("quote_submit", { label: "landing", value: total });
    reportLead("devis", total);
    setQuote({ number: String((data as { quote_number?: string } | null)?.quote_number || ""), total, count });
    setStep("envoye");
    onSent();
  };

  return (
    <div className="lp-drawer" role="dialog" aria-modal="true" aria-labelledby="lp-devis-title" onClick={onClose}>
      <aside className="lp-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <header className="lp-drawer-head">
          <h2 id="lp-devis-title">{step === "envoye" ? "Commande envoyée" : "Mon devis"}</h2>
          <button className="lp-modal-x" onClick={onClose} aria-label="Fermer"><X /></button>
        </header>

        {step === "envoye" && quote ? (
          <div className="lp-drawer-body lf-done" role="status">
            <span className="lf-done-icon"><Check /></span>
            <h3>Merci {contact.name.trim().split(" ")[0]} !</h3>
            <p>Votre demande {quote.number && <strong>{quote.number}</strong>} est bien reçue : {quote.count} machine{quote.count > 1 ? "s" : ""}, {formatMad(quote.total)} HT.</p>
            <p>Un conseiller Impulse vous rappelle <strong>sous 24 h ouvrées</strong> pour confirmer la disponibilité, la livraison et l'installation.</p>
            <div className="lf-done-actions">
              {whatsappNumber && (
                <a className="lp-btn lp-btn-wa" href={whatsappLink(whatsappNumber, `Bonjour, je suis ${contact.name.trim()}. Je viens d'envoyer ma demande${quote.number ? ` ${quote.number}` : ""} sur votre page Offre de lancement (${quote.count} machine${quote.count > 1 ? "s" : ""}, ${formatMad(quote.total)} HT).`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> Écrire sur WhatsApp</a>
              )}
              <button className="lp-btn lp-btn-dark" onClick={onClose}>Fermer</button>
            </div>
          </div>
        ) : !lines.length ? (
          <div className="lp-drawer-body lp-drawer-empty">
            <p>Votre devis est vide.</p>
            <p>Ajoutez des machines avec le bouton <strong>« Ajouter au devis »</strong> sous chaque produit.</p>
            <button className="lp-btn lp-btn-red" onClick={onBrowse}>Voir les machines <ArrowRight /></button>
          </div>
        ) : step === "panier" ? (
          <>
            <ul className="lp-drawer-body lp-lines">
              {lines.map((l) => (
                <li key={l.ref} className="lp-line">
                  <img {...thumbProps(l.image)} alt="" />
                  <div className="lp-line-info">
                    <p className="lp-line-name">{l.name}</p>
                    <p className="lp-line-price">{formatMad(l.pu)} <span>HT / unité</span></p>
                    <div className="lp-qty" role="group" aria-label={`Quantité ${l.name}`}>
                      <button onClick={() => setQty(l.ref, l.qty - 1)} aria-label="Retirer une unité">{l.qty > 1 ? <Minus /> : <Trash2 />}</button>
                      <span aria-live="polite">{l.qty}</span>
                      <button onClick={() => setQty(l.ref, l.qty + 1)} aria-label="Ajouter une unité"><Plus /></button>
                    </div>
                  </div>
                  <p className="lp-line-total">{formatMad(l.pu * l.qty)}</p>
                </li>
              ))}
            </ul>
            <footer className="lp-drawer-foot">
              <p className="lp-total"><span>Total HT ({count} machine{count > 1 ? "s" : ""})</span><strong>{formatMad(total)}</strong></p>
              <p className="lp-total-note">Prix unitaires HT. Livraison et installation confirmées par votre conseiller.</p>
              <button className="lp-btn lp-btn-red lf-next" onClick={() => setStep("coordonnees")}>
                Envoyer la commande <ArrowRight />
              </button>
              <button className="lp-drawer-more" onClick={onBrowse}>Continuer la sélection</button>
            </footer>
          </>
        ) : (
          <form className="lp-drawer-body lf" onSubmit={submit} noValidate>
            <button type="button" className="lp-drawer-back" onClick={() => setStep("panier")}><ArrowLeft /> {count} machine{count > 1 ? "s" : ""} · {formatMad(total)} HT</button>
            <p className="lp-drawer-hint">{filled ? "Vos coordonnées sont déjà remplies : vérifiez-les et envoyez." : "Vos coordonnées pour recevoir le devis :"}</p>
            <ContactFields idPrefix="devis" value={contact} onChange={change} autoFocus={!filled} />
            {error && <p className="lf-error" role="alert">{error}</p>}
            <button type="submit" className="lp-btn lp-btn-red lf-next" disabled={sending}>
              {sending ? "Envoi…" : <>Envoyer la commande <ArrowRight /></>}
            </button>
            <LegalLine />
          </form>
        )}
      </aside>
    </div>
  );
};

export default DevisDrawer;
