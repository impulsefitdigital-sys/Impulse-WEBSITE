import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { thumbProps } from "@/lib/images";
import LeadForm, { LEAD_SENT_KEY } from "@/components/landing/LeadForm";
import logoWhite from "@/assets/logo-new.png";
import { ArrowRight, Check, Clock, MapPin, MessageCircle, Phone, ShieldCheck, Truck, Wrench, X } from "lucide-react";
import "@/styles/landing.css";

/**
 * Landing page des campagnes : Musculation professionnelle (/lp/musculation).
 * Page autonome (sans menu du site), non indexée par Google.
 * Toutes les images et coordonnées viennent de l'admin (Catégories, Gammes, Coordonnées…),
 * donc une photo changée dans l'admin change aussi ici.
 * Formulaire : haut de page (ordinateur), pop-up (60 s ou intention de quitter), bas de page.
 */

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const POPUP_KEY = "impulse-lp-popup-vu";
const POPUP_DELAY_MS = 60_000;
// gammes à ne pas mettre en avant dans les campagnes (IT7 : gamme à retirer, notes d'Adil)
const HIDDEN_RANGES = new Set(["IT7"]);
const read = (k: string, store: "local" | "session" = "local") => {
  try { return (store === "local" ? localStorage : sessionStorage).getItem(k); } catch { return null; }
};
const write = (k: string, v: string, store: "local" | "session" = "local") => {
  try { (store === "local" ? localStorage : sessionStorage).setItem(k, v); } catch { /* stockage indisponible */ }
};

// mêmes textes que la page À propos (Admin → À propos, « Pourquoi le Maroc »), utilisés si la section est masquée
const DEFAULT_REASONS = [
  { title: "Conseil personnalisé", desc: "Un accompagnement adapté à votre projet, avec un showroom dédié à Bouskoura." },
  { title: "Large choix", desc: "Équipements professionnels et semi-professionnels disponibles." },
  { title: "Installation et SAV", desc: "Une équipe technique qualifiée pour la livraison, l'installation et le service après-vente, avec un stock permanent de pièces d'origine." },
];

const SUB_PITCH: Record<string, string> = {
  "multi-stations": "Plusieurs exercices sur une seule machine : idéal pour optimiser l'espace.",
  "mono-stations": "Une machine par groupe musculaire, guidage précis et confort de club.",
  "charges-libres": "Racks, bancs, cages et accessoires pour l'entraînement libre.",
  "charges-guidees": "Smith machines et appareils à charge guidée, sûrs et polyvalents.",
};

