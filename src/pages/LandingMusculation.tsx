import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { thumbProps } from "@/lib/images";
import { track } from "@/lib/analytics";
import LeadForm, { LEAD_SENT_KEY } from "@/components/landing/LeadForm";
import DevisDrawer, { type DevisLine } from "@/components/landing/DevisDrawer";
import { formatMad, PRIVACY_EVENT } from "@/components/landing/contact";
import PrivacyPolicyContent from "@/components/PrivacyPolicyContent";
import { openConsentSettings } from "@/lib/consent";
import ProductDetailView, { pickPreferredColor } from "@/components/ProductDetailView";
import { CROSSED_PRICE_RATIO, STOCK_ITEMS } from "@/data/stock-landing";
import logo from "@/assets/logo.png";
import logoWhite from "@/assets/logo-new.png";
import { ArrowLeft, ArrowRight, Check, ChevronRight, FileText, MapPin, Minus, NotebookPen, Phone, Plus, ShieldCheck, ShoppingCart, Truck, X } from "lucide-react";
import "@/styles/landing.css";

/**
 * Landing page des campagnes « Offre de lancement » : Musculation professionnelle (/lp/musculation).
 * Maquette du client du 23/10/2026. La landing est un univers à part : AUCUN lien vers le site (le logo ramène à l'accueil de la landing).
 * WhatsApp n'est proposé qu'après l'envoi d'un formulaire ou d'un devis (contact qualifié).
 *   /lp/musculation                     accueil : visuel, 3 catégories, 2 machines par catégorie, devis, showroom
 *   /lp/musculation/machines/:cat       toutes les machines d'une catégorie (filtre par gamme : ?gamme=ecp)
 *   /lp/musculation/:id                 fiche produit (même affichage que le site) + prix + devis
 * Machines et prix : src/data/stock-landing.ts (prix affiché = PU HT, prix barré = PU × CROSSED_PRICE_RATIO).
 * Contacts : devis en ligne (n° DEV-…), formulaire simple (pop-up, « Nous contacter », « Demander un devis personnalisé », « Prendre rendez-vous »).
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
/** WhatsApp de la landing (boutons proposés après l'envoi d'un formulaire ou d'un devis) */
const LP_WHATSAPP = "212668818164";
/** couleur montrée en premier quand une machine existe en plusieurs couleurs : noir, sauf SL et ECP en rouge (demande du client) */
const PREFERRED_COLOR = "noir";
const PREFERRED_COLOR_BY_GAMME: Record<string, string> = { SL: "rouge", ECP: "rouge" };
const preferredColorFor = (gamme?: string) => (gamme && PREFERRED_COLOR_BY_GAMME[gamme.toUpperCase()]) || PREFERRED_COLOR;
const ANNOUNCE = "Offre de lancement · Impulse Fitness Maroc";
const PERK_WARRANTY = { title: "Garantie 12 mois", sub: "pièces et main-d'œuvre" };
const PERK_DELIVERY = "Livraison sous 72 h";

interface StockProduct extends DevisLine { gamme: string; hover: string; subTitle: string; type: string; crossed: number; trending: boolean; order: number }

/** Les 3 catégories de la maquette. Une machine va dans la première catégorie qui la reconnaît. */
/**
 * Les 3 catégories de la landing reprennent le rangement du site (Musculation professionnelle).
 * Une machine est rangée d'après sa sous-catégorie sur le site (identifiant de la sous-catégorie) :
 *   mono-stations + multi-stations  → « Musculation guidée »  (pile de poids : IT95)
 *   charges-guidees                 → « Musculation libre »   (machines à disques ECP, SL, IFP + Smith machines ITF)
 *   charges-libres                  → « Bancs & Racks »       (bancs ITF, bancs olympiques SL)
 * (Sur le site, les sous-catégories ont été renommées dans l'admin ; leurs identifiants n'ont pas changé.)
 */
