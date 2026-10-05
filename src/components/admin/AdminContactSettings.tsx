import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Save, Phone, Mail, MapPin, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const fields = [
  { key: "phone_1", label: "Téléphone 1", icon: Phone, placeholder: "+212 5XX-XXXXXX" },
  { key: "phone_2", label: "Téléphone 2", icon: Phone, placeholder: "+212 6XX-XXXXXX" },
  { key: "email_1", label: "Email principal", icon: Mail, placeholder: "contact@exemple.ma" },
  { key: "email_2", label: "Email commercial", icon: Mail, placeholder: "commercial@exemple.ma" },
  { key: "address_line_1", label: "Adresse ligne 1", icon: MapPin, placeholder: "Zone Industrielle," },
  { key: "address_line_2", label: "Adresse ligne 2", icon: MapPin, placeholder: "Casablanca, Maroc" },
  { key: "hours_line_1", label: "Horaires ligne 1", icon: Clock, placeholder: "Lun - Ven : 9h00 - 18h00" },
  { key: "hours_line_2", label: "Horaires ligne 2", icon: Clock, placeholder: "Sam : 9h00 - 13h00" },
  { key: "whatsapp_number", label: "Numéro WhatsApp (sans +)", icon: MessageSquare, placeholder: "212600000000" },
  { key: "maps_embed_url", label: "URL Google Maps Embed", icon: MapPin, placeholder: "https://www.google.com/maps/embed?pb=..." },
  { key: "social_instagram", label: "Instagram (URL)", icon: MessageSquare, placeholder: "https://instagram.com/votre-page" },
  { key: "social_facebook", label: "Facebook (URL)", icon: MessageSquare, placeholder: "https://facebook.com/votre-page" },
  { key: "social_tiktok", label: "TikTok (URL)", icon: MessageSquare, placeholder: "https://tiktok.com/@votre-page" },
  { key: "social_youtube", label: "YouTube (URL)", icon: MessageSquare, placeholder: "https://youtube.com/@votre-chaine" },
  { key: "menu_label_consulting", label: "Menu - Libellé Consulting", icon: MessageSquare, placeholder: "Consulting" },
  { key: "menu_label_realisations", label: "Menu - Libellé Réalisations", icon: MessageSquare, placeholder: "Réalisations" },
];

const AdminContactSettings = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ["contact-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings && Array.isArray(settings)) {
      const map: Record<string, string> = {};
      settings.forEach((s: any) => {
        map[s.key] = s.value;
      });
      setForm(map);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const field of fields) {
        const value = form[field.key] || "";
        // Try update first
        const { data, error } = await supabase
          .from("contact_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", field.key)
          .select();
        if (error) throw error;
        // If no row was updated, insert it
        if (!data || data.length === 0) {
          const { error: insertErr } = await supabase
            .from("contact_settings")
            .insert({ key: field.key, value, updated_at: new Date().toISOString() });
          if (insertErr) throw insertErr;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact-settings"] });
      toast.success("Coordonnées mises à jour !");
    },
    onError: () => {
      toast.error("Erreur lors de la sauvegarde.");
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-bold text-foreground">Coordonnées de contact</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Ces informations s'affichent sur la page Contact du site.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        {fields.map((field) => (
          <div key={field.key} className="rounded-sm border border-border bg-card p-4">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
              <field.icon className="h-3.5 w-3.5 text-accent" />
              {field.label}
            </label>
            <input
              type="text"
              value={form[field.key] || ""}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="mt-6 inline-flex items-center gap-2 rounded-sm bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saveMutation.isPending ? "Sauvegarde..." : "Enregistrer"}
      </button>
    </div>
  );
};

export default AdminContactSettings;
