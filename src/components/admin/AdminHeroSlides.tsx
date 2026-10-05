import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Save, GripVertical, ImageIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Slide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const AdminHeroSlides = () => {
  const qc = useQueryClient();
  const [editSlides, setEditSlides] = useState<Slide[] | null>(null);
  const [carouselMode, setCarouselMode] = useState<"full" | "simple">("full");

  // Fetch carousel mode
  const { data: modeData } = useQuery({
    queryKey: ["carousel-mode-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_settings")
        .select("*")
        .eq("key", "carousel_mode")
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (modeData) setCarouselMode(modeData.value as "full" | "simple");
  }, [modeData]);

  const saveModeMutation = useMutation({
    mutationFn: async (mode: string) => {
      if (modeData) {
        const { error } = await supabase.from("contact_settings").update({ value: mode }).eq("key", "carousel_mode");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contact_settings").insert({ key: "carousel_mode", value: mode });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carousel-mode-admin"] });
      qc.invalidateQueries({ queryKey: ["carousel-mode"] });
      toast.success("Mode carousel mis à jour !");
    },
  });

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

  const handleImageUpload = async (index: number, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `hero/${Date.now()}-${index}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Erreur upload image"); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    updateField(index, "image_url", urlData.publicUrl);
    toast.success("Image uploadée !");
  };

  const addSlide = () => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      tag: "NOUVEAU",
      title: "TITRE\nDU SLIDE",
      subtitle: "Description du slide",
      cta_text: "Découvrir",
      cta_link: "#",
      image_url: null,
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
      await supabase.from("hero_slides").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const toInsert = currentSlides.map((s, i) => ({
        tag: s.tag,
        title: s.title,
        subtitle: s.subtitle,
        cta_text: s.cta_text,
        cta_link: s.cta_link,
        image_url: s.image_url,
        sort_order: i,
        is_active: s.is_active,
      }));
      const { error } = await supabase.from("hero_slides").insert(toInsert);
      if (error) throw error;
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
          <h1 className="font-display text-2xl font-bold text-foreground">Carousel Hero</h1>
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

      {/* Carousel mode toggle */}
      <div className="mb-6 rounded-sm border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Mode d'affichage</h3>
        <div className="flex gap-3">
          <button
            onClick={() => { setCarouselMode("full"); saveModeMutation.mutate("full"); }}
            className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors ${carouselMode === "full" ? "bg-accent text-accent-foreground" : "border border-border bg-background text-foreground hover:bg-secondary"}`}
          >
            Complet (texte + boutons + overlay)
          </button>
          <button
            onClick={() => { setCarouselMode("simple"); saveModeMutation.mutate("simple"); }}
            className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors ${carouselMode === "simple" ? "bg-accent text-accent-foreground" : "border border-border bg-background text-foreground hover:bg-secondary"}`}
          >
            Simple (images uniquement)
          </button>
        </div>
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

            <div className="grid gap-4 md:grid-cols-2">
              {/* Image */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Image</label>
                {slide.image_url ? (
                  <div className="relative aspect-video overflow-hidden rounded-sm border border-border">
                    <img src={slide.image_url} alt="" className="h-full w-full object-cover" />
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-foreground/0 opacity-0 transition-opacity hover:bg-foreground/30 hover:opacity-100">
                      <span className="rounded-sm bg-background/80 px-3 py-1.5 text-xs font-medium">Changer</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0])} />
                    </label>
                  </div>
                ) : (
                  <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-border bg-secondary/50 transition-colors hover:border-accent/50">
                    <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Cliquez pour uploader</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0])} />
                  </label>
                )}
              </div>

              {/* Text fields - only show if full mode */}
              {carouselMode === "full" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Tag</label>
                    <input value={slide.tag} onChange={(e) => updateField(index, "tag", e.target.value)} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Titre (\\n pour retour à la ligne)</label>
                    <textarea value={slide.title} onChange={(e) => updateField(index, "title", e.target.value)} rows={2} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Sous-titre</label>
                    <input value={slide.subtitle} onChange={(e) => updateField(index, "subtitle", e.target.value)} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">Texte CTA</label>
                      <input value={slide.cta_text} onChange={(e) => updateField(index, "cta_text", e.target.value)} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">Lien CTA</label>
                      <input value={slide.cta_link} onChange={(e) => updateField(index, "cta_link", e.target.value)} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminHeroSlides;
