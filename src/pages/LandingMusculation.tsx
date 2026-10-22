import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { thumbProps } from "@/lib/images";
import { track } from "@/lib/analytics";
import LeadForm, { LEAD_SENT_KEY } from "@/components/landing/LeadForm";
import DevisDrawer, { type DevisLine } from "@/components/landing/DevisDrawer";
import { formatMad } from "@/components/landing/contact";
import { CROSSED_PRICE_RATIO, STOCK_ITEMS, STOCK_OFFER } from "@/data/stock-landing";
import logoWhite from "@/assets/logo-new.png";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock, FileText, MapPin, Minus, Phone, Plus, X } from "lucide-react";
import "@/styles/landing.css";

/**
 * Landing page des campagnes : Musculation professionnelle (/lp/musculation).
 * Page autonome (sans menu du site), non indexée par Google.
 * On n'y montre QUE les machines du stock (src/data/stock-landing.ts), avec leur prix :
 *   prix affiché = prix unitaire HT de l'offre ; prix barré = +20 %.
 * Deux façons de nous contacter :
 *   1. le formulaire simple (nom, téléphone, email) : haut de page, pop-up, bas de page ;
 *   2. le devis : le visiteur ajoute des machines, choisit les quantités et envoie (n° DEV-…).
 * Les coordonnées saisies dans l'un pré-remplissent l'autre.
 */

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const POPUP_KEY = "impulse-lp-popup-vu";
const POPUP_DELAY_MS = 60_000;
const CART_KEY = "impulse-lp-devis";
const FEATURED_MAX = 12;
const FEATURED_ORDER = ["ECP", "IT95", "SL", "IFP", "ITF"];
const SECTION_PREVIEW = 8;

const read = (k: string, store: "local" | "session" = "local") => {
  try { return (store === "local" ? localStorage : sessionStorage).getItem(k); } catch { return null; }
};
const write = (k: string, v: string, store: "local" | "session" = "local") => {
  try { (store === "local" ? localStorage : sessionStorage).setItem(k, v); } catch { /* stockage indisponible */ }
};

const SUB_PITCH: Record<string, string> = {
  "multi-stations": "Plusieurs exercices sur une seule machine, pour optimiser l'espace.",
  "mono-stations": "Une machine par mouvement, guidage précis et confort de club.",
  "charges-libres": "Bancs et accessoires pour l'entraînement aux charges libres.",
  "charges-guidees": "Machines à disques et Smith machines, sûres et polyvalentes.",
};

interface StockProduct extends DevisLine { gamme: string; subSlug: string; subTitle: string; crossed: number; trending: boolean }

