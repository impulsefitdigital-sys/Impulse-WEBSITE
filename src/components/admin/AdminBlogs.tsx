import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit, ArrowLeft, Upload, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const BlogForm = ({ post, onClose }: { post: any | null; onClose: () => void }) => {
  const qc = useQueryClient();
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url || "");
  const [author, setAuthor] = useState(post?.author || "Impulse Fitness");
  const [isPublished, setIsPublished] = useState(post?.is_published ?? false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ic = "w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, file);
    if (error) { toast.error("Erreur upload"); return; }
    const url = supabase.storage.from("blog-images").getPublicUrl(path).data.publicUrl;
    setCoverImageUrl(url);
    toast.success("Image uploadée");
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Titre requis"); return; }
    const finalSlug = slug.trim() || slugify(title);
    setSaving(true);
    const payload = {
      title: title.trim(), slug: finalSlug, excerpt, content, cover_image_url: coverImageUrl || null,
      author: author.trim() || "Impulse Fitness", is_published: isPublished,
      published_at: isPublished ? (post?.published_at || new Date().toISOString()) : null,
    };
    const { error } = post?.id
      ? await supabase.from("blog_posts").update(payload).eq("id", post.id)
      : await supabase.from("blog_posts").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(post?.id ? "Article mis à jour" : "Article créé");
    qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    onClose();
  };

  return (
    <div className="max-w-3xl">
      <button onClick={onClose} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <h1 className="mb-6 font-display text-2xl font-bold text-foreground">{post?.id ? "Modifier l'article" : "Nouvel article"}</h1>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Titre *</label>
          <input value={title} onChange={(e) => { setTitle(e.target.value); if (!post?.id && !slug) setSlug(slugify(e.target.value)); }} className={ic} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug (URL)</label>
          <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className={ic} placeholder="mon-article" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Auteur</label>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} className={ic} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Image de couverture</label>
          <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUpload} />
          {coverImageUrl ? (
            <div className="relative">
              <img src={coverImageUrl} alt="" className="h-48 w-full rounded-sm object-cover" />
              <button onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 rounded-sm bg-background/80 px-3 py-1 text-xs">Changer</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent">
              <Upload className="h-6 w-6" /><span className="text-xs">Uploader une image</span>
            </button>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Extrait</label>
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className={ic} placeholder="Résumé court de l'article" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Contenu (Markdown supporté)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={15} className={`${ic} font-mono text-xs`} placeholder="# Titre&#10;&#10;Votre contenu…" />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span className="text-sm font-medium text-foreground">Publié</span>
        </label>
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving} className="rounded-sm bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">{saving ? "…" : (post?.id ? "Mettre à jour" : "Créer")}</button>
          <button onClick={onClose} className="rounded-sm border border-border px-6 py-3 text-sm text-muted-foreground hover:text-foreground">Annuler</button>
        </div>
      </div>
    </div>
  );
};

const AdminBlogs = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null | "new">(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Article supprimé");
    qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
  };

  const togglePublish = async (post: any) => {
    const { error } = await supabase.from("blog_posts").update({
      is_published: !post.is_published,
      published_at: !post.is_published ? (post.published_at || new Date().toISOString()) : post.published_at,
    }).eq("id", post.id);
    if (error) { toast.error("Erreur"); return; }
    qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
  };

  if (editing) return <BlogForm post={editing === "new" ? null : editing} onClose={() => setEditing(null)} />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Blog</h1>
        <button onClick={() => setEditing("new")} className="flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"><Plus className="h-4 w-4" /> Nouvel article</button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : !posts || posts.length === 0 ? (
        <p className="rounded-sm border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Aucun article. Créez votre premier article.</p>
      ) : (
        <div className="space-y-2">
          {posts.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 rounded-sm border border-border bg-card p-3">
              {p.cover_image_url && <img src={p.cover_image_url} alt="" className="h-14 w-20 flex-shrink-0 rounded-sm object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-foreground">{p.title}</h3>
                  {!p.is_published && <span className="rounded-sm bg-muted px-1.5 text-[10px] uppercase text-muted-foreground">Brouillon</span>}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">/blog/{p.slug}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => togglePublish(p)} className="p-2 text-muted-foreground hover:text-accent" title={p.is_published ? "Dépublier" : "Publier"}>
                  {p.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => setEditing(p)} className="p-2 text-muted-foreground hover:text-accent"><Edit className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBlogs;
