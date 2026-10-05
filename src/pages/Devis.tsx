import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import { useEffect, useRef, useState } from "react";
import { useQuoteCart } from "@/contexts/QuoteCartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Building2, Home, FileText, Trash2, Send, Minus, Plus, CheckCircle2 } from "lucide-react";
import { track, getAttribution } from "@/lib/analytics";

type UsageType = "professionnel" | "residentiel" | null;

const DevisPage = () => {
  const { items, removeItem, updateQuantity, clearCart, itemCount } = useQuoteCart();
  const [usageType, setUsageType] = useState<UsageType>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", company: "", city: "", message: "" });
  const [sentNumber, setSentNumber] = useState<string | null>(null);
  const formStarted = useRef(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  // « devis commencé » : premier champ touché (sert à mesurer les abandons)
  const handleFormFocus = () => {
    if (formStarted.current) return;
    formStarted.current = true;
    track("form_start", { value: itemCount });
  };

  useEffect(() => { if (items.length > 0) track("quote_open"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageType || items.length === 0) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("submit_request", {
      p: {
        request_type: "devis",
        usage_type: usageType,
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        company: usageType === "professionnel" ? form.company : "",
        city: form.city,
        message: form.message,
        items: items.map((i) => ({ id: i.id, name: i.name, category: i.category, quantity: i.quantity })),
        ...getAttribution(),
      },
    });
    setLoading(false);
    if (error) { toast.error("Erreur lors de l'envoi du devis. Vérifiez vos informations ou appelez-nous."); return; }
    track("quote_submit", { value: itemCount });
    setSentNumber((data as { quote_number?: string } | null)?.quote_number || "");
    clearCart();
    window.scrollTo({ top: 0 });
  };

  if (sentNumber !== null) {
    return (
      <div className="imp min-h-screen">
        <Seo title="Demande de devis envoyée" path="/devis" noindex />
        <Navbar />
        <div className="devis-empty">
          <CheckCircle2 className="h-16 w-16" style={{ color: "var(--red)" }} />
          <p className="de-t">Demande envoyée</p>
          {sentNumber && <p>Votre numéro de demande : <strong style={{ color: "var(--ink-text)" }}>{sentNumber}</strong></p>}
          <p>Merci ! Nos experts vous recontactent rapidement avec un devis personnalisé.</p>
          <a href="/" className="btn btn-red"><span>Retour à l'accueil</span></a>
        </div>
        <Footer />
      </div>
    );
  }

  if (items.length === 0 && !usageType) {
    return (
      <div className="imp min-h-screen">
        <Seo title="Demande de devis" path="/devis" noindex />
        <Navbar />
        <div className="devis-empty">
          <FileText className="h-16 w-16" />
          <p className="de-t">Votre devis est vide</p>
          <p>Ajoutez des équipements depuis le catalogue pour composer votre demande de devis.</p>
          <a href="/professionnel" className="btn btn-red"><span>Parcourir le catalogue</span></a>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="imp min-h-screen">
      <Seo title="Demande de devis" path="/devis" noindex />
      <Navbar />

      <div className="devis">
        <div className="wrap">
          <a href="/" className="pd-back"><ArrowLeft /> Retour au catalogue</a>
          <span className="eyebrow">Demande de devis</span>
          <h1>Votre devis sur mesure.</h1>
          <p className="devis-sub">Renseignez vos coordonnées ci-dessous : nos experts vous recontactent rapidement avec un devis personnalisé pour les équipements sélectionnés.</p>

          <div className="devis-grid">
            {/* Form */}
            <div>
              {!usageType ? (
                <div className="imp-form" style={{ display: "block" }}>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--steel)", marginBottom: 16 }}>Sélectionnez votre type d'usage</p>
                  <div className="usage-pick">
                    <button type="button" className="usage-card" onClick={() => setUsageType("professionnel")}>
                      <Building2 /><span className="uc-t">Professionnel</span><span className="uc-s">Salle de sport, hôtel, club…</span>
                    </button>
                    <button type="button" className="usage-card" onClick={() => setUsageType("residentiel")}>
                      <Home /><span className="uc-t">Résidentiel</span><span className="uc-s">Home gym, usage personnel…</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form className="imp-form" onSubmit={handleSubmit} onFocusCapture={handleFormFocus}>
                  <div className="form-head">
                    {usageType === "professionnel" ? <Building2 className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                    <span className="fh-t">{usageType === "professionnel" ? "Formulaire Professionnel" : "Formulaire Résidentiel"}</span>
                    <button type="button" className="fh-change" onClick={() => setUsageType(null)}>Changer</button>
                  </div>
                  <div className="frow">
                    <div><label>Nom complet *</label><input name="full_name" placeholder="Votre nom" value={form.full_name} onChange={handleChange} required /></div>
                    <div><label>Téléphone *</label><input name="phone" type="tel" placeholder="+212 6XX-XXXXXX" value={form.phone} onChange={handleChange} required /></div>
                  </div>
                  {usageType === "professionnel" && (
                    <>
                      <div><label>Entreprise *</label><input name="company" placeholder="Nom de l'entreprise" value={form.company} onChange={handleChange} required /></div>
                      <div><label>Email</label><input name="email" type="email" placeholder="votre@email.com" value={form.email} onChange={handleChange} /></div>
                    </>
                  )}
                  <div><label>Ville *</label><input name="city" placeholder="Votre ville" value={form.city} onChange={handleChange} required /></div>
                  <div><label>Message</label><textarea name="message" placeholder="Décrivez votre projet, vos besoins…" value={form.message} onChange={handleChange} /></div>
                  <button type="submit" className="btn btn-red" disabled={loading}><span><Send className="h-4 w-4" /> {loading ? "Envoi en cours…" : "Envoyer la demande de devis"}</span></button>
                </form>
              )}
            </div>

            {/* Summary */}
            <aside className="devis-summary">
              <h3>Vos équipements <span className="count">{itemCount} article{itemCount !== 1 ? "s" : ""}</span></h3>
              {items.length === 0 ? (
                <p style={{ color: "var(--steel)", fontSize: 14, paddingTop: 8 }}>Aucun équipement. <a href="/professionnel" style={{ color: "var(--red)" }}>Parcourir →</a></p>
              ) : (
                items.map((item) => (
                  <div className="devis-item" key={item.id}>
                    <a className="di-thumb" href={`/produit/${item.id}`} aria-label={`Voir ${item.name}`}>{item.image_url && <img src={item.image_url} alt="" />}</a>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <a className="di-name" href={`/produit/${item.id}`}>{item.name}</a>
                      <div className="imp-cart-qty di-stepper">
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`Diminuer la quantité de ${item.name}`}><Minus className="h-3 w-3" /></button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={`Augmenter la quantité de ${item.name}`}><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <button type="button" className="di-remove" aria-label={`Retirer ${item.name}`} onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))
              )}
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DevisPage;
