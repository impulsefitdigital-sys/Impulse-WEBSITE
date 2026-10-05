import { IS_DEMO } from "@/integrations/supabase/client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Seo from "@/components/Seo";
import { Lock, Mail, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) { setError("Email ou mot de passe incorrect."); return; }
      window.location.href = "/admin";
    } catch { setError("Impossible de se connecter. Réessayez."); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Seo title="Connexion" path="/login" noindex />
      <div className="w-full max-w-sm rounded-sm border border-border bg-card p-8">
        <a href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour au site</a>
        <img src={logo} alt="IMPULSE FITNESS" className="mb-2 h-8 w-auto" />
        <p className="mb-6 text-sm text-muted-foreground">Espace administrateur</p>
        {IS_DEMO && <p className="mb-4 rounded-sm bg-amber-50 p-2 text-xs text-amber-900">Mode démo : saisissez n'importe quel email et mot de passe.</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-sm border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" required />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-sm border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" required />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-sm bg-accent py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50">{loading ? "Connexion..." : "Se connecter"}</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
