import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import QuickLeadForm, { LP2_SENT_EVENT, lp2Sent } from "./QuickLeadForm";
import "@/styles/lp2.css";

/**
 * Barre de relance de la landing page 2, collée en bas de l'écran.
 * - Sur /lp2 : apparaît dès que le formulaire du haut n'est plus visible (dépassé en
 *   scrollant ou fermé avec la croix).
 * - Sur les autres pages du site : suit le visiteur arrivé par /lp2 (même session), après
 *   un petit scroll. Jamais sur les pages devis / contact / landing 1 / administration.
 * - Disparaît définitivement une fois la demande envoyée ; sa croix la masque pour la session.
 * Le bouton ouvre le même questionnaire dans une fenêtre (feuille du bas sur téléphone).
 */
export const LP2_VISIT_KEY = "impulse-lp2-visite";
export const LP2_DISMISS_KEY = "impulse-lp2-ferme";
export const LP2_DISMISS_EVENT = "impulse-lp2-ferme";
const BAR_CLOSED_KEY = "impulse-lp2-barre-fermee";
const EXCLUDED = /^\/(lp|admin|login|devis|contact|politique-de-confidentialite)(\/|$)/;

const session = (key: string) => { try { return !!sessionStorage.getItem(key); } catch { return false; } };

const LeadBar = () => {
  const { pathname } = useLocation();
  const onLp2 = pathname === "/lp2" || pathname.startsWith("/lp2/");
  const [sent, setSent] = useState(lp2Sent);
  const [barClosed, setBarClosed] = useState(() => session(BAR_CLOSED_KEY));
  const [formAway, setFormAway] = useState(false); // formulaire du haut hors de l'écran (ou fermé)
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const eligible = !sent && !barClosed && !EXCLUDED.test(pathname) && (onLp2 || session(LP2_VISIT_KEY));

  useEffect(() => {
    const onSent = () => setSent(true);
    window.addEventListener(LP2_SENT_EVENT, onSent);
    return () => window.removeEventListener(LP2_SENT_EVENT, onSent);
  }, []);

  // /lp2 : suivre la visibilité du formulaire du haut
  useEffect(() => {
    if (!eligible || !onLp2) return;
    let io: IntersectionObserver | null = null;
    let current: HTMLElement | null | undefined;
    // le formulaire peut apparaître après la barre (page chargée à la demande) ou être retiré par la croix
    const sync = () => {
      const el = document.getElementById("lp2-form");
      if (el === current) return;
      current = el;
      io?.disconnect();
      io = null;
      if (!el) { setFormAway(session(LP2_DISMISS_KEY)); return; }
      setFormAway(false);
      if (typeof IntersectionObserver === "undefined") return;
      io = new IntersectionObserver(([e]) => setFormAway(!e.isIntersecting), { threshold: 0, rootMargin: "-64px 0px 0px 0px" });
      io.observe(el);
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true });
    const onDismiss = () => setFormAway(true);
    window.addEventListener(LP2_DISMISS_EVENT, onDismiss);
    return () => { io?.disconnect(); mo.disconnect(); window.removeEventListener(LP2_DISMISS_EVENT, onDismiss); };
  }, [eligible, onLp2]);

  // autres pages : afficher après un petit scroll
  useEffect(() => {
    if (!eligible || onLp2) return;
    const onScroll = () => setScrolled(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [eligible, onLp2, pathname]);

  const visible = eligible && (onLp2 ? formAway : scrolled);

  useEffect(() => {
    document.body.classList.toggle("has-lp2-bar", visible);
    return () => document.body.classList.remove("has-lp2-bar");
  }, [visible]);

  // fenêtre : Échap pour fermer, page figée derrière
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  const closeBar = () => {
    try { sessionStorage.setItem(BAR_CLOSED_KEY, "1"); } catch { /* stockage indisponible */ }
    setBarClosed(true);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {visible && !open && (
        <div className="lp2-bar" role="region" aria-label="Demande de conseil gratuit">
          <div className="lp2-bar-text">
            <strong>Parlons de votre projet&nbsp;!</strong>
            <span>Un conseiller Impulse vous contactera dans les plus brefs délais.</span>
          </div>
          <button type="button" className="lp2-btn lp2-btn-red lp2-bar-cta" onClick={() => setOpen(true)}>
            Contactez-nous <ArrowRight />
          </button>
          <button type="button" className="lp2-bar-x" onClick={closeBar} aria-label="Masquer cette barre"><X /></button>
        </div>
      )}
      {open && (
        <div className="lp2-modal" role="dialog" aria-modal="true" aria-label="Demande de conseil gratuit" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="lp2-modal-box">
            <QuickLeadForm idPrefix="lp2-barre" origin="barre" onClose={() => setOpen(false)} onContinue={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>,
    document.body,
  );
};

export default LeadBar;
