import { useInView, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Shield, Lightbulb, Palette, Package, Wrench, HeartPulse, Star, Users, PackagePlus, Component } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, any> = { Shield, Lightbulb, Component, Palette, Package, Wrench, HeartPulse, Star, Users, PackagePlus };

const Counter = (props: { prefix: string; target: number; suffix: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const isPct = props.suffix.startsWith("%");
  useEffect(() => {
    if (!inView || !ref.current) return;
    const mv = { v: 0 };
    const controls = animate(0, props.target, {
      duration: 2, ease: "easeOut",
      onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.floor(v).toLocaleString("fr-FR"); },
    });
    return controls.stop;
  }, [inView, props.target]);
  return (
    <div className="figure reveal">
      <div className="fnum">
        {props.prefix && <small>{props.prefix}</small>}
        <span ref={ref}>0</span>
        {isPct && <small>%</small>}
      </div>
      <p className="flbl">{isPct ? props.suffix.slice(1).trim() : props.suffix}</p>
    </div>
  );
};

// YouTube facade: show a cover image + play button, load the iframe only on click.
const YouTubeFacade = ({ url, title, poster }: { url: string; title: string; poster?: string }) => {
  const [play, setPlay] = useState(false);
  const [hiRes, setHiRes] = useState(true);
  const id = (url.match(/(?:embed\/|watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/) || [])[1];
  if (!id) {
    return (
      <div className="video-frame reveal">
        <iframe src={url} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  const cover = poster || `https://img.youtube.com/vi/${id}/${hiRes ? "maxresdefault" : "hqdefault"}.jpg`;
  return (
    <div className="video-frame reveal">
      {play ? (
        <iframe src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      ) : (
        <button className="video-poster" onClick={() => setPlay(true)} aria-label={`Lire la vidéo : ${title}`}>
          <img src={cover} alt={title} onError={() => { if (!poster) setHiRes(false); }} loading="lazy" />
          <span className="video-play"><Play fill="currentColor" /></span>
        </button>
      )}
    </div>
  );
};

const CardGrid = ({ items, cols }: { items: any[]; cols: 3 | 4 }) => (
  <div className={`card-grid cols-${cols}`}>
    {items.map((it: any) => {
      const Icon = iconMap[it.icon] || Shield;
      return (
        <div className="g-card reveal" key={it.title}>
          <span className="icon"><Icon /></span>
          <h4>{it.title}</h4>
          <p>{it.desc}</p>
        </div>
      );
    })}
  </div>
);

const AboutImpulseSection = () => {
  const { data: sections, isLoading } = useQuery({
    queryKey: ["about-sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("about_sections").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return null;

  const getSection = (key: string) => (sections || []).find((x: any) => x.key === key);
  const parseJson = (content: string) => { try { return JSON.parse(content); } catch { return []; } };

  const intro = getSection("intro");
  const international = getSection("international");
  const chiffresCles = getSection("chiffres_cles");
  const pillars = getSection("pillars");
  const whyChoose = getSection("why_choose");
  const whyMaroc = getSection("why_maroc");
  const whyMarocCards = getSection("why_maroc_cards");
  const video = getSection("video");

  const pillarItems = pillars ? parseJson(pillars.content) : [];
  const whyChooseItems = whyChoose ? parseJson(whyChoose.content) : [];
  const whyMarocItems = whyMarocCards ? parseJson(whyMarocCards.content) : [];

  return (
    <section id="about" className="sec sec-alt about">
      <div className="wrap">
        {intro && (
          <div>
            <h2 className="display-md reveal" style={{ marginBottom: 24 }}>
              {intro.title || "À propos de la marque Impulse"}
            </h2>
            <p className="about-lead reveal" style={{ whiteSpace: "pre-line" }}>{intro.content}</p>
          </div>
        )}

        {international && (
          <div className="about-block">
            <h3 className="reveal">{international.title}</h3>
            <p className="about-lead reveal">{international.content}</p>
          </div>
        )}

        {chiffresCles && (
          <div className="about-block">
            <h3 className="reveal">{chiffresCles.title}</h3>
            <div className="figures">
              {chiffresCles.content.split("\n").map((line: string, i: number) => {
                const parts = line.split("|").map((p) => p.trim());
                if (parts.length < 3) return null;
                const [prefix, numberStr, suffix] = parts;
                const target = parseInt(numberStr, 10);
                if (isNaN(target)) return null;
                return <Counter key={i} prefix={prefix} target={target} suffix={suffix} />;
              })}
            </div>
          </div>
        )}

        {pillars && pillarItems.length > 0 && (
          <div className="about-block">
            <h3 className="reveal">{pillars.title}</h3>
            <CardGrid items={pillarItems} cols={4} />
          </div>
        )}

        {whyChoose && whyChooseItems.length > 0 && (
          <div className="about-block">
            <h3 className="reveal">{whyChoose.title}</h3>
            <CardGrid items={whyChooseItems} cols={3} />
          </div>
        )}

        {whyMaroc && (
          <div className="about-block">
            <h3 className="reveal">{whyMaroc.title}</h3>
            <p className="about-lead reveal" style={{ marginBottom: 24 }}>{whyMaroc.content}</p>
            {whyMarocItems.length > 0 && <CardGrid items={whyMarocItems} cols={3} />}
          </div>
        )}

        {video && (
          <div className="about-block">
            <h3 className="reveal">{video.title}</h3>
            <YouTubeFacade url={video.content} title={video.title || "Impulse Fitness — présentation"} />
          </div>
        )}
      </div>
    </section>
  );
};

export default AboutImpulseSection;
