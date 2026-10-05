import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getConsent, setConsent, onConsentOpen } from "@/lib/consent";
import { forgetVisitor } from "@/lib/analytics";

/** Bandeau de consentement : Tout accepter / Refuser / Personnaliser. */
const CookieBanner = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => !getConsent().decided);
  const [custom, setCustom] = useState(false);
  const [stats, setStats] = useState(getConsent().stats);
  const [ads, setAds] = useState(getConsent().ads);

  useEffect(() => onConsentOpen(() => {
    const c = getConsent();
    setStats(c.stats); setAds(c.ads); setCustom(true); setOpen(true);
  }), []);

  if (!open || /^\/(admin|login)/.test(pathname)) return null;

  const save = (c: { stats: boolean; ads: boolean }) => {
    const before = getConsent();
    if (!c.stats) forgetVisitor();
    setConsent(c);
    setOpen(false);
    // consentement retiré : les outils déjà chargés (Pixel, GA, Clarity) ne se déchargent qu'en rechargeant
    if ((before.stats && !c.stats) || (before.ads && !c.ads)) window.location.reload();
  };

  return (
    <div className="imp-cookie" role="dialog" aria-live="polite" aria-label="Préférences cookies">
      <p className="ck-title">Votre vie privée</p>
      <p className="ck-text">
        Nous mesurons l'audience du site pour l'améliorer et, avec votre accord, pour suivre nos campagnes publicitaires.
        Aucune donnée n'est vendue. <a href="/politique-de-confidentialite">En savoir plus</a>
      </p>

      {custom && (
        <div className="ck-options">
          <label><input type="checkbox" checked disabled /> <span><strong>Nécessaires</strong> — fonctionnement du site, panier de devis, mesure anonyme</span></label>
          <label><input type="checkbox" checked={stats} onChange={(e) => setStats(e.target.checked)} /> <span><strong>Statistiques</strong> — visiteurs uniques, Google Analytics, Microsoft Clarity</span></label>
          <label><input type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} /> <span><strong>Publicité</strong> — Meta (Facebook / Instagram)</span></label>
        </div>
      )}

      <div className="ck-actions">
        {custom ? (
          <button className="ck-btn primary" onClick={() => save({ stats, ads })}>Enregistrer mes choix</button>
        ) : (
          <>
            <button className="ck-btn primary" onClick={() => save({ stats: true, ads: true })}>Tout accepter</button>
            <button className="ck-btn" onClick={() => save({ stats: false, ads: false })}>Refuser</button>
            <button className="ck-link" onClick={() => setCustom(true)}>Personnaliser</button>
          </>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;
