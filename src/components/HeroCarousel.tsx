import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Utilisé par la bande de stats sous le hero, actuellement désactivée (voir plus bas)
const HERO_STATS = [
  { num: "50", sup: "+", lbl: "Ans d'innovation" },
  { num: "100", sup: "+", lbl: "Pays desservis" },
  { num: "ISO", sup: "", lbl: "Qualité certifiée" },
  { num: "48", sup: "h", lbl: "Devis sur mesure" },
];

const isPlaceholder = (t?: string | null) =>
  !t || /titre\s*\n?\s*du\s*slide/i.test(t.trim());

const HeroCarousel = () => {
  const [current, setCurrent] = useState(0);
  const dragX = useRef<number | null>(null);

  const { data: dbSlides } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const slides = useMemo(
    () =>
      (dbSlides ?? [])
        .filter((s) => s.image_url)
        .map((s) => ({
          image: s.image_url as string,
          tag: s.tag || "Distributeur officiel Impulse Fitness · Maroc",
          title: isPlaceholder(s.title) ? "" : (s.title as string),
          cta: s.cta_text || "Découvrir les gammes",
          link: s.cta_link || "/professionnel",
        })),
    [dbSlides]
  );

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6500);
    return () => window.clearInterval(id);
  }, [slides.length]);

  useEffect(() => {
    if (current >= slides.length && slides.length) setCurrent(0);
  }, [current, slides.length]);

  const go = (dir: number) =>
    setCurrent((c) => (c + dir + slides.length) % slides.length);
  const active = slides[current];

  return (
    <section id="top">
      <h1 className="sr-only">
        Impulse Fitness Maroc — Équipements de fitness professionnels et résidentiels au Maroc
      </h1>

      <div
        className="hero-media"
        onPointerDown={(e) => { dragX.current = e.clientX; }}
        onPointerUp={(e) => {
          if (dragX.current == null || slides.length <= 1) return;
          const dx = e.clientX - dragX.current;
          if (dx > 60) go(-1);
          else if (dx < -60) go(1);
          dragX.current = null;
        }}
      >
        <div className="hero-track" style={{ transform: `translateX(-${current * 100}%)` }}>
          {slides.map((s, i) => (
            <div className={`hero-slide${i === current ? " active" : ""}`} key={i}>
              <img className="hero-bg" src={s.image} alt="" aria-hidden="true" draggable={false} />
              <img className="hero-fg" src={s.image} alt={s.title || "Équipement de fitness Impulse"} loading={i === 0 ? "eager" : "lazy"} draggable={false} />
            </div>
          ))}
        </div>
        <div className="hero-scrim" />

        {slides.length > 1 && (
          <>
            <button className="hero-arrow prev" aria-label="Précédent" onClick={() => go(-1)}><ChevronLeft /></button>
            <button className="hero-arrow next" aria-label="Suivant" onClick={() => go(1)}><ChevronRight /></button>
          </>
        )}

        {/* Texte du hero retiré à la demande du client — décommenter pour le réafficher
        <div className="wrap">
          <span className="eyebrow">{active?.tag || "Distributeur officiel Impulse Fitness · Maroc"}</span>
          {active?.title && <h2 style={{ margin: 0 }}>{active.title}</h2>}
        </div>
        */}

        {slides.length > 1 && (
          <div className="hero-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setCurrent(i)}
                style={{ width: i === current ? 30 : 12, background: i === current ? "var(--red)" : undefined }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bande de stats retirée à la demande du client — décommenter pour la réactiver
      <div className="hero-stats-band">
        <div className="wrap">
          <div className="stats reveal">
            {HERO_STATS.map((s) => (
              <div className="stat" key={s.lbl}>
                <div className="num">{s.num}{s.sup && <small>{s.sup}</small>}</div>
                <div className="lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      */}
    </section>
  );
};

export default HeroCarousel;
