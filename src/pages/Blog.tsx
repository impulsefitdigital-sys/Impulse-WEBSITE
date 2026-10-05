import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import { ArrowRight, Calendar } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import blogHero from "@/assets/blog-hero.jpg";

const BlogPage = () => {
  useScrollReveal();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("is_published", true).order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="imp min-h-screen">
      <Seo title="Blog" description="Actualités, conseils et guides fitness par Impulse Fitness Maroc." path="/blog" />
      <Navbar />

      <section className="page-hero dark">
        <img className="ph-bg" src={blogHero} alt="" aria-hidden="true" />
        <div className="ph-scrim" />
        <div className="wrap">
          <span className="eyebrow reveal">Le blog</span>
          <h1 className="reveal">Conseils &amp; inspirations fitness.</h1>
          <p className="reveal">Découvrez nos guides, conseils d'experts et actualités sur l'équipement de fitness professionnel et résidentiel.</p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          {isLoading ? (
            <p style={{ color: "var(--steel)" }}>Chargement…</p>
          ) : !posts || posts.length === 0 ? (
            <p style={{ color: "var(--steel)" }}>Aucun article pour le moment.</p>
          ) : (
            <div className="blog-grid">
              {posts.map((p: any) => (
                <article className="post reveal" key={p.id}>
                  <Link to={`/blog/${p.slug}`} className="pimg">
                    {p.cover_image_url && <img src={p.cover_image_url} alt={p.title} loading="lazy" />}
                  </Link>
                  <div className="pbody">
                    <span className="pdate">
                      <Calendar />{" "}
                      {new Date(p.published_at || p.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                    <Link to={`/blog/${p.slug}`}><h3>{p.title}</h3></Link>
                    {p.excerpt && <p className="pexc">{p.excerpt}</p>}
                    <Link to={`/blog/${p.slug}`} className="plink"><span>Lire l'article <ArrowRight /></span></Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogPage;
