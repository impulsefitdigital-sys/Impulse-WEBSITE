import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, IS_DEMO } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Circle, Eye, EyeOff, RefreshCw, Save, Sheet, Wand2, Zap } from "lucide-react";

const input = "mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm font-mono";

const randomSecret = () => {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
};

const Status = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${ok ? "text-green-700" : "text-muted-foreground"}`}>
    {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />} {label}
  </span>
);

// ---------------------------------------------------------------- Google Sheets
const GoogleSheetCard = () => {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["private-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("private_settings").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });
  useEffect(() => {
    if (data) { setUrl(data.google_sheet_webhook_url || ""); setSecret(data.google_sheet_secret || ""); }
  }, [data]);

  const configured = !!data?.google_sheet_webhook_url && !!data?.google_sheet_secret;
  const urlValid = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url.trim());

  const save = async () => {
    if (url && !urlValid) { toast.error("L'adresse doit être celle du script Google : https://script.google.com/macros/s/…/exec"); return; }
    setBusy("save");
    const { error } = await supabase.from("private_settings").upsert([
      { key: "google_sheet_webhook_url", value: url.trim() },
      { key: "google_sheet_secret", value: secret.trim() },
    ], { onConflict: "key" });
    setBusy(null);
    if (error) toast.error("Enregistrement impossible"); else { toast.success("Connexion Google Sheet enregistrée"); refetch(); }
  };

  // test direct depuis le navigateur : le script répond { ok: true } si la clé est la bonne
  const test = async () => {
    setBusy("test");
    try {
      const res = await fetch(url.trim(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ secret, action: "ping" }) });
      const json = await res.json();
      if (json.ok) toast.success(`Connexion réussie — onglet « ${json.sheet || "Demandes"} »`);
      else toast.error(json.error === "secret" ? "Le script répond, mais la clé secrète ne correspond pas." : `Réponse du script : ${json.error || "erreur"}`);
    } catch {
      toast.error("Le script ne répond pas. Vérifiez l'adresse et que le déploiement est accessible à « Tout le monde ».");
    }
    setBusy(null);
  };

  const resync = async () => {
    if (!confirm("Renvoyer toutes les demandes vers le Google Sheet ? Les lignes existantes sont mises à jour, rien n'est dupliqué.")) return;
    setBusy("resync");
    const { data: n, error } = await supabase.rpc("resync_sheet");
    setBusy(null);
    if (error) toast.error(error.message); else toast.success(`${n} demande(s) envoyée(s) au Google Sheet`);
  };

  return (
    <section className="rounded-sm border border-border bg-card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold"><Sheet className="h-5 w-5 text-green-700" /> Google Sheets — archive des demandes</h2>
        <Status ok={configured} label={configured ? "Connecté" : "Non configuré"} />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Chaque demande (devis ou contact) est copiée automatiquement dans un Google Sheet, avec son suivi (statut, notes, montant).
        Une demande supprimée du site reste dans le Sheet. Aucun email n'est envoyé.
      </p>

      {IS_DEMO && <p className="mb-4 rounded-sm bg-amber-50 p-3 text-xs text-amber-900">Mode démo : la connexion fonctionnera une fois le site relié au projet Supabase du client.</p>}

      <details className="mb-4 rounded-sm border border-border bg-secondary/40 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Installation (5 minutes, une seule fois)</summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>Créez un Google Sheet (compte Google du client), par exemple « Impulse — Demandes du site ».</li>
          <li>Menu <strong>Extensions → Apps Script</strong>, effacez le contenu et collez le script fourni par DMC (<code>integrations/google-sheets/Code.gs</code>).</li>
          <li>Cliquez sur <Wand2 className="inline h-3.5 w-3.5" /> <strong>Générer</strong> ci-dessous, copiez la clé secrète et collez-la dans le script à la ligne <code>SECRET = "…"</code>.</li>
          <li><strong>Déployer → Nouveau déploiement → Application Web</strong> : exécuter en tant que <em>Moi</em>, accès <em>Tout le monde</em>. Autorisez l'accès.</li>
          <li>Copiez l'<strong>URL de l'application Web</strong> (se termine par <code>/exec</code>) dans le champ ci-dessous, enregistrez, puis testez.</li>
          <li>Cliquez sur <strong>Renvoyer toutes les demandes</strong> pour remplir le Sheet avec l'historique.</li>
        </ol>
      </details>

      <div className="space-y-3">
        <label className="block text-xs font-medium text-foreground">URL de l'application Web (Apps Script)
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" className={input} />
        </label>
        <label className="block text-xs font-medium text-foreground">Clé secrète (identique dans le script)
          <div className="flex gap-2">
            <input type={show ? "text" : "password"} value={secret} onChange={(e) => setSecret(e.target.value)} className={input} autoComplete="off" />
            <button onClick={() => setShow(!show)} className="mt-1 rounded-sm border border-border px-2" title={show ? "Masquer" : "Afficher"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            <button onClick={() => { setSecret(randomSecret()); setShow(true); }} className="mt-1 inline-flex items-center gap-1 whitespace-nowrap rounded-sm border border-border px-3 text-xs"><Wand2 className="h-3.5 w-3.5" /> Générer</button>
          </div>
        </label>
        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={save} disabled={!!busy} className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"><Save className="h-4 w-4" /> Enregistrer</button>
          <button onClick={test} disabled={!!busy || !urlValid || !secret} className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm disabled:opacity-40"><Zap className="h-4 w-4" /> Tester la connexion</button>
          <button onClick={resync} disabled={!!busy || !configured} className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${busy === "resync" ? "animate-spin" : ""}`} /> Renvoyer toutes les demandes</button>
        </div>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------- Meta / Google / Clarity
