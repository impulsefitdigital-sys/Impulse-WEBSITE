import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { thumbProps } from "@/lib/images";
import { track } from "@/lib/analytics";
import LeadForm, { LEAD_SENT_KEY } from "@/components/landing/LeadForm";
import DevisDrawer, { type DevisLine } from "@/components/landing/DevisDrawer";
import { formatMad } from "@/components/landing/contact";
import ProductDetailView from "@/components/ProductDetailView";
import { CROSSED_PRICE_RATIO, STOCK_ITEMS } from "@/data/stock-landing";
import logoWhite from "@/assets/logo-new.png";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Clock, FileText, MapPin, Minus, Phone, Plus, X } from "lucide-react";
import "@/styles/landing.css";

/**
 * Landing page des campagnes : Musculation professionnelle (/lp/musculation).
 * Une « petite partie du site » qui ne montre QUE les machines du stock (src/data/stock-landing.ts),
 * avec le même design que le site : cartes gamme (affiche de la gamme, gérée dans l'admin),
 * cartes produit, et fiche produit complète sur /lp/musculation/:id (photos, couleurs, description…).
 *   prix affiché = prix unitaire HT de l'offre ; prix barré = +20 %.
 * Deux façons de nous contacter :
 *   1. le formulaire simple (nom, téléphone, email) : haut de page, pop-up, bas de page ;
 *   2. le devis : le visiteur ajoute des machines, choisit les quantités et envoie (n° DEV-…).
 * Les coordonnées saisies dans l'un pré-remplissent l'autre. Page non indexée par Google.
 */

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const BASE = "/lp/musculation";
const POPUP_KEY = "impulse-lp-popup-vu";
const POPUP_DELAY_MS = 60_000;
const CART_KEY = "impulse-lp-devis";
const FEATURED_MAX = 12;
/** ordre des gammes sur la page (les gammes absentes de cette liste passent à la fin) */
const GAMME_ORDER = ["IT95", "ECP", "SL", "IFP", "ITF"];

const gammeHref = (code: string) => `${BASE}/gamme/${code.toLowerCase()}`;

const read = (k: string, store: "local" | "session" = "local") => {
  try { return (store === "local" ? localStorage : sessionStorage).getItem(k); } catch { return null; }
};
const write = (k: string, v: string, store: "local" | "session" = "local") => {
  try { (store === "local" ? localStorage : sessionStorage).setItem(k, v); } catch { /* stockage indisponible */ }
};

interface StockProduct extends DevisLine { gamme: string; hover: string; subTitle: string; crossed: number; trending: boolean; order: number }
interface Gamme { code: string; label: string; description: string; poster: string; subTitles: string[]; items: StockProduct[] }

