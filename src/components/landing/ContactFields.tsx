import { useEffect, useRef } from "react";
import type { LpContact } from "./contact";

/** Les 3 champs communs (formulaire simple et formulaire du devis). */
const ContactFields = ({ idPrefix, value, onChange, autoFocus }: { idPrefix: string; value: LpContact; onChange: (c: LpContact) => void; autoFocus?: boolean }) => {
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) first.current?.focus({ preventScroll: true }); }, [autoFocus]);
  const set = (k: keyof LpContact) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <>
      <label className="lf-field" htmlFor={`${idPrefix}-name`}>Nom et prénom
        <input ref={first} id={`${idPrefix}-name`} name="name" autoComplete="name" value={value.name} onChange={set("name")} placeholder="Ex. Karim Benali" required />
      </label>
      <label className="lf-field" htmlFor={`${idPrefix}-phone`}>Téléphone
        <input id={`${idPrefix}-phone`} name="tel" type="tel" inputMode="tel" autoComplete="tel" value={value.phone} onChange={set("phone")} placeholder="06 12 34 56 78" required />
      </label>
      <label className="lf-field" htmlFor={`${idPrefix}-email`}><span>Email <small>(facultatif)</small></span>
        <input id={`${idPrefix}-email`} name="email" type="email" inputMode="email" autoComplete="email" value={value.email} onChange={set("email")} placeholder="vous@exemple.ma" />
      </label>
    </>
  );
};

export const LegalLine = () => (
  <p className="lf-legal">
    En envoyant ce formulaire, vous acceptez d'être recontacté par Impulse Fitness Maroc au sujet de votre projet.
    Vos données ne sont jamais revendues. <a href="/politique-de-confidentialite" target="_blank" rel="noopener">Politique de confidentialité</a>.
  </p>
);

export default ContactFields;
