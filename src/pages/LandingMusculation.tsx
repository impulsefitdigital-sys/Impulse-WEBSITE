import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import logo from "@/assets/logo.png";
import logoWhite from "@/assets/logo-new.png";
import { ArrowLeft, ArrowRight, Check, ChevronRight, FileText, MapPin, Minus, NotebookPen, Phone, Plus, ShieldCheck, ShoppingCart, Truck, X } from "lucide-react";
import "@/styles/landing.css";

/**
 * Landing page des campagnes « Offre de lancement » : Musculation professionnelle (/lp/musculation).
 * Maquette du client du 23/10/2026. Aucun lien vers le site, sauf le logo.
 *   /lp/musculation                     accueil : visuel, 3 catégories, 2 machines par catégorie, devis, showroom
 *   /lp/musculation/machines/:cat       toutes les machines d'une catégorie (filtre par gamme : ?gamme=ecp)
 *   /lp/musculation/:id                 fiche produit (même affichage que le site) + prix + devis
 * Machines et prix : src/data/stock-landing.ts (prix affiché = PU HT, prix barré = PU × CROSSED_PRICE_RATIO).
 * Contacts : devis en ligne (n° DEV-…), formulaire simple (pop-up, « Demander un devis personnalisé »), WhatsApp.
 */

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const BASE = "/lp/musculation";
const POPUP_KEY = "impulse-lp-popup-vu";
const POPUP_DELAY_MS = 60_000;
const CART_KEY = "impulse-lp-devis";
const PICKS_PER_CATEGORY = 2;
const GAMME_ORDER = ["IT95", "ECP", "SL", "IFP", "ITF"];
const HERO_ALT = "Impulse Fitness débarque au Maroc : découvrez nos offres de lancement sur les machines disponibles en stock";

/* Textes de la maquette du client — à confirmer avant diffusion. */
const ANNOUNCE = "Offre de lancement · Impulse Fitness Maroc";
const PERK_WARRANTY = { title: "Garantie 12 mois", sub: "pièces et main-d'œuvre" };
const PERK_DELIVERY = "Livraison sous 72 h";
const WA_TEXT = "Bonjour, je souhaite des informations sur les machines Impulse de l'offre de lancement.";

interface StockProduct extends DevisLine { gamme: string; hover: string; subTitle: string; type: string; crossed: number; trending: boolean; order: number }

/** Les 3 catégories de la maquette. Une machine va dans la première catégorie qui la reconnaît. */
interface Category { slug: string; title: string; pitch: string; cover: string; match: (p: StockProduct) => boolean }
const CATEGORIES: Category[] = [
  { slug: "multistation", title: "Multistation", pitch: "Machines à pile de poids, plusieurs exercices par poste.", cover: "IT9530", match: (p) => p.gamme === "IT95" },
  { slug: "musculation-libre", title: "Musculation libre", pitch: "Bancs olympiques, bancs réglables et postes de charges libres.", cover: "ITF8202", match: (p) => /libre/i.test(p.subTitle) },
  { slug: "musculation-guidee", title: "Musculation guidée", pitch: "Machines à disques et Smith machines, guidage sûr et précis.", cover: "ECP617", match: () => true },
];
const DISPLAY_ORDER = ["multistation", "musculation-guidee", "musculation-libre"];

const read = (k: string, store: "local" | "session" = "local") => {
  try { return (store === "local" ? localStorage : sessionStorage).getItem(k); } catch { return null; }
};
const write = (k: string, v: string, store: "local" | "session" = "local") => {
  try { (store === "local" ? localStorage : sessionStorage).setItem(k, v); } catch { /* stockage indisponible */ }
};

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="lp-wa-ico"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
);

