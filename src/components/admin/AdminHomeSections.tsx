import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type Section = {
  id: string;
  key: string;
  label: string;
  is_visible: boolean;
  sort_order: number;
};

const AdminHomeSections = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("home_sections")
      .select("*")
      .order("sort_order");
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setSections(data as Section[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (s: Section, value: boolean) => {
    setSections((prev) => prev.map((p) => (p.id === s.id ? { ...p, is_visible: value } : p)));
    const { error } = await supabase
      .from("home_sections")
      .update({ is_visible: value })
      .eq("id", s.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      load();
    } else {
      toast({ title: value ? "Section affichée" : "Section masquée", description: s.label });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Sections de la page d'accueil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Activez ou désactivez l'affichage de chaque section sur la page d'accueil.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : (
        <div className="divide-y divide-border rounded-sm border border-border bg-card">
          {sections.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-foreground">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.key}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${s.is_visible ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.is_visible ? "Affichée" : "Masquée"}
                </span>
                <Switch checked={s.is_visible} onCheckedChange={(v) => toggle(s, v)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminHomeSections;
