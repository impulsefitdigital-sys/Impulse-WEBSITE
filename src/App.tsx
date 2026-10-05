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
import NotFound from "./pages/NotFound";
import ProfessionnelPage from "./pages/Professionnel";
import ResidentielPage from "./pages/Residentiel";
import ConsultingPage from "./pages/Consulting";
import RealisationsPage from "./pages/Realisations";
import RealisationDetailPage from "./pages/RealisationDetail";
import ContactPage from "./pages/Contact";
import ProductDetailPage from "./pages/ProductDetail";
import DevisPage from "./pages/Devis";
import RecherchePage from "./pages/Recherche";
import LoginPage from "./pages/Login";
import AdminPage from "./pages/Admin";
import AProposPage from "./pages/APropos";
import BlogPage from "./pages/Blog";
import BlogDetailPage from "./pages/BlogDetail";
import PolitiqueConfidentialitePage from "./pages/PolitiqueConfidentialite";
import ScrollToTop from "@/components/ScrollToTop";
import DemoBanner from "@/components/DemoBanner";
import SiteTracking from "@/components/SiteTracking";
import CookieBanner from "@/components/CookieBanner";

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
            <DemoBanner />
            <SiteTracking />
            <CookieBanner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/professionnel" element={<ProfessionnelPage />} />
              <Route path="/professionnel/:category" element={<ProfessionnelPage />} />
              <Route path="/professionnel/:category/:subcategory" element={<ProfessionnelPage />} />
              <Route path="/professionnel/:category/:subcategory/:range" element={<ProfessionnelPage />} />
              <Route path="/residentiel" element={<ResidentielPage />} />
              <Route path="/residentiel/:category" element={<ResidentielPage />} />
              <Route path="/residentiel/:category/:subcategory" element={<ResidentielPage />} />
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
          </BrowserRouter>
        </QuoteCartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
