import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo-config";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { QuoteCartProvider } from "@/contexts/QuoteCartContext";
import QuoteCartSheet from "@/components/QuoteCartSheet";
import WhatsAppButton from "@/components/WhatsAppButton";
import Index from "./pages/Index";
import ScrollToTop from "@/components/ScrollToTop";
import SpaLinks from "@/components/SpaLinks";
import DemoBanner from "@/components/DemoBanner";
import SiteTracking from "@/components/SiteTracking";
import CookieBanner from "@/components/CookieBanner";

// pages chargées à la demande : le premier affichage ne télécharge que l'accueil
const NotFound = lazy(() => import("./pages/NotFound"));
const ProfessionnelPage = lazy(() => import("./pages/Professionnel"));
const ResidentielPage = lazy(() => import("./pages/Residentiel"));
const ConsultingPage = lazy(() => import("./pages/Consulting"));
const RealisationsPage = lazy(() => import("./pages/Realisations"));
const RealisationDetailPage = lazy(() => import("./pages/RealisationDetail"));
const ContactPage = lazy(() => import("./pages/Contact"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetail"));
const DevisPage = lazy(() => import("./pages/Devis"));
const RecherchePage = lazy(() => import("./pages/Recherche"));
const LoginPage = lazy(() => import("./pages/Login"));
const AdminPage = lazy(() => import("./pages/Admin"));
const AProposPage = lazy(() => import("./pages/APropos"));
const BlogPage = lazy(() => import("./pages/Blog"));
const BlogDetailPage = lazy(() => import("./pages/BlogDetail"));
const PolitiqueConfidentialitePage = lazy(() => import("./pages/PolitiqueConfidentialite"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationJsonLd())}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteJsonLd())}
      </script>
    </Helmet>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <QuoteCartProvider>
          <Toaster />
          <Sonner />
          <QuoteCartSheet />
          <WhatsAppButton />
          <BrowserRouter>
            <ScrollToTop />
            <SpaLinks />
            <DemoBanner />
            <SiteTracking />
            <CookieBanner />
            <Suspense fallback={<div className="imp min-h-screen" />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/professionnel" element={<ProfessionnelPage />} />
              <Route path="/professionnel/:category" element={<ProfessionnelPage />} />
              <Route path="/professionnel/:category/:subcategory" element={<ProfessionnelPage />} />
              <Route path="/professionnel/:category/:subcategory/:range" element={<ProfessionnelPage />} />
              <Route path="/residentiel" element={<ResidentielPage />} />
              <Route path="/residentiel/:category" element={<ResidentielPage />} />
              <Route path="/residentiel/:category/:subcategory" element={<ResidentielPage />} />
              <Route path="/residentiel/:category/:subcategory/:range" element={<ResidentielPage />} />
              <Route path="/consulting" element={<ConsultingPage />} />
              <Route path="/consulting/:service" element={<ConsultingPage />} />
              <Route path="/realisations" element={<RealisationsPage />} />
              <Route path="/realisations/:slug" element={<RealisationDetailPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/produit/:id" element={<ProductDetailPage />} />
              <Route path="/devis" element={<DevisPage />} />
              <Route path="/recherche" element={<RecherchePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/a-propos" element={<AProposPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogDetailPage />} />
              <Route path="/politique-de-confidentialite" element={<PolitiqueConfidentialitePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </QuoteCartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
