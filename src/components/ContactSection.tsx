import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Instagram, Facebook, Youtube, Building2, Home, Phone, Mail, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { track, getAttribution } from "@/lib/analytics";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.14a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.57z"/></svg>
);

type UsageType = "professionnel" | "residentiel" | null;

const ContactSection = ({ showIntro = true }: { showIntro?: boolean }) => {
  const [usageType, setUsageType] = useState<UsageType>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", company: "", city: "", message: "" });
  const [sending, setSending] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["contact-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_settings").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });
  const s = settings || {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageType) return;
    if (!form.full_name.trim() || !form.phone.trim()) { toast.error("Nom et téléphone obligatoires."); return; }
    if (usageType === "professionnel" && !form.company.trim()) { toast.error("Nom de l'entreprise obligatoire."); return; }
    setSending(true);
    const { error } = await supabase.rpc("submit_request", {
      p: {
        request_type: "contact",
        usage_type: usageType,
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        company: usageType === "professionnel" ? form.company : "",
        city: form.city,
        message: form.message,
        ...getAttribution(),
      },
    });
    if (error) { toast.error("Erreur lors de l'envoi. Vérifiez vos informations ou appelez-nous."); } else {
      track("contact_submit");
      toast.success("Demande envoyée avec succès !");
      setForm({ full_name: "", phone: "", email: "", company: "", city: "", message: "" }); setUsageType(null);
    }
    setSending(false);
  };

  const mapsUrl = s.maps_embed_url || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3329.5764262705056!2d-7.641104500000001!3d33.4342858!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda62f8be06bf783%3A0x25ce1bcb1e2ceef9!2sIMPULSE%20MAROC!5e0!3m2!1sfr!2sus!4v1774475925760!5m2!1sfr!2sus";

  const info: { k: string; icon: typeof Phone; v: React.ReactNode }[] = [
    { k: "Téléphone", icon: Phone, v: [s.phone_1, s.phone_2].filter(Boolean).map((l, i) => <a key={i} href={`tel:${l!.replace(/\s+/g, "")}`}>{l}</a>) },
    { k: "Email", icon: Mail, v: [s.email_1, s.email_2].filter(Boolean).map((l, i) => <a key={i} href={`mailto:${l}`}>{l}</a>) },
    { k: "Adresse", icon: MapPin, v: [s.address_line_1, s.address_line_2].filter(Boolean).join(", ") },
    { k: "Horaires", icon: Clock, v: [s.hours_line_1, s.hours_line_2].filter(Boolean).join(" · ") },
  ];

  return (
    <section className="sec contact" id="contact">
      <div className="wrap">
        {!showIntro && (
          <p className="contact-lead">Contactez nous pour une consultation personnalisée ou planifiez votre visite au showroom.</p>
        )}
        <div className="contact-grid">
          <div>
            {showIntro && (
              <>
                <span className="eyebrow reveal">Contact</span>
                <h2 className="display-md reveal">Prêt à équiper votre espace ?</h2>
              </>
            )}
            <div style={{ marginTop: showIntro ? 28 : 0 }}>
              {info.map((row) => {
                const Icon = row.icon;
                return (
                  <div className="info-card reveal" key={row.k}>
                    <span className="ic-ico"><Icon /></span>
                    <div className="ic-body">
                      <span className="ic-k">{row.k}</span>
                      <span className="ic-v">{row.v}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {(s.social_instagram || s.social_facebook || s.social_tiktok || s.social_youtube) && (
              <div className="contact-socials reveal">
                {s.social_instagram && <a href={s.social_instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram className="h-5 w-5" /></a>}
                {s.social_facebook && <a href={s.social_facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook className="h-5 w-5" /></a>}
                {s.social_tiktok && <a href={s.social_tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TikTokIcon className="h-5 w-5" /></a>}
                {s.social_youtube && <a href={s.social_youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube className="h-5 w-5" /></a>}
              </div>
            )}
          </div>

          <div className="reveal">
            {!usageType ? (
              <div className="imp-form" style={{ display: "block" }}>
                <p className="cf-intro">Remplissez le formulaire et nous vous contacterons dans les plus brefs délais.</p>
                <p className="cf-label">Sélectionnez votre type d'usage :</p>
                <div className="usage-pick">
                  <button type="button" className="usage-card" onClick={() => setUsageType("professionnel")}>
                    <Building2 /><span className="uc-t">Professionnel</span><span className="uc-s">Centre de fitness, hôtel…</span>
                  </button>
                  <button type="button" className="usage-card" onClick={() => setUsageType("residentiel")}>
                    <Home /><span className="uc-t">Résidentiel</span><span className="uc-s">Home gym, résidence…</span>
                  </button>
                </div>
              </div>
            ) : (
              <form className="imp-form" onSubmit={handleSubmit}>
                <div className="form-head">
                  {usageType === "professionnel" ? <Building2 className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                  <span className="fh-t">{usageType === "professionnel" ? "Formulaire Professionnel" : "Formulaire Résidentiel"}</span>
                  <button type="button" className="fh-change" onClick={() => setUsageType(null)}>Changer</button>
                </div>
                <div className="frow">
                  <div><label>Nom complet *</label><input type="text" placeholder="Votre nom" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
                  <div><label>Téléphone *</label><input type="tel" placeholder="+212 6XX-XXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
                </div>
                {usageType === "professionnel" && (
                  <>
                    <div><label>Entreprise *</label><input type="text" placeholder="Nom de votre entreprise" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required /></div>
                    <div><label>Email</label><input type="email" placeholder="votre@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  </>
                )}
                <div><label>Ville</label><input type="text" placeholder="Votre ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><label>Message</label><textarea placeholder="Décrivez votre projet ou vos besoins…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
                <button type="submit" disabled={sending} className="btn btn-red"><span><Send className="h-4 w-4" /> {sending ? "Envoi en cours…" : "Envoyer ma demande"}</span></button>
              </form>
            )}
          </div>
        </div>

        <div className="contact-map reveal">
          <iframe title="Localisation IMPULSE FITNESS" src={mapsUrl} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
