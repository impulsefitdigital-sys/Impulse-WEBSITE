import { optimizeImage, uploadOptions, ImageHint } from "@/lib/images";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Save, GripVertical, ImageIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import LinkPicker from "@/components/admin/LinkPicker";

interface Slide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_url: string | null;
  mobile_image_url: string | null;
  show_cta: boolean;
  sort_order: number;
  is_active: boolean;
}

const AdminHeroSlides = () => {
  const qc = useQueryClient();
  const [editSlides, setEditSlides] = useState<Slide[] | null>(null);

  const { data: slides, isLoading } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Slide[];
    },
  });

  const currentSlides = editSlides || slides || [];

  const updateField = (index: number, field: keyof Slide, value: string | boolean) => {
    const updated = [...currentSlides];
    updated[index] = { ...updated[index], [field]: value };
    setEditSlides(updated);
  };

  const handleImageUpload = async (index: number, file: File, field: "image_url" | "mobile_image_url" = "image_url") => {
    file = await optimizeImage(file, field === "mobile_image_url" ? "heroMobile" : "hero");
    const ext = file.name.split(".").pop();
    const path = `hero/${Date.now()}-${index}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, uploadOptions(file));
    if (error) { toast.error("Erreur upload image"); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    updateField(index, field, urlData.publicUrl);
    toast.success("Image uploadée !");
  };

  const addSlide = () => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      tag: "NOUVEAU",
      title: "TITRE\nDU SLIDE",
      subtitle: "Description du slide",
      cta_text: "Découvrir",
      cta_link: "",
      image_url: null,
      mobile_image_url: null,
      show_cta: false,
      sort_order: currentSlides.length,
      is_active: true,
    };
    setEditSlides([...currentSlides, newSlide]);
  };

  const removeSlide = (index: number) => {
    setEditSlides(currentSlides.filter((_, i) => i !== index));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rows = currentSlides.map((s, i) => ({
        id: s.id,
        tag: s.tag,
        title: s.title,
        subtitle: s.subtitle,
        cta_text: s.cta_text,
        cta_link: s.cta_link,
        image_url: s.image_url,
        mobile_image_url: s.mobile_image_url || null,
        show_cta: !!s.show_cta,
        sort_order: i,
        is_active: s.is_active,
      }));
      if (rows.length) {
        const { error } = await supabase.from("hero_slides").upsert(rows as any);
        if (error) throw error;
      }
      const keep = new Set(rows.map((r) => r.id));
      const removed = (slides || []).filter((s) => !keep.has(s.id)).map((s) => s.id);
      if (removed.length) {
        const { error } = await supabase.from("hero_slides").delete().in("id", removed);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      qc.invalidateQueries({ queryKey: ["hero-slides"] });
      setEditSlides(null);
      toast.success("Slides sauvegardés !");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde."),
  });

  if (isLoading) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Carrousel d'accueil</h1>
          <p className="text-sm text-muted-foreground">Gérez les slides de la page d'accueil.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addSlide} className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
            <Plus className="h-4 w-4" /> Ajouter
          </button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saveMutation.isPending ? "Sauvegarde..." : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-sm border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        <p><strong className="text-foreground">Image ordinateur :</strong> 1920 × 750 px. Sur téléphone, seule la partie centrale reste visible.</p>
        <p><strong className="text-foreground">Image téléphone (facultative) :</strong> 1080 × 920 px, affichée à la place sur les petits écrans.</p>
        <p>Les images sont optimisées automatiquement à l'envoi. Après « Enregistrer », le site est à jour en moins d'une minute.</p>
      </div>

      <div className="space-y-4">
        {currentSlides.map((slide, index) => (
          <div key={slide.id} className="rounded-sm border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">SLIDE {index + 1}</span>
                <button onClick={() => updateField(index, "is_active", !slide.is_active)} className={`ml-2 rounded-sm px-2 py-0.5 text-xs ${slide.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {slide.is_active ? <><Eye className="mr-1 inline h-3 w-3" />Actif</> : <><EyeOff className="mr-1 inline h-3 w-3" />Inactif</>}
                </button>
              </div>
              <button onClick={() => removeSlide(index)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-[2fr_1fr_1.4fr]">
              {/* Image ordinateur */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Image ordinateur</label>
                {slide.image_url ? (
                  <div className="relative overflow-hidden rounded-sm border border-border" style={{ aspectRatio: "1920 / 750" }}>
                    <img src={slide.image_url} alt="" className="h-full w-full object-cover" />
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-foreground/0 opacity-0 transition-opacity hover:bg-foreground/30 hover:opacity-100">
                      <span className="rounded-sm bg-background/80 px-3 py-1.5 text-xs font-medium">Changer</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0])} />
                    </label>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-border bg-secondary/50 transition-colors hover:border-accent/50" style={{ aspectRatio: "1920 / 750" }}>
                    <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Cliquez pour envoyer</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0])} />
                  </label>
                )}
                <ImageHint kind="hero" />
              </div>

              {/* Image téléphone */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Image téléphone <span className="font-normal text-muted-foreground">(facultative)</span></label>
                {slide.mobile_image_url ? (
                  <div className="relative overflow-hidden rounded-sm border border-border" style={{ aspectRatio: "1080 / 920" }}>
                    <img src={slide.mobile_image_url} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => updateField(index, "mobile_image_url", "")} className="absolute right-1 top-1 rounded bg-background/80 p-1" title="Retirer l'image téléphone"><Trash2 className="h-3 w-3" /></button>
                    <label className="absolute inset-x-0 bottom-0 flex cursor-pointer justify-center bg-background/70 py-1 text-xs font-medium">
                      Changer
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0], "mobile_image_url")} />
                    </label>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-border bg-secondary/50 px-2 text-center transition-colors hover:border-accent/50" style={{ aspectRatio: "1080 / 920" }}>
                    <ImageIcon className="mb-2 h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Sinon, l'image ordinateur est recadrée au centre</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0], "mobile_image_url")} />
                  </label>
                )}
                <ImageHint kind="heroMobile" />
              </div>

              {/* Bouton */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input type="checkbox" id={`show-cta-${slide.id}`} checked={!!slide.show_cta} onChange={(e) => updateField(index, "show_cta", e.target.checked)} className="h-4 w-4 accent-[hsl(var(--accent))]" />
                  Afficher un bouton sur cette image
                </label>
                <div className={slide.show_cta ? "" : "pointer-events-none opacity-50"}>
                  <label className="mb-1 block text-xs font-medium text-foreground" htmlFor={`cta-text-${slide.id}`}>Texte du bouton</label>
                  <input id={`cta-text-${slide.id}`} value={slide.cta_text || ""} maxLength={40} onChange={(e) => updateField(index, "cta_text", e.target.value)} placeholder="Ex. : Découvrir la gamme IT95" className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  <label className="mb-1 mt-3 block text-xs font-medium text-foreground" htmlFor={`cta-link-${slide.id}`}>Le bouton mène vers</label>
                  <LinkPicker id={`cta-link-${slide.id}`} value={slide.cta_link || ""} onChange={(v) => updateField(index, "cta_link", v)} />
                  {slide.show_cta && (!slide.cta_text || !slide.cta_link || slide.cta_link === "#") && (
                    <p className="mt-2 text-xs text-destructive">Ajoutez un texte et une destination, sinon le bouton ne s'affiche pas.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminHeroSlides;