const useLandingData = () =>
  useQuery({
    queryKey: ["lp-musculation-stock"],
    queryFn: async () => {
      const [cats, subs, products, settings] = await Promise.all([
        supabase.from("equipment_categories").select("*").eq("slug", "musculation").eq("usage_type", "professionnel"),
        supabase.from("equipment_subcategories").select("*").eq("category_slug", "musculation").eq("usage_type", "professionnel").eq("is_active", true).order("sort_order"),
        supabase.from("products").select("*").eq("is_published", true).order("sort_order"),
        supabase.from("contact_settings").select("*"),
      ]);
      const s: Record<string, string> = {};
      ((settings.data || []) as Row[]).forEach((r) => { s[str(r.key)] = str(r.value); });
      return {
        cat: ((cats.data || []) as Row[])[0],
        subs: (subs.data || []) as Row[],
        products: (products.data || []) as Row[],
        settings: s,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

const LandingMusculation = () => {
  const { data, isLoading } = useLandingData();
  const [modal, setModal] = useState<{ open: boolean; interest?: string; auto?: boolean }>({ open: false });
  const [drawer, setDrawer] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try { return JSON.parse(read(CART_KEY) || "{}") as Record<string, number>; } catch { return {}; }
  });
  const [flash, setFlash] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [gammeFilter, setGammeFilter] = useState<Record<string, string>>({});
  const engaged = useRef(false);
  const sent = useRef(!!read(LEAD_SENT_KEY));
  const trackRef = useRef<HTMLDivElement>(null);

  const s = data?.settings || {};
  const phone = s.phone_1 || "";
  const subs = useMemo(() => data?.subs || [], [data]);
  const heroImg = str(data?.cat?.image_url) || str(subs[0]?.image_url);

  // machines du stock retrouvées sur le site (photo, nom, sous-catégorie)
  const stock = useMemo<StockProduct[]>(() => {
    if (!data) return [];
    const subByTitle = new Map(subs.map((x) => [str(x.title), x]));
    const out: StockProduct[] = [];
    for (const it of STOCK_ITEMS) {
      const re = new RegExp(`\\b${it.ref}\\b`);
      const p = data.products
        .filter((x) => re.test(str(x.name)))
        .sort((a, b) => Number(!b.image_url) - Number(!a.image_url))[0];
      if (!p) continue;
      const sub = subByTitle.get(str(p.subcategory));
      out.push({
        ref: it.ref, productId: str(p.id), name: str(p.name).replace(/\s+/g, " ").trim(), image: str(p.image_url),
        category: str(p.category) || "Musculation", pu: it.pu, qty: 0, gamme: str(p.range_code) || it.ref.replace(/\d.*/, ""),
        subSlug: sub ? str(sub.slug) : "autres", subTitle: sub ? str(sub.title) : "Autres machines",
        crossed: Math.round(it.pu * CROSSED_PRICE_RATIO), trending: !!p.is_trending,
      });
    }
    return out;
  }, [data, subs]);

  // sections = sous-catégories qui ont au moins une machine en stock (les autres sont masquées)
  const sections = useMemo(() => {
    const order = subs.map((x) => str(x.slug));
    const map = new Map<string, { slug: string; title: string; image: string; items: StockProduct[] }>();
    for (const p of stock) {
      if (!map.has(p.subSlug)) {
        const sub = subs.find((x) => str(x.slug) === p.subSlug);
        map.set(p.subSlug, { slug: p.subSlug, title: p.subTitle, image: str(sub?.image_url), items: [] });
      }
      map.get(p.subSlug)!.items.push(p);
    }
    return [...map.values()].sort((a, b) => (order.indexOf(a.slug) + 1 || 99) - (order.indexOf(b.slug) + 1 || 99));
  }, [stock, subs]);

  // produits phares : machines « tendance » de l'admin d'abord, puis une par gamme à tour de rôle
  const featured = useMemo(() => {
    const groups = FEATURED_ORDER.map((g) => stock.filter((p) => p.gamme === g).sort((a, b) => Number(b.trending) - Number(a.trending) || b.pu - a.pu));
    const out: StockProduct[] = [];
    for (let i = 0; out.length < FEATURED_MAX && groups.some((g) => i < g.length); i++) {
      for (const g of groups) if (g[i] && out.length < FEATURED_MAX) out.push(g[i]);
    }
    return out;
  }, [stock]);

  const lines = useMemo<DevisLine[]>(() => stock.filter((p) => cart[p.ref] > 0).map((p) => ({ ...p, qty: cart[p.ref] })), [stock, cart]);
  const cartCount = lines.reduce((n, l) => n + l.qty, 0);
  const cartTotal = lines.reduce((n, l) => n + l.qty * l.pu, 0);

  useEffect(() => { write(CART_KEY, JSON.stringify(cart)); }, [cart]);

  const setQty = useCallback((ref: string, qty: number) => {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[ref]; else next[ref] = Math.min(qty, 99);
      return next;
    });
  }, []);
  const add = (p: StockProduct) => {
    engaged.current = true;
    setQty(p.ref, (cart[p.ref] || 0) + 1);
    if (!cart[p.ref]) track("quote_add", { label: p.ref, product_id: p.productId });
    setFlash(p.name);
    window.setTimeout(() => setFlash((f) => (f === p.name ? "" : f)), 2600);
  };

  const openForm = useCallback((interest?: string, auto = false) => {
    if (auto && (sent.current || engaged.current)) return;
    if (auto) write(POPUP_KEY, "1", "session");
    setModal({ open: true, interest, auto });
  }, []);
  const closeModal = () => setModal({ open: false });
  const openDevis = () => { engaged.current = true; setModal({ open: false }); setDrawer(true); track("quote_open", { label: "landing" }); };
  const goToMachines = () => {
    setDrawer(false);
    setModal({ open: false });
    document.getElementById("machines")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // classe sur <body> : le bandeau cookies se place au-dessus de la barre fixe du téléphone
  useEffect(() => {
    document.body.classList.add("is-lp");
    return () => document.body.classList.remove("is-lp");
  }, []);

  // pop-up automatique : après 60 s, ou si la souris quitte la page (ordinateur) après 10 s ;
  // jamais si la personne a déjà envoyé une demande ou commencé un devis / un formulaire
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

  // fenêtres : Échap pour fermer, pas de défilement derrière
  const anyOverlay = modal.open || drawer;
  useEffect(() => {
    if (!anyOverlay) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setModal({ open: false }); setDrawer(false); } };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [anyOverlay]);

  const formProps = { onStarted: () => { engaged.current = true; }, onDone: () => { sent.current = true; }, onOpenDevis: openDevis };
  const slide = (dir: -1 | 1) => { const el = trackRef.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" }); };

  const renderPrice = (p: StockProduct) => (
    <span className="lp-price">
      <span className="lp-price-now">{formatMad(p.pu)}<small> HT</small></span>
      <s className="lp-price-old" aria-label={`Au lieu de ${formatMad(p.crossed)}`}>{formatMad(p.crossed)}</s>
    </span>
  );
  const renderAdd = (p: StockProduct) =>
    cart[p.ref] ? (
      <span className="lp-incart">
        <span className="lp-qty sm" role="group" aria-label={`Quantité ${p.name}`}>
          <button onClick={() => setQty(p.ref, cart[p.ref] - 1)} aria-label="Retirer une unité"><Minus /></button>
          <span>{cart[p.ref]}</span>
          <button onClick={() => setQty(p.ref, cart[p.ref] + 1)} aria-label="Ajouter une unité"><Plus /></button>
        </span>
        <button className="lp-incart-see" onClick={openDevis}><Check /> Dans le devis</button>
      </span>
    ) : (
      <button className="lp-btn lp-btn-dark lp-add" onClick={() => add(p)}><Plus /> Ajouter au devis</button>
    );
  const renderCard = (p: StockProduct) => (
    <article className="lp-card" key={p.ref}>
      <div className="lp-card-shot"><img {...thumbProps(p.image)} alt={p.name} loading="lazy" decoding="async" /></div>
      <div className="lp-card-body">
        <span className="lp-card-gamme">{p.gamme} · En stock</span>
        <h3 className="lp-card-name">{p.name}</h3>
        {renderPrice(p)}
        {renderAdd(p)}
      </div>
    </article>
  );

  return (
    <div className="lp">
      <Helmet>
        <title>Machines de musculation en stock | Impulse Fitness Maroc</title>
        <meta name="description" content="Machines de musculation professionnelles Impulse disponibles en stock au Maroc, avec prix. Composez votre devis en ligne. Livraison et installation partout au Maroc." />
        <meta name="robots" content="noindex, follow" />
        {heroImg && <link rel="preload" as="image" href={heroImg} />}
      </Helmet>

      {/* barre du haut */}
      <header className="lp-top">
        <div className="lp-wrap lp-top-in">
          <a href="/" className="lp-logo" aria-label="Impulse Fitness Maroc — site complet"><img src={logoWhite} alt="Impulse Fitness Maroc" width={150} height={34} /></a>
          <div className="lp-top-actions">
            {phone && <a className="lp-top-phone" href={`tel:${phone.replace(/\s/g, "")}`}><Phone /> <span>{phone}</span></a>}
            <button className={`lp-btn lp-btn-sm ${cartCount ? "lp-btn-red" : "lp-btn-outline"}`} onClick={openDevis}>
              <FileText /> Mon devis{cartCount ? ` (${cartCount})` : ""}
            </button>
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
            <h1>Machines de musculation <em>en stock au Maroc</em></h1>
            <p className="lp-lead">{stock.length || STOCK_ITEMS.length} machines professionnelles Impulse <strong>disponibles immédiatement, prix affichés</strong>. Composez votre devis en ligne en quelques clics, un conseiller vous rappelle sous 24 h.</p>
            <ul className="lp-ticks">
              <li><Check /> Stock disponible au Maroc</li>
              <li><Check /> Prix affichés, devis en ligne</li>
              <li><Check /> Livraison et installation partout au Maroc</li>
              <li><Check /> Showroom à Bouskoura</li>
            </ul>
            <div className="lp-hero-ctas">
              <button className="lp-btn lp-btn-red lp-btn-lg" onClick={goToMachines}>Préparer mon devis <ArrowRight /></button>
              <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => openForm()}>Être rappelé</button>
            </div>
          </div>
          <div className="lp-hero-form">
            <p className="lp-form-title">Être rappelé <span>sous 24 h ouvrées</span></p>
            <LeadForm idPrefix="haut" {...formProps} />
          </div>
        </div>
      </section>

      {/* 2. produits phares (machines du stock) */}
      {featured.length > 0 && (
        <section className="lp-sec lp-prods">
          <div className="lp-wrap">
            <div className="lp-head">
              <span className="lp-eyebrow dark">Produits phares</span>
              <h2>Les machines les plus demandées</h2>
              <p>En stock au Maroc. Ajoutez-les à votre devis, ajustez les quantités et envoyez : c'est gratuit et sans engagement.</p>
            </div>
            <div className="lp-carousel">
              <button className="lp-nav prev" onClick={() => slide(-1)} aria-label="Produits précédents"><ChevronLeft /></button>
              <div className="lp-prod-track" ref={trackRef}>
                {featured.map(renderCard)}
              </div>
              <button className="lp-nav next" onClick={() => slide(1)} aria-label="Produits suivants"><ChevronRight /></button>
            </div>
          </div>
        </section>
      )}

      {/* 3. le stock, par univers */}
      <section className="lp-sec lp-catalog" id="machines">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow dark">Tout le stock</span>
            <h2>Choisissez vos machines</h2>
            <p>Prix unitaires HT du stock disponible. Offre n° {STOCK_OFFER.numero}, valable jusqu'au {STOCK_OFFER.validite}.</p>
          </div>

          {isLoading && <p className="lp-loading">Chargement du stock…</p>}

          {sections.length > 1 && (
            <nav className="lp-univers" aria-label="Univers">
              {sections.map((sec) => (
                <a className="lp-uni" key={sec.slug} href={`#univers-${sec.slug}`} onClick={(e) => { e.preventDefault(); document.getElementById(`univers-${sec.slug}`)?.scrollIntoView({ behavior: "smooth" }); }}>
                  <span className="lp-uni-img">{sec.image && <img src={sec.image} alt="" loading="lazy" decoding="async" />}</span>
                  <span className="lp-uni-body">
                    <h3>{sec.title}</h3>
                    <span className="lp-uni-count">{sec.items.length} machine{sec.items.length > 1 ? "s" : ""} en stock</span>
                  </span>
                </a>
              ))}
            </nav>
          )}

          {sections.map((sec) => {
            const gammes = [...new Set(sec.items.map((p) => p.gamme))];
            const g = gammeFilter[sec.slug] || "";
            const list = g ? sec.items.filter((p) => p.gamme === g) : sec.items;
            const open = openSections[sec.slug] || list.length <= SECTION_PREVIEW + 2;
            const shown = open ? list : list.slice(0, SECTION_PREVIEW);
            return (
              <div className="lp-section" id={`univers-${sec.slug}`} key={sec.slug}>
                <div className="lp-section-head">
                  <div>
                    <h3>{sec.title}</h3>
                    {SUB_PITCH[sec.slug] && <p>{SUB_PITCH[sec.slug]}</p>}
                  </div>
                  {gammes.length > 1 && sec.items.length > SECTION_PREVIEW && (
                    <div className="lp-filter" role="group" aria-label={`Gammes ${sec.title}`}>
                      <button className={!g ? "on" : ""} aria-pressed={!g} onClick={() => setGammeFilter((f) => ({ ...f, [sec.slug]: "" }))}>Toutes ({sec.items.length})</button>
                      {gammes.map((x) => (
                        <button key={x} className={g === x ? "on" : ""} aria-pressed={g === x} onClick={() => setGammeFilter((f) => ({ ...f, [sec.slug]: x }))}>{x}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="lp-grid">{shown.map(renderCard)}</div>
                {!open && (
                  <div className="lp-center">
                    <button className="lp-btn lp-btn-outline-dark" onClick={() => setOpenSections((o) => ({ ...o, [sec.slug]: true }))}>
                      Voir les {list.length - SECTION_PREVIEW} autres machines
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. showroom */}
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

      {/* 5. formulaire de bas de page */}
      <section className="lp-sec lp-final" id="offre">
        <div className="lp-wrap lp-final-grid">
          <div className="lp-final-copy">
            <span className="lp-eyebrow dark">Parlons de votre salle</span>
            <h2>Profitez du stock disponible, contactez-nous aujourd'hui</h2>
            <p>Laissez vos coordonnées : un conseiller Impulse vous rappelle sous 24 h ouvrées. Vous préférez un devis chiffré ? Composez-le vous-même en quelques clics.</p>
            <div className="lp-final-alt">
              <button className="lp-btn lp-btn-dark" onClick={cartCount ? openDevis : goToMachines}><FileText /> {cartCount ? `Voir mon devis (${cartCount})` : "Préparer mon devis"}</button>
              {phone && <a href={`tel:${phone.replace(/\s/g, "")}`}><Phone /> {phone}</a>}
            </div>
          </div>
          <div className="lp-final-form"><LeadForm idPrefix="bas" {...formProps} /></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-sec lp-faq">
        <div className="lp-wrap lp-faq-in">
          <h2>Questions fréquentes</h2>
          <details><summary>Les prix affichés sont-ils HT ou TTC ?</summary><p>Les prix sont des prix unitaires hors taxes (HT), pour les machines du stock disponible. Votre conseiller vous confirme le devis final, avec la livraison et l'installation.</p></details>
          <details><summary>Les machines sont-elles vraiment disponibles ?</summary><p>Oui, toutes les machines de cette page sont en stock au Maroc. Les quantités étant limitées, votre conseiller confirme la disponibilité de chaque machine à la réception de votre devis.</p></details>
          <details><summary>Livrez-vous et installez-vous dans tout le Maroc ?</summary><p>Oui. Notre équipe technique assure la livraison et l'installation partout au Maroc, ainsi que le service après-vente avec un stock de pièces d'origine.</p></details>
          <details><summary>Puis-je voir les machines avant de commander ?</summary><p>Oui, au showroom de Bouskoura{s.hours_line_1 ? ` (${[s.hours_line_1, s.hours_line_2].filter(Boolean).join(", ")})` : ""}. Demandez une visite : un conseiller vous accueille.</p></details>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <span>© {new Date().getFullYear()} Impulse Fitness Maroc — distributeur officiel Impulse</span>
          <span><a href="/">Voir tout le catalogue</a> · <a href="/politique-de-confidentialite">Confidentialité</a></span>
        </div>
      </footer>

      {/* confirmation d'ajout */}
      {flash && !drawer && (
        <div className="lp-flash" role="status">
          <Check /> <span><strong>{flash}</strong> ajouté au devis</span>
          <button onClick={openDevis}>Voir le devis</button>
        </div>
      )}

      {/* barre fixe téléphone */}
      <div className="lp-sticky" aria-hidden={anyOverlay}>
        {cartCount ? (
          <button className="lp-btn lp-btn-red" onClick={openDevis}><FileText /> Mon devis ({cartCount}) · {formatMad(cartTotal)}</button>
        ) : (
          <button className="lp-btn lp-btn-red" onClick={goToMachines}>Préparer mon devis</button>
        )}
        <button className="lp-btn lp-btn-ghost" onClick={() => openForm()}>Être rappelé</button>
      </div>

      {/* fenêtre formulaire simple */}
      {modal.open && (
        <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lp-modal-title" onClick={closeModal}>
          <div className="lp-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="lp-modal-x" onClick={closeModal} aria-label="Fermer"><X /></button>
            <p className="lp-modal-kicker">{modal.auto ? "Avant de partir…" : modal.interest || "Être rappelé"}</p>
            <h2 id="lp-modal-title">Un conseiller vous rappelle sous 24 h</h2>
            <p className="lp-modal-sub">Laissez vos coordonnées. Vous pourrez aussi composer votre devis : elles y seront déjà remplies.</p>
            <LeadForm idPrefix="popup" interest={modal.interest} {...formProps} />
          </div>
        </div>
      )}

      {drawer && <DevisDrawer lines={lines} setQty={setQty} onClose={() => setDrawer(false)} onSent={() => { sent.current = true; setCart({}); }} onBrowse={goToMachines} />}
    </div>
  );
};

export default LandingMusculation;
