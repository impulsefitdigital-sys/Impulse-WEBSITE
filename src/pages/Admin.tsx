import { useAuth } from "@/hooks/useAuth";
import Seo from "@/components/Seo";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut, Package, MessageSquare, Settings, ArrowLeft, Image, Briefcase, FolderOpen, LayoutGrid, Info, Layers,
  Mail, HelpCircle, FileText, Eye, Boxes, LayoutDashboard, BarChart3, Plug, History,
} from "lucide-react";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminRequests from "@/components/admin/AdminRequests";
import AdminContactSettings from "@/components/admin/AdminContactSettings";
import AdminHeroSlides from "@/components/admin/AdminHeroSlides";
import AdminConsulting from "@/components/admin/AdminConsulting";
import AdminRealisations from "@/components/admin/AdminRealisations";
import AdminCategoryCards from "@/components/admin/AdminCategoryCards";
import AdminAbout from "@/components/admin/AdminAbout";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminBlogs from "@/components/admin/AdminBlogs";
import AdminFaqs from "@/components/admin/AdminFaqs";
import AdminNewsletter from "@/components/admin/AdminNewsletter";
import AdminHomeSections from "@/components/admin/AdminHomeSections";
import AdminRanges from "@/components/admin/AdminRanges";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminStats from "@/components/admin/AdminStats";
import AdminIntegrations from "@/components/admin/AdminIntegrations";
import AdminHistory from "@/components/admin/AdminHistory";
import logo from "@/assets/logo-new.png";

const groups = [
  { label: null, tabs: [{ id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard }] },
  {
    label: "Commercial",
    tabs: [
      { id: "requests", label: "Demandes", icon: MessageSquare },
      { id: "newsletter", label: "Newsletter", icon: Mail },
    ],
  },
  { label: "Data", tabs: [{ id: "stats", label: "Statistiques", icon: BarChart3 }] },
  {
    label: "Contenu du site",
    tabs: [
      { id: "home-sections", label: "Sections accueil", icon: Eye },
      { id: "hero", label: "Carrousel", icon: Image },
      { id: "categories", label: "Cartes accueil", icon: LayoutGrid },
      { id: "products", label: "Produits", icon: Package },
      { id: "eq-categories", label: "Catégories", icon: Layers },
      { id: "ranges", label: "Gammes", icon: Boxes },
      { id: "consulting", label: "Consulting", icon: Briefcase },
      { id: "realisations", label: "Réalisations", icon: FolderOpen },
      { id: "blogs", label: "Blog", icon: FileText },
      { id: "faqs", label: "FAQ", icon: HelpCircle },
      { id: "about", label: "À propos", icon: Info },
    ],
  },
  {
    label: "Paramètres",
    tabs: [
      { id: "settings", label: "Coordonnées", icon: Settings },
      { id: "integrations", label: "Intégrations", icon: Plug },
      { id: "history", label: "Historique", icon: History },
    ],
  },
] as const;

type TabId = (typeof groups)[number]["tabs"][number]["id"];
const TAB_IDS = groups.flatMap((g) => g.tabs.map((t) => t.id)) as TabId[];

// onglet dans l'adresse (#demandes/…) : un rechargement garde l'écran ouvert
const readHash = (): { tab: TabId; param: string | null } => {
  const [tab, param] = window.location.hash.slice(1).split("/");
  return { tab: (TAB_IDS as string[]).includes(tab) ? (tab as TabId) : "dashboard", param: param || null };
};

export type AdminNavigate = (tab: TabId, param?: string) => void;

const AdminPage = () => {
  const { isAdmin, loading, signOut, user } = useAuth();
  const [{ tab: activeTab, param }, setRoute] = useState(readHash);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate: AdminNavigate = (tab, p) => {
    window.location.hash = p ? `${tab}/${p}` : tab;
    window.scrollTo({ top: 0 });
  };

  // pastille « nouvelles demandes » dans le menu
  const { data: newCount } = useQuery({
    queryKey: ["admin-requests-new-count"],
    queryFn: async () => {
      const { count } = await supabase.from("contact_requests").select("id", { count: "exact", head: true }).eq("status", "nouveau");
      return count ?? 0;
    },
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  }

  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }
  if (!isAdmin) {
    if (typeof window !== "undefined") window.location.href = "/";
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Seo title="Administration" path="/admin" noindex />
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-border bg-card">
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-5 py-4">
          <img src={logo} alt="IMPULSE FITNESS" className="h-6 w-auto" />
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {groups.map((g, gi) => (
            <div key={gi} className={gi ? "mt-4" : ""}>
              {g.label && <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground/70">{g.label}</p>}
              <div className="space-y-0.5">
                {g.tabs.map((tab) => (
                  <button key={tab.id} onClick={() => navigate(tab.id)} className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                    <tab.icon className="h-4 w-4" /><span className="flex-1 text-left">{tab.label}</span>
                    {tab.id === "requests" && !!newCount && (
                      <span className={`rounded-full px-1.5 text-[10px] font-bold ${activeTab === tab.id ? "bg-accent-foreground text-accent" : "bg-accent text-accent-foreground"}`}>{newCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="flex-shrink-0 border-t border-border p-3 space-y-1">
          <a href="/" className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour au site</a>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><LogOut className="h-4 w-4" /> Déconnexion</button>
        </div>
      </aside>
      <main className="ml-56 min-w-0 flex-1 p-8">
        {activeTab === "dashboard" && <AdminDashboard navigate={navigate} />}
        {activeTab === "requests" && <AdminRequests selectedId={param} navigate={navigate} />}
        {activeTab === "newsletter" && <AdminNewsletter />}
        {activeTab === "stats" && <AdminStats />}
        {activeTab === "home-sections" && <AdminHomeSections />}
        {activeTab === "hero" && <AdminHeroSlides />}
        {activeTab === "categories" && <AdminCategoryCards />}
        {activeTab === "products" && <AdminProducts />}
        {activeTab === "eq-categories" && <AdminCategories />}
        {activeTab === "ranges" && <AdminRanges />}
        {activeTab === "consulting" && <AdminConsulting />}
        {activeTab === "realisations" && <AdminRealisations />}
        {activeTab === "blogs" && <AdminBlogs />}
        {activeTab === "faqs" && <AdminFaqs />}
        {activeTab === "about" && <AdminAbout />}
        {activeTab === "settings" && <AdminContactSettings />}
        {activeTab === "integrations" && <AdminIntegrations />}
        {activeTab === "history" && <AdminHistory />}
      </main>
    </div>
  );
};

export default AdminPage;