const useLandingData = () =>
  useQuery({
    queryKey: ["lp-musculation-stock"],
    queryFn: async () => {
      const [cats, products, ranges, settings] = await Promise.all([
        supabase.from("equipment_categories").select("*").eq("slug", "musculation").eq("usage_type", "professionnel"),
        supabase.from("products").select("*").eq("is_published", true).order("sort_order"),
        supabase.from("product_ranges").select("*").eq("is_active", true).eq("category", "musculation").order("sort_order"),
        supabase.from("contact_settings").select("*"),
      ]);
      const s: Record<string, string> = {};
      ((settings.data || []) as Row[]).forEach((r) => { s[str(r.key)] = str(r.value); });
      return {
        cat: ((cats.data || []) as Row[])[0],
        products: (products.data || []) as Row[],
        ranges: (ranges.data || []) as Row[],
        settings: s,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

const LandingMusculation = () => {
  const { id, gamme: gammeParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading } = useLandingData();
  const [modal, setModal] = useState<{ open: boolean; interest?: string; auto?: boolean }>({ open: false });
  const [drawer, setDrawer] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try { return JSON.parse(read(CART_KEY) || "{}") as Record<string, number>; } catch { return {}; }
  });
  const [flash, setFlash] = useState("");
  // un devis déjà commencé compte comme un engagement : pas de pop-up automatique
  const engaged = useRef(Object.keys(cart).length > 0);
  const sent = useRef(!!read(LEAD_SENT_KEY));
  const trackRef = useRef<HTMLDivElement>(null);

  const s = data?.settings || {};
  const phone = s.phone_1 || "";
  const heroImg = str(data?.cat?.image_url);

  // machines du stock retrouvées sur le site (photos, nom, gamme), dans l'ordre du catalogue
  const stock = useMemo<StockProduct[]>(() => {
    if (!data) return [];
    const out: StockProduct[] = [];
    for (const it of STOCK_ITEMS) {
      const re = new RegExp(`\\b${it.ref}\\b`);
      const p = data.products
        .filter((x) => re.test(str(x.name)))
        .sort((a, b) => Number(!b.image_url) - Number(!a.image_url))[0];
      if (!p) continue;
      out.push({
        ref: it.ref, productId: str(p.id), name: str(p.name).replace(/\s+/g, " ").trim(), image: str(p.image_url), hover: str(p.hover_image_url),
        category: str(p.category) || "Musculation", pu: it.pu, qty: 0, gamme: str(p.range_code) || it.ref.replace(/\d.*/, ""),
        subTitle: str(p.subcategory), crossed: Math.round(it.pu * CROSSED_PRICE_RATIO), trending: !!p.is_trending,
        order: data.products.indexOf(p),
      });
    }
    return out.sort((a, b) => a.order - b.order);
  }, [data]);
  const byId = useMemo(() => new Map(stock.map((p) => [p.productId, p])), [stock]);
  const stockIds = useMemo(() => stock.map((p) => p.productId), [stock]);

  // une section par gamme, avec l'affiche de la gamme (Admin → Gammes) ou, à défaut, la photo d'une machine
  const gammes = useMemo<Gamme[]>(() => {
    const map = new Map<string, Gamme>();
    for (const p of stock) {
      if (!map.has(p.gamme)) {
        const rows = (data?.ranges || []).filter((r) => str(r.code) === p.gamme && (str(r.usage_type) === "professionnel" || str(r.usage_type) === "both"));
        const pick = (k: string) => rows.map((r) => str(r[k]).trim()).find(Boolean) || "";
        map.set(p.gamme, { code: p.gamme, label: pick("label"), description: pick("description"), poster: pick("image_url"), subTitles: [], items: [] });
      }
      const g = map.get(p.gamme)!;
      g.items.push(p);
      if (p.subTitle && !g.subTitles.includes(p.subTitle)) g.subTitles.push(p.subTitle);
    }
    const rank = (c: string) => (GAMME_ORDER.indexOf(c) + 1) || 99;
    return [...map.values()]
      .map((g) => ({ ...g, poster: g.poster || g.items.find((p) => p.image)?.image || "" }))
      .sort((a, b) => rank(a.code) - rank(b.code));
  }, [stock, data]);

  // produits phares : machines « tendance » de l'admin d'abord, puis une par gamme à tour de rôle
  const featured = useMemo(() => {
    const groups = gammes.map((g) => [...g.items].sort((a, b) => Number(b.trending) - Number(a.trending) || b.pu - a.pu));
    const out: StockProduct[] = [];
    for (let i = 0; out.length < FEATURED_MAX && groups.some((g) => i < g.length); i++) {
      for (const g of groups) if (g[i] && out.length < FEATURED_MAX) out.push(g[i]);
    }
    return out;
  }, [gammes]);

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
    if (id || gammeParam) { navigate(`${BASE}#machines`); return; }
    document.getElementById("machines")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // retour d'une fiche produit (#machine-REF sur la page de la gamme) ou lien direct (#machines) : on se replace au bon endroit
  useEffect(() => {
    if (id || !stock.length) return;
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    const t = window.setTimeout(() => document.getElementById(h)?.scrollIntoView({ block: h.startsWith("machine-") ? "center" : "start" }), 80);
    return () => window.clearTimeout(t);
  }, [id, gammeParam, location.key, location.hash, stock]);

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
          <button onClick={() => setQty(p.ref, cart[p.ref] - 1)} aria-label="Retirer une unité">{cart[p.ref] > 1 ? <Minus /> : <X />}</button>
          <span>{cart[p.ref]}</span>
          <button onClick={() => setQty(p.ref, cart[p.ref] + 1)} aria-label="Ajouter une unité"><Plus /></button>
        </span>
        <button className="lp-incart-see" onClick={openDevis}><Check /> Dans le devis</button>
      </span>
    ) : (
      <button className="lp-btn lp-btn-dark lp-add" onClick={() => add(p)}><Plus /> Ajouter au devis</button>
    );
  // carte produit du site (photo + photo au survol, bouton devis rond), avec le prix du stock en plus
  const renderCard = (p: StockProduct, anchor = false) => {
    const href = `${BASE}/${p.productId}`;
    const inCart = !!cart[p.ref];
    return (
      <div className="product-card lp-pcard" key={p.ref} id={anchor ? `machine-${p.ref}` : undefined}>
        <a href={href} className="product-shot" aria-label={p.name}>
          <span className="product-tag"><span>{p.gamme}</span></span>
          <img className="p-main" {...thumbProps(p.image)} alt={p.name} loading="lazy" decoding="async" />
          {p.hover && <img className="p-hover" {...thumbProps(p.hover)} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
        </a>
        <button
          className={`p-quote${inCart ? " in" : ""}`}
          title={inCart ? "Dans le devis : voir le devis" : "Ajouter au devis"}
          aria-label={inCart ? "Dans le devis : voir le devis" : "Ajouter au devis"}
          onClick={() => (inCart ? openDevis() : add(p))}
        >
          {inCart ? <Check /> : <FileText />}
        </button>
        <a href={href} className="product-body">
          <span className="p-cat">{p.subTitle || p.category}</span>
          <h3>{p.name}</h3>
          {renderPrice(p)}
          <span className="product-see">Voir la fiche <ArrowRight /></span>
        </a>
        <div className="lp-pcard-foot">{renderAdd(p)}</div>
      </div>
    );
  };

  const header = (
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
  );

  const finalForm = (
    <section className="lp-sec lp-final" id="offre">
      <div className="lp-wrap lp-final-grid">
        <div className="lp-final-copy">
          <span className="lp-eyebrow dark">Parlons de votre salle</span>
          <h2>Équipez votre salle, contactez-nous aujourd'hui</h2>
          <p>Laissez vos coordonnées : un conseiller Impulse vous rappelle sous 24 h ouvrées. Vous préférez un devis chiffré ? Composez-le vous-même en quelques clics.</p>
          <div className="lp-final-alt">
            <button className="lp-btn lp-btn-dark" onClick={cartCount ? openDevis : goToMachines}><FileText /> {cartCount ? `Voir mon devis (${cartCount})` : "Préparer mon devis"}</button>
            {phone && <a href={`tel:${phone.replace(/\s/g, "")}`}><Phone /> {phone}</a>}
          </div>
        </div>
        <div className="lp-final-form"><LeadForm idPrefix="bas" {...formProps} /></div>
      </div>
    </section>
  );

  const current = id ? byId.get(id) : undefined;
  const activeGamme = gammeParam ? gammes.find((g) => g.code.toLowerCase() === gammeParam.toLowerCase()) : undefined;

  return (
    <div className="lp">
      <Helmet>
        <title>Machines de musculation professionnelles | Impulse Fitness Maroc</title>
        <meta name="description" content="Machines de musculation professionnelles Impulse disponibles au Maroc, avec prix. Composez votre devis en ligne. Livraison et installation partout au Maroc." />
        <meta name="robots" content="noindex, follow" />
        {activeGamme && <title>{`Gamme ${activeGamme.code} | Impulse Fitness Maroc`}</title>}
        {!id && !gammeParam && heroImg && <link rel="preload" as="image" href={heroImg} />}
      </Helmet>

      {header}

      {id ? (
        /* ------------------------------------------------ fiche produit (même affichage que le site) */
        <div className="imp lp-imp lp-pd">
          <ProductDetailView
            id={id}
            backLabel={current ? `Retour à la gamme ${current.gamme}` : "Retour aux gammes"}
            onBack={() => navigate(current ? `${gammeHref(current.gamme)}#machine-${current.ref}` : `${BASE}#machines`)}
            relatedIds={stockIds.length ? stockIds : undefined}
            relatedHref={(rid) => `${BASE}/${rid}`}
            relatedTitle="Autres machines de la gamme"
            renderHead={(product) => <Helmet><title>{`${product.name} | Impulse Fitness Maroc`}</title></Helmet>}
            renderBelowTitle={() => current && (
              <div className="lp-pd-price">
                <span className="lp-pd-stock"><Check /> Disponible au Maroc</span>
                {renderPrice(current)}
                <span className="lp-pd-note">Prix unitaire HT</span>
              </div>
            )}
            renderActions={(product) => {
              if (!data) return null;
              if (!current) {
                return (
                  <div className="pd-actions">
                    <button className="pd-add" onClick={() => openForm(product.name)}><span><Phone /> Être rappelé</span></button>
                    <a className="btn btn-ghost" href={`${BASE}#machines`}><span>Voir les machines</span></a>
                  </div>
                );
              }
              const q = cart[current.ref] || 0;
              return (
                <div className="pd-actions lp-pd-actions">
                  {q ? (
                    <>
                      <span className="lp-qty" role="group" aria-label={`Quantité ${current.name}`}>
                        <button onClick={() => setQty(current.ref, q - 1)} aria-label="Retirer une unité">{q > 1 ? <Minus /> : <X />}</button>
                        <span aria-live="polite">{q}</span>
                        <button onClick={() => setQty(current.ref, q + 1)} aria-label="Ajouter une unité"><Plus /></button>
                      </span>
                      <button className="pd-add in" onClick={openDevis}><span><Check /> Voir mon devis ({cartCount})</span></button>
                    </>
                  ) : (
                    <button className="pd-add" onClick={() => add(current)}><span><FileText /> Ajouter au devis</span></button>
                  )}
                  <button className="btn btn-ghost" onClick={() => openForm(current.name)}><span><Phone /> Être rappelé</span></button>
                </div>
              );
            }}
            notFound={
              <div className="lp-pd-missing">
                <p>Cette machine n'est plus affichée.</p>
                <a className="lp-btn lp-btn-red" href={`${BASE}#machines`}>Voir les machines <ArrowRight /></a>
              </div>
            }
          />
        </div>
      ) : gammeParam ? (
        /* ------------------------------------------------ page d'une gamme : ses machines en stock */
        <section className="lp-sec lp-catalog lp-gamme-page">
          <div className="lp-wrap imp lp-imp">
            <a className="lp-back" href={`${BASE}#machines`}><ArrowLeft /> Toutes les gammes</a>
            {isLoading ? (
              <p className="lp-loading">Chargement des machines…</p>
            ) : !activeGamme ? (
              <div className="lp-pd-missing">
                <p>Cette gamme n'est pas présentée ici.</p>
                <a className="lp-btn lp-btn-red" href={`${BASE}#machines`}>Voir les gammes <ArrowRight /></a>
              </div>
            ) : (
              <>
                <div className="lp-gamme-head">
                  <span className="pd-tag"><span>{activeGamme.code}</span></span>
                  <div>
                    <h1>Gamme {activeGamme.code}{activeGamme.label && <small> · {activeGamme.label}</small>}</h1>
                    <p>{activeGamme.items.length} machine{activeGamme.items.length > 1 ? "s" : ""}{activeGamme.subTitles.length ? ` · ${activeGamme.subTitles.join(", ")}` : ""} · prix unitaires HT</p>
                  </div>
                </div>
                {activeGamme.description && <p className="lp-gamme-desc">{activeGamme.description}</p>}
                {gammes.length > 1 && (
                  <nav className="lp-gtabs" aria-label="Autres gammes">
                    {gammes.map((g) => (
                      <a key={g.code} href={gammeHref(g.code)} className={g.code === activeGamme.code ? "on" : ""} aria-current={g.code === activeGamme.code ? "page" : undefined}>
                        {g.code}<span>{g.items.length}</span>
                      </a>
                    ))}
                  </nav>
                )}
                <div className="product-grid">{activeGamme.items.map((p) => renderCard(p, true))}</div>
              </>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* 1. haut de page */}
          <section className="lp-hero">
            {heroImg && <img className="lp-hero-bg" src={heroImg} alt="" aria-hidden="true" {...({ fetchpriority: "high" } as Record<string, string>)} />}
            <div className="lp-hero-scrim" />
            <div className="lp-wrap lp-hero-grid">
              <div className="lp-hero-copy">
                <span className="lp-eyebrow">Distributeur officiel Impulse au Maroc</span>
                <h1>Machines de musculation <em>en stock au Maroc</em></h1>
                <p className="lp-lead">Machines professionnelles Impulse <strong>disponibles immédiatement, prix affichés</strong>. Composez votre devis en ligne en quelques clics, un conseiller vous rappelle sous 24 h.</p>
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
                  <p>Cliquez sur une machine pour voir sa fiche, ajoutez-la à votre devis, ajustez les quantités et envoyez : c'est gratuit et sans engagement.</p>
                </div>
                <div className="lp-carousel imp lp-imp">
                  <button className="lp-nav prev" onClick={() => slide(-1)} aria-label="Produits précédents"><ChevronLeft /></button>
                  <div className="lp-prod-track" ref={trackRef}>
                    {featured.map((p) => renderCard(p))}
                  </div>
                  <button className="lp-nav next" onClick={() => slide(1)} aria-label="Produits suivants"><ChevronRight /></button>
                </div>
              </div>
            </section>
          )}

          {/* 3. le stock : une carte par gamme (affiche du site) ; clic = page de la gamme */}
          <section className="lp-sec lp-catalog" id="machines">
            <div className="lp-wrap">
              <div className="lp-head">
                <span className="lp-eyebrow dark">Nos gammes</span>
                <h2>Choisissez votre gamme</h2>
                <p>Prix unitaires HT. Cliquez sur une gamme pour voir ses machines.</p>
              </div>

              {isLoading && <p className="lp-loading">Chargement des machines…</p>}

              <div className="imp lp-imp">
                {gammes.length > 0 && (
                  <nav className="range-grid lp-ranges" aria-label="Gammes">
                    {gammes.map((g) => (
                      <a className="range-card" key={g.code} href={gammeHref(g.code)}>
                        <span className="rc-shot">{g.poster && <img {...thumbProps(g.poster)} alt={`Gamme ${g.code}`} loading="lazy" decoding="async" />}</span>
                        <span className="rc-body">
                          <span className="p-cat">Gamme</span>
                          <h3>{g.code}{g.label && <small>{g.label}</small>}</h3>
                          {g.description ? <p className="p-desc">{g.description}</p> : g.subTitles.length > 0 && <p className="p-desc">{g.subTitles.join(" · ")}</p>}
                          <span className="product-see">{g.items.length} machine{g.items.length > 1 ? "s" : ""} <ArrowRight /></span>
                        </span>
                      </a>
                    ))}
                  </nav>
                )}

              </div>
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
        </>
      )}

      {/* 5. formulaire de bas de page */}
      {finalForm}

      {/* FAQ */}
      {!id && !gammeParam && (
        <section className="lp-sec lp-faq">
          <div className="lp-wrap lp-faq-in">
            <h2>Questions fréquentes</h2>
            <details><summary>Les prix affichés sont-ils HT ou TTC ?</summary><p>Les prix sont des prix unitaires hors taxes (HT). Votre conseiller vous confirme le devis final, avec la livraison et l'installation.</p></details>
            <details><summary>Les machines sont-elles disponibles rapidement ?</summary><p>Oui, les machines présentées ici sont disponibles au Maroc. Votre conseiller vous confirme le délai de livraison à la réception de votre devis.</p></details>
            <details><summary>Livrez-vous et installez-vous dans tout le Maroc ?</summary><p>Oui. Notre équipe technique assure la livraison et l'installation partout au Maroc, ainsi que le service après-vente avec un stock de pièces d'origine.</p></details>
            <details><summary>Puis-je voir les machines avant de commander ?</summary><p>Oui, au showroom de Bouskoura{s.hours_line_1 ? ` (${[s.hours_line_1, s.hours_line_2].filter(Boolean).join(", ")})` : ""}. Demandez une visite : un conseiller vous accueille.</p></details>
          </div>
        </section>
      )}

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
        <button className="lp-btn lp-btn-ghost" onClick={() => openForm(current?.name ?? (activeGamme ? `Gamme ${activeGamme.code}` : undefined))}>Être rappelé</button>
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
