import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Le site utilise beaucoup de liens <a href="/..."> classiques : chaque clic rechargeait
 * toute l'application (nouveau téléchargement, nouveau chargement des données, libellés
 * par défaut qui « clignotent », ex. « Consulting » avant « Solutions »).
 * Ce composant intercepte les clics sur les liens internes et navigue sans rechargement.
 * Liens externes, nouvel onglet, téléchargements, mailto/tel et Ctrl/Cmd+clic : inchangés.
 */
const SpaLinks = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.getAttribute("href")) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download") || a.dataset.reload !== undefined) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // fichiers statiques et fonctions Netlify : laisser le navigateur faire
      if (/^\/(storage|photos|api|\.netlify)\//.test(url.pathname) || /\.[a-z0-9]{2,5}$/i.test(url.pathname)) return;
      // simple ancre sur la même page
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);
  return null;
};

export default SpaLinks;
