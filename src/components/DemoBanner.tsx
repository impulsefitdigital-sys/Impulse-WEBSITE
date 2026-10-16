import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { IS_DEMO } from "@/integrations/supabase/client";

/** Bandeau discret affiché uniquement en mode démo (aucune clé de base de données). */
const DemoBanner = () => {
  const [open, setOpen] = useState(true);
  const { pathname } = useLocation();
  if (!IS_DEMO) return null;
  // Une démo ne doit jamais être indexée (contenu dupliqué avec le vrai site)
  const noindex = (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
  // Pas de bandeau dans le back-office : il masquerait les boutons du formulaire
  if (!open || pathname.startsWith("/admin") || pathname.startsWith("/login")) return noindex;
  return (
    <>
    {noindex}
    <div className="fixed bottom-4 left-4 z-[9999] max-w-xs rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-lg">
      <div className="flex items-start gap-2">
        <div>
          <strong>Mode démo</strong> — données de la sauvegarde du 24/09/2026, sans base en ligne.
          Modifications admin non enregistrées.{" "}
          <Link to="/admin" className="underline">Ouvrir l'admin</Link>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Fermer" className="ml-1 font-bold">×</button>
      </div>
    </div>
    </>
  );
};

export default DemoBanner;
