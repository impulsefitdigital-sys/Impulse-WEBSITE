import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const HomeBlogSection = () => {
  const { data: posts } = useQuery({
    queryKey: ["home-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, published_at, created_at, author")
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  if (!posts || posts.length === 0) return null;

  return (
    <section className="sec blog sec-alt" id="blog">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="eyebrow reveal">Blog</span>
            <h2 className="display-md sec-title reveal">Actualités &amp; expertise.</h2>
          </div>
          <Link to="/blog" className="sec-index reveal">Tous les articles →</Link>
        </div>

        <div className="blog-grid">
          {posts.map((p) => (
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
      </div>
    </section>
  );
};

export default HomeBlogSection;