const useLandingData = () =>
  useQuery({
    queryKey: ["lp-musculation"],
    queryFn: async () => {
      const [cats, subs, ranges, products, settings, about, reals] = await Promise.all([
        supabase.from("equipment_categories").select("*").eq("slug", "musculation").eq("usage_type", "professionnel"),
        supabase.from("equipment_subcategories").select("*").eq("category_slug", "musculation").eq("usage_type", "professionnel").eq("is_active", true).order("sort_order"),
        supabase.from("product_ranges").select("*").eq("category", "musculation").eq("usage_type", "professionnel").eq("is_active", true).order("sort_order"),
        supabase.from("products").select("*").eq("is_published", true).order("sort_order"),
        supabase.from("contact_settings").select("*"),
        supabase.from("about_sections").select("*"),
        supabase.from("realisations").select("*").eq("is_active", true).order("sort_order"),
      ]);
      const s: Record<string, string> = {};
      ((settings.data || []) as Row[]).forEach((r) => { s[str(r.key)] = str(r.value); });
      const aboutMap: Record<string, string> = {};
      ((about.data || []) as Row[]).forEach((r) => { aboutMap[str(r.key)] = str(r.content); });
      return {
        cat: ((cats.data || []) as Row[])[0],
        subs: (subs.data || []) as Row[],
        ranges: (ranges.data || []) as Row[],
        products: (products.data || []) as Row[],
        settings: s,
        about: aboutMap,
        reals: (reals.data || []) as Row[],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

const LandingMusculation = () => {
  const { data } = useLandingData();
  const [modal, setModal] = useState<{ open: boolean; interest?: string; auto?: boolean }>({ open: false });
  const formStarted = useRef(false);
  const sent = useRef(!!read(LEAD_SENT_KEY));

  const s = data?.settings || {};
  const wa = (s.whatsapp_number || "").replace(/\D/g, "");
  const phone = s.phone_1 || "";
  const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent("Bonjour, je souhaite une offre pour équiper ma salle de musculation.")}` : "";

  const subs = data?.subs || [];
  const heroImg = str(data?.cat?.image_url) || str(subs[0]?.image_url);

  // gammes de musculation pro qui ont des produits publiés, la plus fournie d'abord
  const ranges = useMemo(() => {
    if (!data) return [];
    const subTitles = new Set(subs.map((x) => str(x.title)));
    const seen = new Map<string, { code: string; label: string; image: string; count: number; desc: string }>();
    for (const r of data.ranges) {
      const code = str(r.code);
      if (seen.has(code) || HIDDEN_RANGES.has(code)) continue;
      const prods = data.products.filter((p) => p.range_code === code && p.category === "Musculation" && (p.usage_type === "professionnel" || p.usage_type === "both") && subTitles.has(str(p.subcategory)));
      if (!prods.length) continue;
      seen.set(code, { code, label: str(r.label), desc: str(r.description), image: str(r.image_url) || str(prods[0].image_url), count: prods.length });
    }
    return [...seen.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [data, subs]);

  const stats = useMemo(() => (data?.about.chiffres_cles || "").split("\n").map((l) => l.split("|")).filter((p) => p.length === 3).slice(0, 4), [data]);
  const reasons = useMemo(() => {
    try {
      const fromAdmin = (JSON.parse(data?.about.why_maroc_cards || "[]") as { title: string; desc: string }[]).slice(0, 3);
      if (fromAdmin.length) return fromAdmin;
    } catch { /* texte de l'admin illisible : textes par défaut */ }
    return DEFAULT_REASONS;
  }, [data]);
  const clients = (data?.reals || []).map((r) => ({ name: str(r.title).trim(), city: str(r.location || r.city).trim() })).filter((c) => c.name);

  const openForm = useCallback((interest?: string, auto = false) => {
    if (auto && (sent.current || formStarted.current)) return;
    if (auto) write(POPUP_KEY, "1", "session");
    setModal({ open: true, interest, auto });
  }, []);
  const close = () => setModal({ open: false });

  // classe sur <body> : le bandeau cookies se place au-dessus de la barre fixe du téléphone
  useEffect(() => {
    document.body.classList.add("is-lp");
    return () => document.body.classList.remove("is-lp");
  }, []);

  // pop-up automatique : après 60 s, ou si la souris quitte la page (ordinateur) après 10 s
  useEffect(() => {
    if (sent.current || read(POPUP_KEY, "session")) return;
    const t0 = Date.now();
    const timer = window.setTimeout(() => openForm(undefined, true), POPUP_DELAY_MS);
    const fine = window.matchMedia?.("(pointer: fine)").matches;
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0 && Date.now() - t0 > 10_000 && !read(POPUP_KEY, "session")) openForm(undefined, true);
    };
    if (fine) document.addEventListener("mouseout", onLeave);
    return () => { window.clearTimeout(timer); document.removeEventListener("mouseout", onLeave); };
  }, [openForm]);

  // fenêtre : Échap pour fermer, pas de défilement derrière
  useEffect(() => {
    if (!modal.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [modal.open]);

  const markStarted = () => { formStarted.current = true; };
  const markSent = () => { sent.current = true; };
  const formProps = { whatsappNumber: wa, onStarted: markStarted, onDone: markSent };

  return (
    <div className="lp">
      <Helmet>
        <title>Équipez votre salle de musculation | Impulse Fitness Maroc</title>
        <meta name="description" content="Machines de musculation professionnelles Impulse disponibles en stock au Maroc. Livraison et installation partout au Maroc, rappel sous 24 h. Showroom à Bouskoura." />
        <meta name="robots" content="noindex, follow" />
        {heroImg && <link rel="preload" as="image" href={heroImg} />}
      </Helmet>

      {/* barre du haut */}
      <header className="lp-top">
        <div className="lp-wrap lp-top-in">
          <a href="/" className="lp-logo" aria-label="Impulse Fitness Maroc — site complet"><img src={logoWhite} alt="Impulse Fitness Maroc" width={150} height={34} /></a>
          <div className="lp-top-actions">
            {phone && <a className="lp-top-phone" href={`tel:${phone.replace(/\s/g, "")}`}><Phone /> <span>{phone}</span></a>}
            <button className="lp-btn lp-btn-red lp-btn-sm" onClick={() => openForm()}>Être rappelé</button>
          </div>
        </div>
      </header>

      {/* 1. haut de page */}
      <section className="lp-hero">
        {heroImg && <img className="lp-hero-bg" src={heroImg} alt="" aria-hidden="true" {...({ fetchpriority: "high" } as Record<string, string>)} />}
        <div className="lp-hero-scrim" />
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">Distributeur officiel Impulse au Maroc</span>
            <h1>Équipez votre salle de musculation <em>avec Impulse</em></h1>
            <p className="lp-lead">Machines professionnelles <strong>disponibles en stock au Maroc</strong>. Un conseiller vous rappelle sous 24 h avec une offre adaptée à votre espace.</p>
            <ul className="lp-ticks">
              <li><Check /> Stock disponible au Maroc</li>
              <li><Check /> Livraison et installation partout au Maroc</li>
              <li><Check /> Showroom à Bouskoura</li>
              <li><Check /> SAV et pièces d'origine</li>
            </ul>
            <div className="lp-hero-ctas">
              <button className="lp-btn lp-btn-red lp-btn-lg" onClick={() => openForm()}>Recevoir mon offre <ArrowRight /></button>
              {waLink && <a className="lp-btn lp-btn-wa lp-btn-lg" href={waLink} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a>}
            </div>
          </div>
          <div className="lp-hero-form" id="offre-haut">
            <p className="lp-form-title">Recevez votre offre <span>en 30 secondes</span></p>
            <LeadForm idPrefix="haut" {...formProps} compact />
          </div>
        </div>
      </section>

      {/* bande de promesses */}
      <div className="lp-band">
        <div className="lp-wrap lp-band-in">
          <span><Clock /> Rappel sous 24 h</span>
          <span><Truck /> Livraison partout au Maroc</span>
          <span><Wrench /> Installation par nos techniciens</span>
          <span><ShieldCheck /> Distributeur officiel</span>
        </div>
      </div>

      {/* 2. chiffres */}
      {stats.length > 0 && (
        <section className="lp-stats">
          <div className="lp-wrap lp-stats-in">
            {stats.map(([pre, num, lbl]) => (
              <div key={lbl} className="lp-stat"><strong>{pre}{num}</strong><span>{lbl}</span></div>
            ))}
          </div>
        </section>
      )}

      {/* 3. univers */}
      <section className="lp-sec">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow dark">Musculation professionnelle</span>
            <h2>Tout pour équiper votre salle</h2>
            <p>De la petite salle d'hôtel au grand club, choisissez votre univers : on vous conseille le bon mix de machines.</p>
          </div>
          <div className="lp-univers">
            {(subs.length ? subs : Array.from({ length: 4 }, () => ({} as Row))).map((sub, i) => (
              <article className="lp-uni" key={str(sub.id) || i}>
                <div className="lp-uni-img">{str(sub.image_url) && <img src={str(sub.image_url)} alt={str(sub.title)} loading="lazy" decoding="async" />}</div>
                <div className="lp-uni-body">
                  <h3>{str(sub.title) || " "}</h3>
                  <p>{SUB_PITCH[str(sub.slug)] || ""}</p>
                  <button className="lp-link" onClick={() => openForm(str(sub.title))}>Demander un devis <ArrowRight /></button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. gammes */}
      {ranges.length > 0 && (
        <section className="lp-sec lp-sec-alt">
          <div className="lp-wrap">
            <div className="lp-head">
              <span className="lp-eyebrow dark">Les gammes Impulse</span>
              <h2>{ranges.length} gammes, plus de {Math.floor(ranges.reduce((n, r) => n + r.count, 0) / 10) * 10} machines</h2>
              <p>Faites défiler et demandez l'offre de la gamme qui vous intéresse.</p>
            </div>
          </div>
          <div className="lp-ranges" role="list">
            {ranges.map((r) => (
              <div className="lp-range" role="listitem" key={r.code}>
                <div className="lp-range-img"><img {...thumbProps(r.image)} alt={`Gamme ${r.code}`} loading="lazy" decoding="async" /></div>
                <div className="lp-range-body">
                  <h3>{r.code}</h3>
                  <p>{r.label || r.desc || `${r.count} machine${r.count > 1 ? "s" : ""}`}</p>
                  <button className="lp-link" onClick={() => openForm(`Gamme ${r.code}`)}>Offre gamme {r.code} <ArrowRight /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. étapes */}
      <section className="lp-sec">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow dark">Comment ça marche</span>
            <h2>Votre salle équipée en 3 étapes</h2>
          </div>
          <ol className="lp-steps">
            <li><span className="lp-step-n">1</span><h3>Décrivez votre projet</h3><p>Type d'espace et surface en 2 clics, puis vos coordonnées. 30 secondes suffisent.</p></li>
            <li><span className="lp-step-n">2</span><h3>Un conseiller vous rappelle</h3><p>Sous 24 h ouvrées, avec une sélection de machines adaptée à votre espace et à votre budget.</p></li>
            <li><span className="lp-step-n">3</span><h3>Livraison et installation</h3><p>Partout au Maroc, par notre équipe technique. SAV et pièces d'origine sur place.</p></li>
          </ol>
          <div className="lp-center"><button className="lp-btn lp-btn-red lp-btn-lg" onClick={() => openForm()}>Je décris mon projet <ArrowRight /></button></div>
        </div>
      </section>

      {/* 6. pourquoi + références */}
      {(reasons.length > 0 || clients.length > 0) && (
        <section className="lp-sec lp-sec-alt">
          <div className="lp-wrap">
            {reasons.length > 0 && (
              <>
                <div className="lp-head">
                  <span className="lp-eyebrow dark">Pourquoi Impulse Fitness Maroc</span>
                  <h2>Un interlocuteur au Maroc, de l'offre au SAV</h2>
                </div>
                <div className="lp-reasons">
                  {reasons.map((r) => <div className="lp-reason" key={r.title}><h3>{r.title}</h3><p>{r.desc}</p></div>)}
                </div>
              </>
            )}
            {clients.length > 0 && (
              <div className="lp-clients">
                <p>Ils ont équipé leur salle avec Impulse</p>
                <ul>{clients.map((c) => <li key={c.name}><strong>{c.name}</strong>{c.city && <span>{c.city}</span>}</li>)}</ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 7. showroom */}
      <section className="lp-showroom">
        <div className="lp-wrap lp-showroom-in">
          <div>
            <span className="lp-eyebrow">Showroom</span>
            <h2>Venez tester les machines avant d'acheter</h2>
            <p className="lp-show-addr"><MapPin /> {s.address_line_1 || s.address || "Centre commercial OLINO, Bouskoura"}{s.address_line_2 ? `, ${s.address_line_2}` : ""}</p>
            {(s.hours_line_1 || s.hours_line_2) && <p className="lp-show-hours"><Clock /> {[s.hours_line_1, s.hours_line_2].filter(Boolean).join(" · ")}</p>}
          </div>
          <div className="lp-show-ctas">
            <button className="lp-btn lp-btn-red lp-btn-lg" onClick={() => openForm("Visite du showroom")}>Planifier une visite <ArrowRight /></button>
            <a className="lp-btn lp-btn-ghost lp-btn-lg" href="https://www.google.com/maps/search/?api=1&query=IMPULSE+MAROC+Bouskoura" target="_blank" rel="noopener noreferrer"><MapPin /> Itinéraire</a>
          </div>
        </div>
      </section>

      {/* 8. formulaire de bas de page */}
      <section className="lp-sec lp-final" id="offre">
        <div className="lp-wrap lp-final-grid">
          <div className="lp-final-copy">
            <span className="lp-eyebrow dark">Votre offre personnalisée</span>
            <h2>Profitez du stock disponible, demandez votre offre aujourd'hui</h2>
            <p>Dites-nous en 2 clics quel espace vous équipez. Un conseiller Impulse vous rappelle sous 24 h ouvrées avec une proposition adaptée.</p>
            <div className="lp-final-alt">
              {phone && <a href={`tel:${phone.replace(/\s/g, "")}`}><Phone /> {phone}</a>}
              {waLink && <a href={waLink} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a>}
            </div>
          </div>
          <div className="lp-final-form"><LeadForm idPrefix="bas" {...formProps} /></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-sec lp-faq">
        <div className="lp-wrap lp-faq-in">
          <h2>Questions fréquentes</h2>
          <details><summary>Les machines sont-elles disponibles rapidement ?</summary><p>La gamme de musculation professionnelle est disponible en stock au Maroc. Votre conseiller vous confirme la disponibilité de chaque machine lors de son appel.</p></details>
          <details><summary>Livrez-vous et installez-vous dans tout le Maroc ?</summary><p>Oui. Notre équipe technique assure la livraison et l'installation partout au Maroc, ainsi que le service après-vente avec un stock de pièces d'origine.</p></details>
          <details><summary>Puis-je voir les machines avant de commander ?</summary><p>Oui, au showroom de Bouskoura{s.hours_line_1 ? ` (${[s.hours_line_1, s.hours_line_2].filter(Boolean).join(", ")})` : ""}. Demandez une visite : un conseiller vous accueille.</p></details>
          <details><summary>Je ne connais pas encore la surface exacte, est-ce un problème ?</summary><p>Pas du tout : choisissez « Je ne sais pas encore ». Le conseiller vous aide à définir l'implantation lors de l'appel.</p></details>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <span>© {new Date().getFullYear()} Impulse Fitness Maroc — distributeur officiel Impulse</span>
          <span><a href="/">Voir tout le catalogue</a> · <a href="/politique-de-confidentialite">Confidentialité</a></span>
        </div>
      </footer>

      {/* barre fixe téléphone */}
      <div className="lp-sticky" aria-hidden={modal.open}>
        <button className="lp-btn lp-btn-red" onClick={() => openForm()}>Recevoir mon offre</button>
        {waLink && <a className="lp-btn lp-btn-wa" href={waLink} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle /></a>}
      </div>

      {/* fenêtre formulaire */}
      {modal.open && (
        <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lp-modal-title" onClick={close}>
          <div className="lp-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="lp-modal-x" onClick={close} aria-label="Fermer"><X /></button>
            <p className="lp-modal-kicker">{modal.auto ? "Avant de partir…" : modal.interest || "Offre personnalisée"}</p>
            <h2 id="lp-modal-title">{modal.auto ? "Recevez votre offre Impulse en 30 secondes" : "Recevez votre offre en 30 secondes"}</h2>
            <p className="lp-modal-sub">Un conseiller vous rappelle sous 24 h ouvrées. Livraison et installation partout au Maroc.</p>
            <LeadForm idPrefix="popup" interest={modal.interest} {...formProps} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingMusculation;
