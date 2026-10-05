import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Save, GripVertical, ImageIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  details: string[];
  image_url: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

const AdminConsulting = () => {
  const qc = useQueryClient();
  const [editItems, setEditItems] = useState<Service[] | null>(null);

  const { data: services, isLoading } = useQuery({
    queryKey: ["admin-consulting"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consulting_services")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        details: Array.isArray(s.details) ? s.details : [],
      })) as Service[];
    },
  });

  const current = editItems || services || [];

  const updateField = (index: number, field: keyof Service, value: any) => {
    const updated = [...current];
    updated[index] = { ...updated[index], [field]: value };
    setEditItems(updated);
  };

  const handleImageUpload = async (index: number, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `consulting/${Date.now()}-${index}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Erreur upload image"); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    updateField(index, "image_url", urlData.publicUrl);
    toast.success("Image uploadée !");
  };

  const addItem = () => {
    const newItem: Service = {
      id: crypto.randomUUID(),
      title: "Nouveau service",
      subtitle: "",
      slug: `service-${Date.now()}`,
      description: "",
      details: [],
      image_url: null,
      icon: "Lightbulb",
      sort_order: current.length,
      is_active: true,
    };
    setEditItems([...current, newItem]);
  };

  const removeItem = async (index: number) => {
    const item = current[index];
    if (item.id && !item.id.includes("-0000-")) {
      await supabase.from("consulting_services").delete().eq("id", item.id);
    }
    setEditItems(current.filter((_, i) => i !== index));
    toast.success("Service supprimé");
    qc.invalidateQueries({ queryKey: ["admin-consulting"] });
  };

  const addDetail = (index: number) => {
    const updated = [...current];
    updated[index] = { ...updated[index], details: [...updated[index].details, ""] };
    setEditItems(updated);
  };

  const updateDetail = (serviceIndex: number, detailIndex: number, value: string) => {
    const updated = [...current];
    const details = [...updated[serviceIndex].details];
    details[detailIndex] = value;
    updated[serviceIndex] = { ...updated[serviceIndex], details };
    setEditItems(updated);
  };

  const removeDetail = (serviceIndex: number, detailIndex: number) => {
    const updated = [...current];
    updated[serviceIndex] = {
      ...updated[serviceIndex],
      details: updated[serviceIndex].details.filter((_, i) => i !== detailIndex),
    };
    setEditItems(updated);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [i, item] of current.entries()) {
        const payload = {
          title: item.title,
          slug: item.slug,
          subtitle: item.subtitle || "",
          description: item.description,
          details: item.details,
          image_url: item.image_url,
          icon: item.icon,
          sort_order: i,
          is_active: item.is_active,
        };
        const { data: existing } = await supabase
          .from("consulting_services")
          .select("id")
          .eq("id", item.id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase.from("consulting_services").update(payload).eq("id", item.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("consulting_services").insert({ ...payload, id: item.id });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-consulting"] });
      setEditItems(null);
      toast.success("Services sauvegardés !");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde."),
  });

  if (isLoading) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Services Consulting</h1>
          <p className="text-sm text-muted-foreground">Gérez vos services de consulting.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addItem} className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
            <Plus className="h-4 w-4" /> Ajouter
          </button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saveMutation.isPending ? "Sauvegarde..." : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {current.map((item, index) => (
          <div key={item.id} className="rounded-sm border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">SERVICE {index + 1}</span>
                <button onClick={() => updateField(index, "is_active", !item.is_active)} className={`ml-2 rounded-sm px-2 py-0.5 text-xs ${item.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {item.is_active ? <><Eye className="mr-1 inline h-3 w-3" />Actif</> : <><EyeOff className="mr-1 inline h-3 w-3" />Inactif</>}
                </button>
              </div>
              <button onClick={() => removeItem(index)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Image</label>
                {item.image_url ? (
                  <div className="relative aspect-video overflow-hidden rounded-sm border border-border">
                    <img src={item.image_url} alt="" className="h-full w-full object-cover" />
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

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Titre</label>
                  <input value={item.title} onChange={(e) => updateField(index, "title", e.target.value)} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Slug</label>
                  <input value={item.slug} onChange={(e) => updateField(index, "slug", e.target.value)} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Icône (Lightbulb, PenTool, Rocket)</label>
                  <input value={item.icon} onChange={(e) => updateField(index, "icon", e.target.value)} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Sous-titre (affiché au-dessus du titre)</label>
                  <input value={item.subtitle || ""} onChange={(e) => updateField(index, "subtitle", e.target.value)} placeholder='Laisser vide pour afficher "01 — Solution"' className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Description</label>
                  <textarea value={item.description} onChange={(e) => updateField(index, "description", e.target.value)} rows={3} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Détails / Points clés</label>
                <button onClick={() => addDetail(index)} className="text-xs text-accent hover:underline">+ Ajouter un point</button>
              </div>
              <div className="space-y-2">
                {item.details.map((detail, di) => (
                  <div key={di} className="flex gap-2">
                    <input value={detail} onChange={(e) => updateDetail(index, di, e.target.value)} className="flex-1 rounded-sm border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" placeholder="Point clé..." />
                    <button onClick={() => removeDetail(index, di)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminConsulting;
