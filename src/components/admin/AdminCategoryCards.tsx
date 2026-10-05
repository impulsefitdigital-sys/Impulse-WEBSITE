import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Save, Eye, EyeOff, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Card {
  id: string;
  title: string;
  description: string;
  cta_text: string;
  cta_link: string;
  cta_color: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const AdminCategoryCards = () => {
  const qc = useQueryClient();
  const [editCards, setEditCards] = useState<Card[] | null>(null);

  const { data: cards, isLoading } = useQuery({
    queryKey: ["admin-category-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_cards")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Card[];
    },
  });

  const current = editCards || cards || [];

  const updateField = (i: number, field: keyof Card, value: string | boolean) => {
    const updated = [...current];
    updated[i] = { ...updated[i], [field]: value };
    setEditCards(updated);
  };

  const handleImageUpload = async (i: number, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `category-cards/${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Erreur upload"); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    updateField(i, "image_url", urlData.publicUrl);
    toast.success("Image uploadée");
  };

  const addCard = () => {
    setEditCards([...current, {
      id: crypto.randomUUID(),
      title: "Nouvelle catégorie",
      description: "Description de la catégorie",
      cta_text: "Découvrir",
      cta_link: "#",
      cta_color: "white",
      image_url: null,
      sort_order: current.length,
      is_active: true,
    }]);
  };

  const removeCard = (i: number) => setEditCards(current.filter((_, idx) => idx !== i));

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("category_cards").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const toInsert = current.map((c, i) => ({
        title: c.title,
        description: c.description,
        cta_text: c.cta_text,
        cta_link: c.cta_link,
        cta_color: c.cta_color || "white",
        image_url: c.image_url,
        sort_order: i,
        is_active: c.is_active,
      }));
      const { error } = await supabase.from("category_cards").insert(toInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-category-cards"] });
      qc.invalidateQueries({ queryKey: ["category-cards"] });
      setEditCards(null);
      toast.success("Cartes sauvegardées !");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde."),
  });

  if (isLoading) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cartes Catégories</h1>
          <p className="text-sm text-muted-foreground">Gérez les cartes de catégories sous le carousel hero.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addCard} className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
            <Plus className="h-4 w-4" /> Ajouter
          </button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saveMutation.isPending ? "Sauvegarde..." : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {current.map((card, i) => (
          <div key={card.id} className="rounded-sm border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">CARTE {i + 1}</span>
                <button onClick={() => updateField(i, "is_active", !card.is_active)} className={`ml-2 rounded-sm px-2 py-0.5 text-xs ${card.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {card.is_active ? <><Eye className="mr-1 inline h-3 w-3" />Actif</> : <><EyeOff className="mr-1 inline h-3 w-3" />Inactif</>}
                </button>
              </div>
              <button onClick={() => removeCard(i)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Image</label>
                {card.image_url ? (
                  <div className="relative aspect-video overflow-hidden rounded-sm border border-border">
                    <img src={card.image_url} alt="" className="h-full w-full object-cover" />
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-foreground/0 opacity-0 transition-opacity hover:bg-foreground/30 hover:opacity-100">
                      <span className="rounded-sm bg-background/80 px-3 py-1.5 text-xs font-medium">Changer</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(i, e.target.files[0])} />
                    </label>
                  </div>
                ) : (
                  <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-border bg-secondary/50 transition-colors hover:border-accent/50">
                    <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Cliquez pour uploader</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(i, e.target.files[0])} />
                  </label>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Titre</label>
                  <input value={card.title} onChange={(e) => updateField(i, "title", e.target.value)} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Description</label>
                  <textarea value={card.description} onChange={(e) => updateField(i, "description", e.target.value)} rows={2} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Texte CTA</label>
                    <input value={card.cta_text} onChange={(e) => updateField(i, "cta_text", e.target.value)} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Lien CTA</label>
                    <input value={card.cta_link} onChange={(e) => updateField(i, "cta_link", e.target.value)} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Couleur bouton</label>
                    <select
                      value={card.cta_color || "white"}
                      onChange={(e) => updateField(i, "cta_color", e.target.value)}
                      className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="white">Blanc</option>
                      <option value="red">Rouge</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCategoryCards;
