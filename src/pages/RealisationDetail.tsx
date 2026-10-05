import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import { renderMarkdown } from "@/lib/markdown";
import { realisationCategoryLabel } from "@/lib/realisations";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ArrowLeft, ArrowRight, ImageIcon, Quote, Star } from "lucide-react";

type ImageKind = "3d" | "installation" | "resultat";

interface RealisationImage {
  id: string;
  kind: ImageKind;
  image_url: string | null;
  caption: string;
  sort_order: number;
}

interface KeyFact { label: string; value: string }

// ordre et titres des trois blocs d'images de la page
const SECTIONS: { kind: ImageKind; eyebrow: string; title: string; intro: string }[] = [
  { kind: "3d", eyebrow: "Conception", title: "La salle en 3D", intro: "Avant toute commande, l'implantation est dessinée et validée en 3D avec le client." },
  { kind: "installation", eyebrow: "Chantier", title: "L'installation", intro: "Livraison, montage et réglages réalisés par nos techniciens." },
  { kind: "resultat", eyebrow: "Résultat", title: "La salle terminée", intro: "L'espace livré, prêt à accueillir ses utilisateurs." },
];

const RealisationDetailPage = () => {
  const { slug } = useParams();
  useScrollReveal();

  const { data: realisation, isLoading } = useQuery({
    queryKey: ["realisation", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("realisations").select("*").eq("slug", slug!).eq("is_active", true).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: images } = useQuery({
    queryKey: ["realisation-images", realisation?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("realisation_images").select("*").eq("realisation_id", realisation!.id).order("sort_order");
      if (error) throw error;
      return (data || []) as RealisationImage[];
    },
    enabled: !!realisation?.id,
  });

  const { data: testimonials } = useQuery({
    queryKey: ["realisation-testimonials", realisation?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonials").select("*").eq("realisation_id", realisation!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!realisation?.id,
  });

  // navigation vers les autres réalisations
  const { data: all } = useQuery({
    queryKey: ["realisations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("realisations").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="imp min-h-screen">
        <Navbar />
        <div style={{ display: "flex", height: "60vh", alignItems: "center", justifyContent: "center" }}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!realisation) {
    return (
      <div className="imp min-h-screen">
        <Seo title="Réalisation introuvable" path={`/realisations/${slug}`} noindex />
        <Navbar />
        <div className="devis-empty">
          <p className="de-t">Réalisation introuvable</p>
          <a href="/realisations" className="btn btn-red"><span>Voir toutes les réalisations</span></a>
        </div>
        <Footer />
      </div>
    );
  }

  const r = realisation;
  const facts = (Array.isArray(r.key_facts) ? r.key_facts : []) as unknown as KeyFact[];
  const eyebrow = [r.subtitle || realisationCategoryLabel(r.category), r.location].filter(Boolean).join(" · ");
  const list = all || [];
  const index = list.findIndex((x) => x.id === r.id);
  const next = list.length > 1 ? list[(index + 1) % list.length] : null;

  return (
    <div className="imp min-h-screen">
      <Seo
        title={`${r.title} — réalisation${r.location ? ` à ${r.location}` : ""}`}
        description={r.description || `Découvrez le projet ${r.title} réalisé par Impulse Fitness Maroc.`}
        path={`/realisations/${r.slug}`}
        image={r.image_url || undefined}
      />
      <Navbar />

      <section className="page-hero dark real-hero">
        {r.image_url && <img className="ph-bg" src={r.image_url} alt="" aria-hidden="true" />}
        <div className="ph-scrim" />
        <div className="wrap">
          <a href="/realisations" className="catalog-back real-back"><ArrowLeft /> Toutes les réalisations</a>
          {eyebrow && <span className="eyebrow reveal">{eyebrow}</span>}
          <h1 className="reveal">{r.title}</h1>
          {r.description && <p className="reveal">{r.description}</p>}
        </div>
      </section>

      {facts.length > 0 && (
        <div className="wrap">
          <dl className="real-facts">
            {facts.map((f, i) => (
              <div key={i}><dt>{f.label}</dt><dd>{f.value}</dd></div>
            ))}
          </dl>
        </div>
      )}

      {r.content && (
        <section className="real-section">
          <div className="wrap real-story">
            <div className="article-body">{renderMarkdown(r.content)}</div>
          </div>
        </section>
      )}

      {SECTIONS.map((s) => {
        const blocks = (images || []).filter((img) => img.kind === s.kind);
        if (blocks.length === 0) return null;
        return (
          <section className={`real-section real-gallery-section kind-${s.kind}`} key={s.kind}>
            <div className="wrap">
              <span className="eyebrow">{s.eyebrow}</span>
              <h2 className="display-md" style={{ marginTop: 12 }}>{s.title}</h2>
              <p className="real-intro">{s.intro}</p>
              <div className={`real-gallery count-${Math.min(blocks.length, 3)}`}>
                {blocks.map((img) => (
                  <figure key={img.id} className={img.image_url ? "" : "is-empty"}>
                    {img.image_url ? (
                      <img src={img.image_url} alt={img.caption || r.title} loading="lazy" decoding="async" />
                    ) : (
                      <div className="real-placeholder" aria-hidden="true"><ImageIcon /><span>Image à venir</span></div>
                    )}
                    {img.caption && <figcaption>{img.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {testimonials && testimonials.length > 0 && (
        <section className="real-section">
          <div className="wrap">
            {testimonials.map((t) => (
              <blockquote className="real-quote" key={t.id}>
                <Quote className="rq-ico" />
                <p>{t.content}</p>
                <footer>
                  <span className="rq-stars" aria-label={`${t.rating} sur 5`}>{Array.from({ length: t.rating }).map((_, i) => <Star key={i} />)}</span>
                  <strong>{t.author_name}</strong>{t.author_role && <> — {t.author_role}</>}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      <section className="real-cta">
        <div className="wrap">
          <div>
            <h2 className="display-md">Un projet similaire ?</h2>
            <p>Nos experts étudient votre espace et vous proposent une implantation en 3D.</p>
          </div>
          <div className="real-cta-actions">
            <a href="/contact" className="btn btn-red"><span>Contactez-nous</span></a>
            {next && <a href={`/realisations/${next.slug}`} className="real-next">Réalisation suivante : {next.title} <ArrowRight /></a>}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default RealisationDetailPage;
