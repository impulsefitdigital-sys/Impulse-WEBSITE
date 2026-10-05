import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import { absoluteUrl } from "@/lib/seo-config";
import Footer from "@/components/Footer";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { renderMarkdown } from "@/lib/markdown";

const BlogDetailPage = () => {
  const { slug } = useParams();
  useScrollReveal();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", slug!).eq("is_published", true).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  return (
    <div className="imp min-h-screen">
      <Navbar />
      {isLoading ? (
        <div style={{ display: "flex", height: "60vh", alignItems: "center", justifyContent: "center" }}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : !post ? (
        <div className="article-wrap no-cover" style={{ textAlign: "center" }}>
          <h1>Article introuvable</h1>
          <Link to="/blog" className="a-back" style={{ marginTop: 20 }}><ArrowLeft /> Retour au blog</Link>
        </div>
      ) : (
        <article>
          <Seo
            title={post.title}
            description={post.excerpt || post.title}
            path={`/blog/${post.slug}`}
            image={post.cover_image_url || undefined}
            type="article"
            jsonLd={{
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              image: post.cover_image_url ? [post.cover_image_url] : undefined,
              datePublished: post.published_at || post.created_at,
              dateModified: (post as any).updated_at || post.published_at || post.created_at,
              author: { "@type": "Person", name: post.author },
              description: post.excerpt || undefined,
              mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
            }}
          />

          {post.cover_image_url && (
            <div className="article-cover">
              <img src={post.cover_image_url} alt={post.title} />
            </div>
          )}

          <div className={`article-wrap${post.cover_image_url ? "" : " no-cover"}`}>
            <Link to="/blog" className="a-back reveal"><ArrowLeft /> Tous les articles</Link>
            <div className="a-meta reveal">
              {post.author && <span className="m-item"><User /> {post.author}</span>}
              <span className="m-item"><Calendar /> {new Date(post.published_at || post.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
            </div>
            <h1 className="reveal">{post.title}</h1>
            {post.excerpt && <p className="a-excerpt reveal">{post.excerpt}</p>}
            <div className="article-body">{renderMarkdown(post.content || "")}</div>
            <div className="article-cta">
              <a href="/contact" className="btn btn-red"><span>Contactez-nous pour une consultation personnalisée</span></a>
            </div>
          </div>
        </article>
      )}
      <Footer />
    </div>
  );
};

export default BlogDetailPage;