interface Category { slug: string; title: string; pitch: string; cover: string; siteSlugs: string[]; coverPhoto?: string }
const CATEGORIES: Category[] = [
  { slug: "musculation-guidee", title: "Musculation guidée", pitch: "Machines à pile de poids : mono-stations et multi-stations.", cover: "IT9530", siteSlugs: ["mono-stations", "multi-stations"] },
  { slug: "musculation-libre", title: "Musculation libre", pitch: "Machines à disques et Smith machines.", cover: "ECP201", siteSlugs: ["charges-guidees"], coverPhoto: "/photos/ecp-series/ecp201/rouge/ecp201-rouge-02.webp" },
  { slug: "bancs-racks", title: "Bancs & Racks", pitch: "Bancs plats, inclinés, réglables et bancs olympiques.", cover: "ITF8202", siteSlugs: ["charges-libres"] },
];
/** anciennes adresses de catégorie → nouvelles */
const OLD_CAT_SLUGS: Record<string, string> = { multistation: "musculation-guidee" };
const slugify = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const read = (k: string, store: "local" | "session" = "local") => {
  try { return (store === "local" ? localStorage : sessionStorage).getItem(k); } catch { return null; }
};
const write = (k: string, v: string, store: "local" | "session" = "local") => {
  try { (store === "local" ? localStorage : sessionStorage).setItem(k, v); } catch { /* stockage indisponible */ }
};

