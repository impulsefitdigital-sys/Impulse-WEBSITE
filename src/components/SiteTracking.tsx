import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { track, installClickTracking } from "@/lib/analytics";
import { getConsent, onConsentChange } from "@/lib/consent";

/**
 * - page_view à chaque changement de page + clics WhatsApp / téléphone / email
 * - charge Meta Pixel, Google Analytics 4 et Microsoft Clarity si leur identifiant est renseigné
 *   (Admin → Paramètres → Intégrations) ET si le visiteur a donné son accord.
 */
const loaded = new Set<string>();

const injectScript = (id: string, src: string | null, inline?: string) => {
  if (loaded.has(id) || document.getElementById(id)) return;
  loaded.add(id);
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  if (src) s.src = src;
  if (inline) s.text = inline;
  document.head.appendChild(s);
};

const clean = (v: string | undefined, pattern: RegExp) => (v && pattern.test(v.trim()) ? v.trim() : null);

const SiteTracking = () => {
  const { pathname } = useLocation();
  const [consent, setConsentState] = useState(getConsent);

  useEffect(() => onConsentChange(() => setConsentState(getConsent())), []);
  useEffect(() => installClickTracking(), []);
  useEffect(() => { track("page_view", { path: pathname }); }, [pathname]);

  const { data: ids } = useQuery({
    queryKey: ["tracking-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_settings").select("key, value")
        .in("key", ["tracking_meta_pixel_id", "tracking_ga4_id", "tracking_clarity_id"]);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!ids || /^\/(admin|login)/.test(pathname)) return;
    // identifiants validés : ils sont injectés dans du JavaScript
    const pixel = clean(ids.tracking_meta_pixel_id, /^\d{8,20}$/);
    const ga4 = clean(ids.tracking_ga4_id, /^G-[A-Z0-9]{4,15}$/);
    const clarity = clean(ids.tracking_clarity_id, /^[a-z0-9]{6,20}$/);

    if (pixel && consent.ads) {
      injectScript("meta-pixel", null, `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`);
    }
    if (ga4 && consent.stats) {
      injectScript("ga4-lib", `https://www.googletagmanager.com/gtag/js?id=${ga4}`);
      injectScript("ga4-init", null, `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4}',{anonymize_ip:true});`);
    }
    if (clarity && consent.stats) {
      injectScript("ms-clarity", null, `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${clarity}");`);
    }
  }, [ids, consent, pathname]);

  // page vue côté Meta (la première est envoyée à l'initialisation)
  useEffect(() => {
    const w = window as unknown as { fbq?: (...a: unknown[]) => void };
    if (w.fbq && loaded.has("meta-pixel")) w.fbq("track", "PageView");
  }, [pathname]);

  return null;
};

export default SiteTracking;
