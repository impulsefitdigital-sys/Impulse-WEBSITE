import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit, X, Save } from "lucide-react";
import { toast } from "sonner";

const AdminFaqs = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: faqs, isLoading } = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faqs").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-faqs"] });

  const Form = ({ initial, onClose }: { initial: any; onClose: () => void }) => {
    const [question, setQuestion] = useState(initial?.question || "");
    const [answer, setAnswer] = useState(initial?.answer || "");
    const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? (faqs?.length || 0) + 1);
    const [isActive, setIsActive] = useState(initial?.is_active ?? true);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      if (!question.trim() || !answer.trim()) { toast.error("Question et réponse requises"); return; }
      setSaving(true);
      const payload = { question: question.trim(), answer: answer.trim(), sort_order: sortOrder, is_active: isActive };
      const { error } = initial?.id
        ? await supabase.from("faqs").update(payload).eq("id", initial.id)
        : await supabase.from("faqs").insert(payload);
      setSaving(false);
      if (error) { toast.error("Erreur"); return; }
      toast.success(initial?.id ? "FAQ modifiée" : "FAQ créée");
      refresh();
      onClose();
    };

    const ic = "w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent";

    return (
      <div className="rounded-sm border border-accent bg-card p-4 space-y-3">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question" className={ic} />
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Réponse" rows={4} className={ic} />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs">
            Ordre <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="w-20 rounded-sm border border-border bg-background px-2 py-1 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" /> Actif
          </label>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="rounded-sm border border-border px-3 py-1.5 text-xs text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? "…" : "Enregistrer"}</button>
          </div>
        </div>
      </div>
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette FAQ ?")) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Supprimée"); refresh();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">FAQ</h1>
        {!creating && !editing && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"><Plus className="h-4 w-4" /> Nouvelle FAQ</button>
        )}
      </div>
      {creating && <div className="mb-4"><Form initial={null} onClose={() => setCreating(false)} /></div>}
      {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
        <div className="space-y-2">
          {faqs?.map((f: any) => editing?.id === f.id ? (
            <Form key={f.id} initial={f} onClose={() => setEditing(null)} />
          ) : (
            <div key={f.id} className="flex items-start justify-between gap-3 rounded-sm border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-sm bg-secondary px-1.5 text-xs">{f.sort_order}</span>
                  {!f.is_active && <span className="rounded-sm bg-muted px-1.5 text-[10px] uppercase text-muted-foreground">Inactif</span>}
                  <h3 className="text-sm font-semibold text-foreground">{f.question}</h3>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.answer}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(f)} className="p-2 text-muted-foreground hover:text-accent"><Edit className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(f.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFaqs;
