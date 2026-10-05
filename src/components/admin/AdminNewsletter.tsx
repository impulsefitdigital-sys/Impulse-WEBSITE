import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Download, Mail } from "lucide-react";
import { toast } from "sonner";

const AdminNewsletter = () => {
  const qc = useQueryClient();
  const { data: subs, isLoading } = useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet abonné ?")) return;
    const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Abonné supprimé");
    qc.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
  };

  const handleExport = () => {
    if (!subs || subs.length === 0) return;
    const header = "email,date_inscription\n";
    const rows = subs.map((s: any) => `${s.email},${new Date(s.created_at).toISOString()}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Newsletter</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subs?.length || 0} abonné{(subs?.length || 0) > 1 ? "s" : ""}</p>
        </div>
        <button onClick={handleExport} disabled={!subs || subs.length === 0} className="flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
          <Download className="h-4 w-4" /> Exporter CSV
        </button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : !subs || subs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border p-12 text-center">
          <Mail className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucun abonné pour le moment.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Inscrit le</th><th className="px-4 py-3 w-16" /></tr>
            </thead>
            <tbody>
              {subs.map((s: any) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground">{s.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminNewsletter;