const useLandingData = () =>
  useQuery({
    queryKey: ["lp-musculation-stock"],
    queryFn: async () => {
      const [products, settings] = await Promise.all([
        supabase.from("products").select("*").eq("is_published", true).order("sort_order"),
        supabase.from("contact_settings").select("*"),
      ]);
      const s: Record<string, string> = {};
      ((settings.data || []) as Row[]).forEach((r) => { s[str(r.key)] = str(r.value); });
      return { products: (products.data || []) as Row[], settings: s };
    },
    staleTime: 5 * 60 * 1000,
  });

const LandingMusculation = () => {
  const { id, cat: catParam, gamme: legacyGamme } = useParams();
  const [search] = useSearchParams();
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

  const s = data?.settings || {};
  const waHref = `https://wa.me/${(s.whatsapp_number || "").replace(/\D/g, "")}?text=${encodeURIComponent(WA_TEXT)}`;
  const mapsEmbed = s.maps_embed_url || "";

  // machines de l'offre retrouvées sur le site (photos, nom, gamme), dans l'ordre du catalogue
  const stock = useMemo<StockProduct[]>(() => {
    if (!data) return [];
    const out: StockProduct[] = [];
    for (const it of STOCK_ITEMS) {
      const re = new RegExp(`\\b${it.ref}\\b`);
      const p = data.products
        .filter((x) => re.test(str(x.name)))
        .sort((a, b) => Number(!b.image_url) - Number(!a.image_url))[0];
      if (!p) continue;
      const name = str(p.name).replace(/\s+/g, " ").trim();
      out.push({
        ref: it.ref, productId: str(p.id), name, image: str(p.image_url), hover: str(p.hover_image_url),
        category: str(p.category) || "Musculation", pu: it.pu, qty: 0, gamme: str(p.range_code) || it.ref.replace(/\d.*/, ""),
        subTitle: str(p.subcategory),
        type: name.replace(re, "").replace(/\bimpulse\b/gi, "").replace(/\s+/g, " ").trim() || str(p.subcategory),
        crossed: Math.round(it.pu * CROSSED_PRICE_RATIO), trending: !!p.is_trending, order: data.products.indexOf(p),
      });
    }
    return out.sort((a, b) => a.order - b.order);
  }, [data]);
  const byId = useMemo(() => new Map(stock.map((p) => [p.productId, p])), [stock]);
  const stockIds = useMemo(() => stock.map((p) => p.productId), [stock]);

  // machines rangées dans les 3 catégories
  const categories = useMemo(() => {
    const buckets = new Map<string, StockProduct[]>(CATEGORIES.map((c) => [c.slug, []]));
    for (const p of stock) buckets.get((CATEGORIES.find((c) => c.match(p)) || CATEGORIES[CATEGORIES.length - 1]).slug)!.push(p);
    return DISPLAY_ORDER.map((slug) => {
      const c = CATEGORIES.find((x) => x.slug === slug)!;
      const items = buckets.get(slug) || [];
      const cover = items.find((p) => p.ref === c.cover && p.image) || items.find((p) => p.image);
      const picks = [...items].sort((a, b) => Number(b.trending) - Number(a.trending) || b.pu - a.pu).slice(0, PICKS_PER_CATEGORY);
      const gammes = [...new Set(items.map((p) => p.gamme))].sort((a, b) => ((GAMME_ORDER.indexOf(a) + 1) || 99) - ((GAMME_ORDER.indexOf(b) + 1) || 99));
      return { ...c, items, picks, gammes, coverImage: cover?.image || "" };
    }).filter((c) => c.items.length > 0);
  }, [stock]);
  const catOf = useCallback((p: StockProduct) => categories.find((c) => c.items.includes(p)), [categories]);
  const catHref = (slug: string, gamme?: string) => `${BASE}/machines/${slug}${gamme ? `?gamme=${gamme.toLowerCase()}` : ""}`;

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
  const goTo = (anchor: "machines" | "showroom") => {
    setDrawer(false);
    setModal({ open: false });
    if (id || catParam) { navigate(`${BASE}#${anchor}`); return; }
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // retour d'une fiche (#machine-REF) ou lien direct (#machines, #showroom) : on se replace au bon endroit
  useEffect(() => {
    if (id || !stock.length) return;
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    const t = window.setTimeout(() => document.getElementById(h)?.scrollIntoView({ block: h.startsWith("machine-") ? "center" : "start" }), 80);
    return () => window.clearTimeout(t);
  }, [id, catParam, location.key, location.hash, stock]);

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

  // ancienne adresse d'une gamme (/lp/musculation/gamme/ecp) → catégorie correspondante, filtrée sur la gamme
  if (legacyGamme) {
    if (!stock.length) return isLoading ? <div className="lp" /> : <Navigate to={BASE} replace />;
    const p = stock.find((x) => x.gamme.toLowerCase() === legacyGamme.toLowerCase());
    const c = p && catOf(p);
    return <Navigate to={c && p ? catHref(c.slug, p.gamme) : BASE} replace />;
  }

  /* ------------------------------------------------------------------ éléments réutilisés */
  const renderPrice = (p: StockProduct) => (
    <span className="lp-price">
      <span className="lp-price-now">{formatMad(p.pu)} HT</span>
      <s className="lp-price-old" aria-label={`Au lieu de ${formatMad(p.crossed)} HT`}>{formatMad(p.crossed)} HT</s>
    </span>
  );
  const perks = (
    <ul className="lp-perks">
      <li><ShieldCheck /><span><b>{PERK_WARRANTY.title}</b><small>{PERK_WARRANTY.sub}</small></span></li>
      <li><Truck /><span>{PERK_DELIVERY}</span></li>
    </ul>
  );
  const renderQty = (p: StockProduct, big = false) => (
    <span className={`lp-qty${big ? "" : " sm"}`} role="group" aria-label={`Quantité ${p.name}`}>
      <button onClick={() => setQty(p.ref, cart[p.ref] - 1)} aria-label="Retirer une unité">{cart[p.ref] > 1 ? <Minus /> : <X />}</button>
      <span aria-live="polite">{cart[p.ref]}</span>
      <button onClick={() => setQty(p.ref, cart[p.ref] + 1)} aria-label="Ajouter une unité"><Plus /></button>
    </span>
  );
  const renderCard = (p: StockProduct) => {
    const href = `${BASE}/${p.productId}`;
    return (
      <article className="lp-card" key={p.ref} id={`machine-${p.ref}`}>
        <a href={href} className="lp-card-img" aria-label={`Voir la fiche ${p.name}`}>
          <img className="main" {...thumbProps(p.image)} alt={p.name} loading="lazy" decoding="async" />
          {p.hover && <img className="alt" {...thumbProps(p.hover)} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
        </a>
        <a href={href} className="lp-card-info">
          <h3>Impulse {p.ref}</h3>
          <p>{p.type}</p>
        </a>
        {renderPrice(p)}
        {perks}
        {cart[p.ref] ? (
          <span className="lp-incart">
            {renderQty(p)}
            <button className="lp-incart-see" onClick={openDevis}><Check /> Voir le devis</button>
          </span>
        ) : (
          <button className="lp-btn lp-btn-red lp-add" onClick={() => add(p)}><ShoppingCart /> Ajouter au devis</button>
        )}
      </article>
    );
  };

  const header = (
    <>
      <div className="lp-announce">{ANNOUNCE}</div>
      <header className="lp-top">
        <div className="lp-wrap lp-top-in">
          <a href="/" className="lp-logo" aria-label="Impulse Fitness Maroc — site complet"><img src={logo} alt="Impulse Fitness Maroc" width={160} height={32} /></a>
          <div className="lp-top-actions">
            <button className={`lp-top-devis${cartCount ? " on" : ""}`} onClick={openDevis}>
              <FileText /> <span>Mon devis</span> ({cartCount})
            </button>
            <span className="lp-top-sep" aria-hidden="true" />
            <a className="lp-wa-round" href={waHref} target="_blank" rel="noopener noreferrer" aria-label="Nous écrire sur WhatsApp"><WhatsAppIcon /></a>
          </div>
        </div>
      </header>
    </>
  );

  const devisBanner = (
    <section className="lp-wrap lp-band-wrap">
      <div className="lp-devis-band">
        <FileText className="lp-band-ico" />
        <div>
          <h2>Vos machines sélectionnées, votre devis sur mesure</h2>
          <p>{cartCount ? `${cartCount} machine${cartCount > 1 ? "s" : ""} dans votre devis · ${formatMad(cartTotal)} HT` : "Ajoutez vos machines et recevez un devis personnalisé rapidement."}</p>
        </div>
        <button className="lp-btn lp-btn-dark" onClick={openDevis}><NotebookPen /> Voir mon devis</button>
      </div>
    </section>
  );

  const projectBand = (
    <section className="lp-wrap lp-band-wrap">
      <div className="lp-project">
        <NotebookPen className="lp-band-ico" />
        <div>
          <h2>Un projet fitness sur mesure ?</h2>
          <p>Vous avez un projet sportif ou des besoins spécifiques ? Parlons de votre projet.</p>
        </div>
        <button className="lp-btn lp-btn-red" onClick={() => openForm("Projet sur mesure")}>Demander un devis personnalisé <ChevronRight /></button>
      </div>
    </section>
  );

  const address = (s.address_line_1 || s.address || "").replace(/^Showroom\s*:\s*/i, "");
  const showroom = (
    <section className="lp-wrap lp-band-wrap" id="showroom">
      <div className="lp-showroom">
        <div className="lp-showroom-copy">
          <h2>Visitez notre showroom <span>sur Casablanca Bouskoura</span></h2>
          <p>Venez tester les machines en conditions réelles et échangez avec notre équipe.</p>
          {address && <p className="lp-show-info"><MapPin /> {address}{s.address_line_2 ? `, ${s.address_line_2}` : ""}</p>}
          {(s.hours_line_1 || s.hours_line_2) && <p className="lp-show-info lp-show-hours">{[s.hours_line_1, s.hours_line_2].filter(Boolean).join(" · ")}</p>}
          <div className="lp-show-ctas">
            <a className="lp-btn lp-btn-red" href="https://www.google.com/maps/search/?api=1&query=IMPULSE+MAROC+Bouskoura" target="_blank" rel="noopener noreferrer"><MapPin /> Itinéraire</a>
            <a className="lp-btn lp-btn-wa" href={waHref} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> Nous contacter</a>
          </div>
        </div>
        <div className="lp-map">
          {mapsEmbed ? <iframe src={mapsEmbed} title="Plan d'accès au showroom Impulse de Bouskoura" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <span className="lp-map-empty"><MapPin /> Showroom de Bouskoura</span>}
        </div>
      </div>
    </section>
  );

  const current = id ? byId.get(id) : undefined;
  const currentCat = current ? catOf(current) : undefined;
  const activeCat = catParam ? categories.find((c) => c.slug === catParam) : undefined;
  const gammeFilter = (search.get("gamme") || "").toUpperCase();
  const catItems = activeCat ? (gammeFilter && activeCat.gammes.includes(gammeFilter) ? activeCat.items.filter((p) => p.gamme === gammeFilter) : activeCat.items) : [];

  let main: ReactNode;
  if (id) {
    /* ------------------------------------------------ fiche produit (même affichage que le site) */
    main = (
      <div className="imp lp-imp lp-pd">
        <ProductDetailView
          id={id}
          backLabel={currentCat ? `Retour : ${currentCat.title}` : "Retour aux machines"}
          onBack={() => navigate(current && currentCat ? `${catHref(currentCat.slug)}#machine-${current.ref}` : `${BASE}#machines`)}
          relatedIds={stockIds.length ? stockIds : undefined}
          relatedHref={(rid) => `${BASE}/${rid}`}
          relatedTitle="Autres machines de la gamme"
          renderHead={(product) => <Helmet><title>{`${product.name} | Offre de lancement Impulse Fitness Maroc`}</title></Helmet>}
          renderBelowTitle={() => current && <div className="lp-pd-price">{renderPrice(current)}{perks}</div>}
          renderActions={(product) => {
            if (!data) return null;
            if (!current) {
              return (
                <div className="pd-actions lp-pd-actions">
                  <button className="lp-btn lp-btn-red" onClick={() => openForm(product.name)}><Phone /> Être rappelé</button>
                  <a className="lp-btn lp-btn-outline-dark" href={`${BASE}#machines`}>Voir les machines</a>
                </div>
              );
            }
            return (
              <div className="pd-actions lp-pd-actions">
                {cart[current.ref] ? (
                  <>
                    {renderQty(current, true)}
                    <button className="lp-btn lp-btn-dark" onClick={openDevis}><Check /> Voir mon devis ({cartCount})</button>
                  </>
                ) : (
                  <button className="lp-btn lp-btn-red" onClick={() => add(current)}><ShoppingCart /> Ajouter au devis</button>
                )}
                <a className="lp-btn lp-btn-wa" href={waHref} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> WhatsApp</a>
              </div>
            );
          }}
          notFound={
            <div className="lp-missing">
              <p>Cette machine n'est plus affichée.</p>
              <a className="lp-btn lp-btn-red" href={`${BASE}#machines`}>Voir les machines <ArrowRight /></a>
            </div>
          }
        />
      </div>
    );
  } else if (catParam) {
    /* ------------------------------------------------ toutes les machines d'une catégorie */
    main = (
      <section className="lp-wrap lp-catpage">
        <a className="lp-back" href={`${BASE}#machines`}><ArrowLeft /> Toutes les catégories</a>
        {isLoading ? (
          <p className="lp-loading">Chargement des machines…</p>
        ) : !activeCat ? (
          <div className="lp-missing">
            <p>Cette catégorie n'est pas présentée ici.</p>
            <a className="lp-btn lp-btn-red" href={`${BASE}#machines`}>Voir les catégories <ArrowRight /></a>
          </div>
        ) : (
          <>
            <div className="lp-catpage-head">
              <h1 className="lp-h-bar">{activeCat.title}</h1>
              <p>{activeCat.items.length} machines · {activeCat.pitch}</p>
            </div>
            <nav className="lp-tabs" aria-label="Catégories">
              {categories.map((c) => (
                <a key={c.slug} href={catHref(c.slug)} className={c.slug === activeCat.slug ? "on" : ""} aria-current={c.slug === activeCat.slug ? "page" : undefined}>{c.title}</a>
              ))}
            </nav>
            {activeCat.gammes.length > 1 && (
              <nav className="lp-chips" aria-label="Filtrer par gamme">
                <a href={catHref(activeCat.slug)} className={!gammeFilter ? "on" : ""}>Toutes</a>
                {activeCat.gammes.map((g) => (
                  <a key={g} href={catHref(activeCat.slug, g)} className={gammeFilter === g ? "on" : ""}>Gamme {g}</a>
                ))}
              </nav>
            )}
            <div className="lp-grid">{catItems.map(renderCard)}</div>
          </>
        )}
      </section>
    );
  } else {
    /* ------------------------------------------------ accueil */
    main = (
      <>
        <section className="lp-hero">
          <picture>
            <source media="(max-width: 760px)" srcSet="/lp/hero-lancement-1000.webp" />
            <img src="/lp/hero-lancement.webp" alt={HERO_ALT} width={1942} height={809} {...({ fetchpriority: "high" } as Record<string, string>)} />
          </picture>
        </section>
        <div className="lp-wrap lp-hero-ctas">
          <button className="lp-btn lp-btn-red lp-btn-lg" onClick={() => goTo("machines")}>Découvrir les machines</button>
          <button className="lp-btn lp-btn-outline-dark lp-btn-lg" onClick={() => goTo("showroom")}>Visiter le showroom</button>
        </div>

        <section className="lp-wrap lp-cats" id="machines" aria-label="Catégories de machines">
          {isLoading && <p className="lp-loading">Chargement des machines…</p>}
          {categories.map((c) => (
            <a className="lp-cat" key={c.slug} href={catHref(c.slug)}>
              <span className="lp-cat-img">{c.coverImage && <img src={c.coverImage} alt="" loading="lazy" decoding="async" />}</span>
              <h2>{c.title}</h2>
              <span className="lp-btn lp-btn-red lp-btn-sm">Voir les machines</span>
            </a>
          ))}
        </section>

        {categories.length > 0 && (
          <section className="lp-wrap lp-picks" aria-label="Sélection de machines">
            {categories.map((c) => (
              <div className="lp-pick" key={c.slug}>
                <h2 className="lp-h-bar"><a href={catHref(c.slug)}>{c.title}</a></h2>
                <div className="lp-pick-grid">{c.picks.map(renderCard)}</div>
                <a className="lp-pick-more" href={catHref(c.slug)}>Voir les {c.items.length} machines <ArrowRight /></a>
              </div>
            ))}
          </section>
        )}
      </>
    );
  }

  const isHome = !id && !catParam;

  return (
    <div className="lp">
      <Helmet>
        <title>{activeCat ? `${activeCat.title} | Offre de lancement Impulse Fitness Maroc` : "Offre de lancement | Impulse Fitness Maroc"}</title>
        <meta name="description" content="Impulse Fitness débarque au Maroc : offres de lancement sur les machines de musculation professionnelles. Prix affichés, devis en ligne, showroom à Bouskoura." />
        <meta name="robots" content="noindex, follow" />
        {isHome && <link rel="preload" as="image" href="/lp/hero-lancement.webp" media="(min-width: 761px)" />}
        {isHome && <link rel="preload" as="image" href="/lp/hero-lancement-1000.webp" media="(max-width: 760px)" />}
      </Helmet>

      {header}
      <main>{main}</main>

      {devisBanner}
      {isHome && showroom}
      {projectBand}

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <a href="/" className="lp-foot-logo" aria-label="Impulse Fitness Maroc — site complet"><img src={logoWhite} alt="Impulse Fitness Maroc" width={130} height={26} /></a>
          <span className="lp-foot-sep" aria-hidden="true" />
          <p>Équipez votre projet sportif avec Impulse Fitness Morocco</p>
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
          <button className="lp-btn lp-btn-red" onClick={() => goTo("machines")}>Découvrir les machines</button>
        )}
        <a className="lp-btn lp-btn-wa" href={waHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><WhatsAppIcon /></a>
      </div>

      {/* fenêtre formulaire simple */}
      {modal.open && (
        <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lp-modal-title" onClick={closeModal}>
          <div className="lp-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="lp-modal-x" onClick={closeModal} aria-label="Fermer"><X /></button>
            <p className="lp-modal-kicker">{modal.auto ? "Offre de lancement" : modal.interest || "Être rappelé"}</p>
            <h2 id="lp-modal-title">{modal.interest === "Projet sur mesure" ? "Parlons de votre projet" : "Un conseiller vous rappelle sous 24 h"}</h2>
            <p className="lp-modal-sub">Laissez vos coordonnées, un conseiller Impulse vous rappelle sous 24 h ouvrées. Vous pourrez aussi composer votre devis : elles y seront déjà remplies.</p>
            <LeadForm idPrefix="popup" interest={modal.interest} {...formProps} />
          </div>
        </div>
      )}

      {drawer && <DevisDrawer lines={lines} setQty={setQty} onClose={() => setDrawer(false)} onSent={() => { sent.current = true; setCart({}); }} onBrowse={() => goTo("machines")} />}
    </div>
  );
};

export default LandingMusculation;
