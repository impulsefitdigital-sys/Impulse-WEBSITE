import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emailSchema = z.string().trim().email({ message: "Email invalide" }).max(255);

const NewsletterSignup = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: parsed.data });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") { toast.info("Vous êtes déjà inscrit à notre newsletter."); setDone(true); }
      else toast.error("Erreur lors de l'inscription");
      return;
    }
    setDone(true);
    setEmail("");
    toast.success("Merci ! Inscription confirmée.");
  };

  return (
    <div className="imp-newsletter">
      <h4 style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,.45)", marginBottom: 14 }}>Newsletter</h4>
      <p style={{ color: "rgba(255,255,255,.62)", fontSize: 14 }}>Recevez nos actualités et offres exclusives.</p>
      {done ? (
        <p style={{ color: "var(--red)", fontSize: 14, marginTop: 14 }}>✓ Vous êtes inscrit !</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" aria-label="Votre email" />
          <button type="submit" disabled={submitting}>{submitting ? "..." : "S'inscrire"}</button>
        </form>
      )}
    </div>
  );
};

export default NewsletterSignup;