const useLandingData = () =>
  useQuery({
    queryKey: ["lp-musculation-stock"],
    queryFn: async () => {
      const [products, settings, images] = await Promise.all([
        supabase.from("products").select("*").eq("is_published", true).order("sort_order"),
        supabase.from("contact_settings").select("*"),
        supabase.from("product_images").select("*").order("sort_order"),
      ]);
      const s: Record<string, string> = {};
      ((settings.data || []) as Row[]).forEach((r) => { s[str(r.key)] = str(r.value); });
      return { products: (products.data || []) as Row[], images: (images.data || []) as Row[], settings: s };
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
  const [privacy, setPrivacy] = useState(false);
  // un devis déjà commencé compte comme un engagement : pas de pop-up automatique
  const engaged = useRef(Object.keys(cart).length > 0);
  const sent = useRef(!!read(LEAD_SENT_KEY));

  const s = data?.settings || {};
  const waNumber = LP_WHATSAPP;
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
      // photos dans la couleur mise en avant (noir, ou rouge pour SL / ECP) si la machine existe dans cette couleur
      // (les photos principales du site sont dans la couleur par défaut choisie dans l'admin)
      let image = str(p.image_url), hover = str(p.hover_image_url);
      const gamme = str(p.range_code) || it.ref.replace(/\d.*/, "");
      const wanted = preferredColorFor(gamme);
      const gallery = data.images.filter((g) => g.product_id === p.id && str(g.image_url));
      const color = pickPreferredColor([...new Set(gallery.map((g) => str(g.color)).filter(Boolean))], wanted);
      if (color && !str(p.default_color).startsWith(wanted)) {
        const shots = gallery.filter((g) => g.color === color).map((g) => str(g.image_url));
        image = shots[0]; hover = shots[1] || "";
      }
      out.push({
        ref: it.ref, productId: str(p.id), name, image, hover,
        category: str(p.category) || "Musculation", pu: it.pu, qty: 0, gamme,
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
    for (const p of stock) {
      const siteSlug = slugify(p.subTitle);
      // sous-catégorie inconnue : rangée d'après la gamme (IT95 = pile de poids), sinon avec les machines à disques
      const c = CATEGORIES.find((x) => x.siteSlugs.includes(siteSlug)) || (p.gamme === "IT95" ? CATEGORIES[0] : CATEGORIES[1]);
      buckets.get(c.slug)!.push(p);
    }
    return CATEGORIES.map((c) => {
      const items = buckets.get(c.slug) || [];
      const cover = items.find((p) => p.ref === c.cover && p.image) || items.find((p) => p.image);
      const picks = [...items].sort((a, b) => Number(b.trending) - Number(a.trending) || b.pu - a.pu).slice(0, PICKS_PER_CATEGORY);
      const gammes = [...new Set(items.map((p) => p.gamme))].sort((a, b) => ((GAMME_ORDER.indexOf(a) + 1) || 99) - ((GAMME_ORDER.indexOf(b) + 1) || 99));
      return { ...c, items, picks, gammes, coverImage: c.coverPhoto || cover?.image || "" };
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
  const goTo = (anchor: "machines") => {
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

  // liens « Politique de confidentialité » (formulaires, bandeau cookies) : fenêtre dans la page
  useEffect(() => {
    const open = () => setPrivacy(true);
    window.addEventListener(PRIVACY_EVENT, open);
    return () => window.removeEventListener(PRIVACY_EVENT, open);
  }, []);

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
  const anyOverlay = modal.open || drawer || privacy;
  useEffect(() => {
    if (!anyOverlay) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setModal({ open: false }); setDrawer(false); setPrivacy(false); } };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [anyOverlay]);

  const formProps = { onStarted: () => { engaged.current = true; }, onDone: () => { sent.current = true; }, onOpenDevis: openDevis, whatsappNumber: waNumber };

  // ancienne adresse d'une gamme (/lp/musculation/gamme/ecp) → catégorie correspondante, filtrée sur la gamme
  if (catParam && OLD_CAT_SLUGS[catParam]) return <Navigate to={`${catHref(OLD_CAT_SLUGS[catParam])}${location.search}`} replace />;
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
            <span className="lp-incart-ok" title="Dans votre devis" aria-label="Dans votre devis"><Check /></span>
          </span>
        ) : (
          <button className="lp-btn lp-btn-red lp-add" onClick={() => add(p)}><ShoppingCart /> Ajouter au devis</button>
        )}
      </article>
    );
  };

  // cartes des 3 catégories (accueil, et en haut de chaque page catégorie pour passer de l'une à l'autre)
  const renderCats = (active?: string) => categories.map((c) => (
    <a className={`lp-cat${c.slug === active ? " on" : ""}`} key={c.slug} href={catHref(c.slug)} aria-current={c.slug === active ? "page" : undefined}>
      <span className="lp-cat-img">{c.coverImage && <img {...thumbProps(c.coverImage)} alt="" loading="lazy" decoding="async" />}</span>
      <h2>{c.title}</h2>
      <span className="lp-btn lp-btn-red lp-btn-sm">{c.slug === active ? "Catégorie affichée" : "Voir les machines"}</span>
    </a>
  ));

  const header = (
    <>
      <div className="lp-announce">{ANNOUNCE}</div>
      <header className="lp-top">
        <div className="lp-wrap lp-top-in">
          <a href={BASE} className="lp-logo" aria-label="Impulse Fitness Maroc — accueil de l'offre de lancement"><img src={logo} alt="Impulse Fitness Maroc" width={160} height={32} /></a>
          <div className="lp-top-actions">
            <button className={`lp-top-devis${cartCount ? " on" : ""}`} onClick={openDevis}>
              <FileText /> <span>Mon devis</span> ({cartCount})
            </button>
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
            <button className="lp-btn lp-btn-red" onClick={() => openForm("Rendez-vous au showroom")}>Prendre rendez-vous</button>
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
          preferredColor={preferredColorFor(current?.gamme)}
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
                  <button className="lp-btn lp-btn-red" onClick={() => openForm(product.name)}><Phone /> Nous contacter</button>
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
                <button className="lp-btn lp-btn-outline-dark" onClick={() => openForm(current.name)}><Phone /> Nous contacter</button>
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
        <a className="lp-back" href={`${BASE}#machines`}><ArrowLeft /> Retour à l'accueil</a>
        {isLoading ? (
          <p className="lp-loading">Chargement des machines…</p>
        ) : !activeCat ? (
          <div className="lp-missing">
            <p>Cette catégorie n'est pas présentée ici.</p>
            <a className="lp-btn lp-btn-red" href={`${BASE}#machines`}>Voir les catégories <ArrowRight /></a>
          </div>
        ) : (
          <>
            {/* les 3 catégories restent affichées : la catégorie ouverte est encadrée en rouge */}
            <nav className="lp-cats lp-cats-nav" aria-label="Catégories">{renderCats(activeCat.slug)}</nav>
            <div className="lp-catpage-head">
              <h1 className="lp-h-bar">{activeCat.title}</h1>
              <p>{activeCat.pitch}</p>
            </div>
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

        <section className="lp-wrap lp-cats" id="machines" aria-label="Catégories de machines">
          {isLoading && <p className="lp-loading">Chargement des machines…</p>}
          {renderCats()}
        </section>

        {categories.length > 0 && (
          <section className="lp-wrap lp-picks" aria-label="Sélection de machines">
            {categories.map((c) => (
              <div className="lp-pick" key={c.slug}>
                <h2 className="lp-h-bar"><a href={catHref(c.slug)}>{c.title}</a></h2>
                <div className="lp-pick-grid">{c.picks.map(renderCard)}</div>
                <a className="lp-pick-more" href={catHref(c.slug)}>Voir toutes les machines <ArrowRight /></a>
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
          <a href={BASE} className="lp-foot-logo" aria-label="Impulse Fitness Maroc — accueil de l'offre de lancement"><img src={logoWhite} alt="Impulse Fitness Maroc" width={130} height={26} /></a>
          <span className="lp-foot-sep" aria-hidden="true" />
          <p>Équipez votre projet sportif avec Impulse Fitness Morocco</p>
        </div>
        <div className="lp-wrap lp-foot-legal">
          <button onClick={() => setPrivacy(true)}>Confidentialité</button>
          <span aria-hidden="true">·</span>
          <button onClick={openConsentSettings}>Gérer les cookies</button>
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
        <button className="lp-btn lp-btn-outline-dark" onClick={() => openForm(current?.name)}>Nous contacter</button>
      </div>

      {/* fenêtre formulaire simple */}
      {modal.open && (
        <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lp-modal-title" onClick={closeModal}>
          <div className="lp-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="lp-modal-x" onClick={closeModal} aria-label="Fermer"><X /></button>
            {(modal.auto || (modal.interest && !["Rendez-vous au showroom", "Projet sur mesure"].includes(modal.interest))) && <p className="lp-modal-kicker">{modal.auto ? "Offre de lancement" : modal.interest}</p>}
            <h2 id="lp-modal-title">{modal.interest === "Projet sur mesure" ? "Parlons de votre projet" : modal.interest === "Rendez-vous au showroom" ? "Prenez rendez-vous au showroom" : "Contactez-nous"}</h2>
            <p className="lp-modal-sub">Un conseiller vous contactera dans les plus brefs délais.</p>
            <LeadForm idPrefix="popup" interest={modal.interest} submitLabel="Envoyer" {...formProps} />
          </div>
        </div>
      )}

      {/* politique de confidentialité, sans quitter la landing */}
      {privacy && (
        <div className="lp-modal lp-modal-top" role="dialog" aria-modal="true" aria-labelledby="lp-privacy-title" onClick={() => setPrivacy(false)}>
          <div className="lp-modal-box lp-privacy" onClick={(e) => e.stopPropagation()}>
            <button className="lp-modal-x" onClick={() => setPrivacy(false)} aria-label="Fermer"><X /></button>
            <p className="lp-modal-kicker">Mentions légales</p>
            <h2 id="lp-privacy-title">Politique de confidentialité</h2>
            <div className="lp-privacy-body"><PrivacyPolicyContent /></div>
          </div>
        </div>
      )}

      {drawer && <DevisDrawer lines={lines} setQty={setQty} onClose={() => setDrawer(false)} onSent={() => { sent.current = true; setCart({}); }} onBrowse={() => goTo("machines")} whatsappNumber={waNumber} />}
    </div>
  );
};

export default LandingMusculation;