const TRACKERS = [
  { key: "tracking_meta_pixel_id", label: "Meta Pixel (Facebook / Instagram)", placeholder: "ex. 123456789012345", pattern: /^\d{8,20}$/,
    help: "Gestionnaire d'événements Meta → Sources de données → votre Pixel → identifiant (chiffres). Chargé seulement si le visiteur accepte les cookies « Publicité »." },
  { key: "tracking_ga4_id", label: "Google Analytics 4", placeholder: "ex. G-ABC123XYZ", pattern: /^G-[A-Z0-9]{4,15}$/,
    help: "Google Analytics → Administration → Flux de données → ID de mesure (commence par G-). Chargé si le visiteur accepte les cookies « Statistiques »." },
  { key: "tracking_clarity_id", label: "Microsoft Clarity (cartes de clics, enregistrements)", placeholder: "ex. abcd1234ef", pattern: /^[a-z0-9]{6,20}$/,
    help: "clarity.microsoft.com (gratuit) → Paramètres → Configuration → ID du projet. Chargé si le visiteur accepte les cookies « Statistiques »." },
] as const;

const TrackingCard = () => {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const { data } = useQuery({
    queryKey: ["tracking-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_settings").select("key, value").in("key", TRACKERS.map((t) => t.key));
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });
  useEffect(() => { if (data) setValues(data); }, [data]);

  const save = async () => {
    for (const t of TRACKERS) {
      const v = (values[t.key] || "").trim();
      if (v && !t.pattern.test(v)) { toast.error(`${t.label} : identifiant invalide`); return; }
    }
    const { error } = await supabase.from("contact_settings").upsert(
      TRACKERS.map((t) => ({ key: t.key, value: (values[t.key] || "").trim() })), { onConflict: "key" });
    if (error) toast.error("Enregistrement impossible"); else { toast.success("Outils de mesure enregistrés — actifs au prochain chargement du site"); qc.invalidateQueries({ queryKey: ["tracking-ids"] }); }
  };

  return (
    <section className="rounded-sm border border-border bg-card p-5">
      <h2 className="mb-1 text-base font-bold">Outils de mesure publicitaire</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Collez les identifiants : les outils se chargent automatiquement sur le site, en respectant le choix de cookies du visiteur.
        Les statistiques de l'admin fonctionnent sans eux.
      </p>
      <div className="space-y-4">
        {TRACKERS.map((t) => (
          <div key={t.key}>
            <div className="flex items-center justify-between">
              <label htmlFor={t.key} className="text-xs font-medium text-foreground">{t.label}</label>
              <Status ok={!!data?.[t.key]} label={data?.[t.key] ? "Actif" : "Inactif"} />
            </div>
            <input id={t.key} value={values[t.key] || ""} onChange={(e) => setValues({ ...values, [t.key]: e.target.value })} placeholder={t.placeholder} className={input} />
            <p className="mt-1 text-[11px] text-muted-foreground">{t.help}</p>
          </div>
        ))}
        <button onClick={save} className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"><Save className="h-4 w-4" /> Enregistrer</button>
      </div>
    </section>
  );
};

const AdminIntegrations = () => (
  <div className="max-w-3xl space-y-5">
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Intégrations</h1>
      <p className="text-sm text-muted-foreground">Connexions du site avec Google Sheets et les outils publicitaires.</p>
    </div>
    <GoogleSheetCard />
    <TrackingCard />
  </div>
);

export default AdminIntegrations;
