import { useState, useRef, useEffect } from "react";
import { X, FileText, ChevronDown, Search, Send } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQuoteCart } from "@/contexts/QuoteCartContext";
import logoWhite from "@/assets/logo-new.png";

const categories = [
  { label: "Cardio", slug: "cardio" },
  { label: "Musculation", slug: "musculation" },
  { label: "Fonctionnel", slug: "fonctionnel" },
];

const MegaMenu = ({ label, base, active }: { label: string; base: string; active?: boolean }) => {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const enter = () => { clearTimeout(timeout.current); setOpen(true); };
  const leave = () => { timeout.current = setTimeout(() => setOpen(false), 150); };
  return (
    <div onMouseEnter={enter} onMouseLeave={leave} style={{ position: "relative" }}>
      <button className={active ? "active" : undefined} aria-haspopup="true" aria-expanded={open}>
        {label} <ChevronDown className="h-3 w-3" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="imp-mega">
          {categories.map((c) => (
            <a key={c.slug} href={`/${base}/${c.slug}`}>{c.label}</a>
          ))}
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { itemCount, setIsOpen } = useQuoteCart();
  const { pathname } = useLocation();
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: menuLabels } = useQuery({
    queryKey: ["menu-labels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_settings")
        .select("key, value")
        .in("key", ["menu_label_consulting", "menu_label_realisations"]);
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });
  const consultingLabel = menuLabels?.menu_label_consulting || "Consulting";
  const realisationsLabel = menuLabels?.menu_label_realisations || "Réalisations";

  const { data: suggestions } = useQuery({
    queryKey: ["search-suggestions", searchQuery],
    queryFn: async () => {
      const q = searchQuery.trim();
      const { data, error } = await supabase
        .from("products")
        .select("id, name, image_url, category")
        .eq("is_published", true)
        .or(`name.ilike.%${q}%,category.ilike.%${q}%,subcategory.ilike.%${q}%`)
        .order("sort_order")
        .limit(6);
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.trim().length >= 2,
  });
  const showSuggestions = searchOpen && searchQuery.trim().length >= 2 && suggestions && suggestions.length > 0;

  // overlay de recherche : fermeture au clavier (Echap) et page figee derriere
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [searchOpen]);

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/recherche?q=${encodeURIComponent(searchQuery.trim())}`;
      setSearchOpen(false); setSearchQuery(""); setOpen(false);
    }
  };
  const handleSelectSuggestion = (id: string) => {
    window.location.href = `/produit/${id}`;
    setSearchOpen(false); setSearchQuery(""); setOpen(false);
  };
  const toggleMobile = (key: string) => setMobileExpanded(mobileExpanded === key ? null : key);

  return (
    <header id="site-navbar" className={`imp-header${scrolled ? " scrolled" : ""}`}>
      <div className="wrap imp-nav">
        <Link to="/" className="imp-brand" aria-label="Impulse Fitness Maroc — accueil">
          <img src={logoWhite} alt="Impulse Fitness Maroc" className="imp-logo-img" />
        </Link>

        <nav className="imp-nav-links">
          <MegaMenu label="Professionnel" base="professionnel" active={isActive("/professionnel")} />
          <MegaMenu label="Résidentiel" base="residentiel" active={isActive("/residentiel")} />
          <a href="/consulting" className={isActive("/consulting") ? "active" : undefined}>{consultingLabel}</a>
          <a href="/realisations" className={isActive("/realisations") ? "active" : undefined}>{realisationsLabel}</a>
          <a href="/blog" className={isActive("/blog") ? "active" : undefined}>Blog</a>
          <a href="/contact" className={isActive("/contact") ? "active" : undefined}>Contact</a>
        </nav>

        <div className="imp-nav-cta">
          <div className="imp-desktop-cta">
            <button className="imp-icon-btn" aria-label="Rechercher" onClick={() => setSearchOpen(true)}>
              <Search className="h-[19px] w-[19px]" />
            </button>
            <button className="imp-nav-btn ghost" onClick={() => setIsOpen(true)}>
              <span><FileText className="h-4 w-4" /> Voir le devis</span>
              {itemCount > 0 && <span className="imp-nav-badge">{itemCount}</span>}
            </button>
            <a href="/#newsletter" className="imp-nav-btn ghost imp-nav-newsletter" aria-label="Newsletter" title="Newsletter">
              <span><Send className="h-4 w-4" /> <span className="nb-label">Newsletter</span></span>
            </a>
          </div>
          <button className="imp-burger" aria-label="Menu" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" style={{ color: "var(--ink-text)" }} /> : <><span /><span /><span /></>}
          </button>
        </div>
      </div>

      {open && (
        <div className="imp-mobile">
          <button onClick={() => toggleMobile("prof")}>Professionnel <ChevronDown className="h-4 w-4" style={{ transform: mobileExpanded === "prof" ? "rotate(180deg)" : "none" }} /></button>
          {mobileExpanded === "prof" && <div className="imp-mobile-sub">{categories.map((c) => <a key={c.slug} href={`/professionnel/${c.slug}`} onClick={() => setOpen(false)}>{c.label}</a>)}</div>}
          <button onClick={() => toggleMobile("res")}>Résidentiel <ChevronDown className="h-4 w-4" style={{ transform: mobileExpanded === "res" ? "rotate(180deg)" : "none" }} /></button>
          {mobileExpanded === "res" && <div className="imp-mobile-sub">{categories.map((c) => <a key={c.slug} href={`/residentiel/${c.slug}`} onClick={() => setOpen(false)}>{c.label}</a>)}</div>}
          <a href="/consulting" onClick={() => setOpen(false)}>{consultingLabel}</a>
          <a href="/realisations" onClick={() => setOpen(false)}>{realisationsLabel}</a>
          <a href="/blog" onClick={() => setOpen(false)}>Blog</a>
          <a href="/contact" onClick={() => setOpen(false)}>Contact</a>
          <form onSubmit={handleSearch} style={{ marginTop: 12 }}>
            <input className="imp-search-input" style={{ width: "100%" }} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher..." />
          </form>
          <button className="imp-nav-btn ghost" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} onClick={() => { setIsOpen(true); setOpen(false); }}>
            <span><FileText className="h-4 w-4" /> Voir le devis {itemCount > 0 ? `(${itemCount})` : ""}</span>
          </button>
          <a href="/#newsletter" className="imp-nav-btn ghost" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} onClick={() => setOpen(false)}>
            <span><Send className="h-4 w-4" /> Newsletter</span>
          </a>
        </div>
      )}

      {searchOpen && (
        <div className="imp-search-overlay" role="dialog" aria-modal="true" aria-label="Recherche">
          <div className="iso-top">
            <span className="iso-title">Que cherchez-vous&nbsp;?</span>
            <button className="iso-close" aria-label="Fermer la recherche" onClick={closeSearch}><X className="h-5 w-5" /></button>
          </div>
          <div className="iso-body">
            <form onSubmit={handleSearch} className="iso-field">
              <Search className="iso-ico h-5 w-5" />
              <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Chercher" aria-label="Chercher" />
              {searchQuery && (
                <button type="button" className="iso-clear" aria-label="Effacer" onClick={() => setSearchQuery("")}><X className="h-4 w-4" /></button>
              )}
            </form>
            {showSuggestions && (
              <div className="iso-results">
                <h4>Produits</h4>
                <div className="iso-list">
                  {suggestions!.map((p) => (
                    <button key={p.id} onClick={() => handleSelectSuggestion(p.id)}>
                      <span className="iso-thumb">{p.image_url && <img src={p.image_url} alt="" />}</span>
                      <span className="iso-name">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
