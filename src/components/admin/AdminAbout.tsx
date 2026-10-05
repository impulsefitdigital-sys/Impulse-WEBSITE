import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Eye, EyeOff } from "lucide-react";

interface Section {
  id: string;
  key: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
}

const sectionLabels: Record<string, string> = {
  intro: "Introduction",
  international: "Marque Internationale",
  chiffres_cles: "Chiffres Clés (une ligne par puce)",
  pillars: "Piliers d'Excellence (JSON)",
  why_choose: "Pourquoi Choisir Impulse (JSON)",
  why_maroc: "Pourquoi Impulse Maroc",
  why_maroc_cards: "Cartes Impulse Maroc (JSON)",
  video: "Vidéo (URL embed)",
};

const AdminAbout = () => {
  const qc = useQueryClient();
  const [editSections, setEditSections] = useState<Section[]>([]);

  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin-about"],
    queryFn: async () => {
      const { data, error } = await supabase.from("about_sections").select("*").order("sort_order");
      if (error) throw error;
      return (data || []) as Section[];
    },
  });

  useEffect(() => {
    if (sections && sections.length > 0) {
      setEditSections(sections);
    }
  }, [sections]);

  const updateField = (index: number, field: keyof Section, value: any) => {
    setEditSections((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const section of editSections) {
        const { error } = await supabase
          .from("about_sections")
          .update({ title: section.title, content: section.content, is_active: section.is_active, sort_order: section.sort_order })
          .eq("id", section.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-about"] });
      qc.invalidateQueries({ queryKey: ["about-sections"] });
      toast.success("Sections sauvegardées");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">À propos</h1>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>

      {editSections.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune section trouvée.</p>
      ) : (
        <div className="space-y-4">
          {editSections.map((section, i) => (
            <div key={section.id} className="rounded-sm border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{sectionLabels[section.key] || section.key}</h3>
                <button onClick={() => updateField(i, "is_active", !section.is_active)} className="rounded-sm p-1.5 text-muted-foreground hover:bg-secondary" title={section.is_active ? "Désactiver" : "Activer"}>
                  {section.is_active ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Titre</label>
                  <input value={section.title} onChange={(e) => updateField(i, "title", e.target.value)} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Contenu</label>
                  <textarea value={section.content} onChange={(e) => updateField(i, "content", e.target.value)} rows={section.key.includes("cards") || section.key === "pillars" || section.key === "why_choose" ? 8 : 3} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground font-mono" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAbout;
