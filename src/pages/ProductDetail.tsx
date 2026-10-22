import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";
import { absoluteUrl } from "@/lib/seo-config";
import { FileText, Check } from "lucide-react";
import { useQuoteCart } from "@/contexts/QuoteCartContext";
import ProductDetailView from "@/components/ProductDetailView";

const ProductDetailPage = () => {
  const { id } = useParams();
  const { addItem, items } = useQuoteCart();

  return (
    <div className="imp min-h-screen">
      <Navbar />
      <ProductDetailView
        id={id}
        renderHead={(product, images) => (
          <Seo
            title={product.name}
            description={product.short_description || product.description?.slice(0, 160) || product.name}
            path={`/produit/${product.id}`}
            image={product.image_url || undefined}
            jsonLd={{
              "@context": "https://schema.org", "@type": "Product", name: product.name,
              image: images.map((i) => i.url).slice(0, 6),
              description: product.short_description || product.description || product.name,
              sku: product.id, category: product.category,
              brand: { "@type": "Brand", name: "Impulse Fitness" }, url: absoluteUrl(`/produit/${product.id}`),
            }}
          />
        )}
        renderActions={(product) => {
          const inCart = items.some((i) => i.id === product.id);
          return (
            <div className="pd-actions">
              <button className={`pd-add${inCart ? " in" : ""}`} onClick={() => addItem({ id: product.id, name: product.name, category: product.category, image_url: product.image_url })}>
                <span>{inCart ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />} {inCart ? "Ajouté au devis" : "Ajouter au devis"}</span>
              </button>
              <a href="/contact" className="btn btn-ghost"><span>Nous contacter</span></a>
            </div>
          );
        }}
      />

      {/* CTA band */}
      <div className="pd-cta">
        <div className="wrap">
          <h2>Obtenez plus avec Impulse</h2>
          <p>Contactez nous pour apporter nos solutions complètes à votre projet dès aujourd'hui.</p>
          <a href="/contact" className="btn btn-red"><span>Contactez-nous</span></a>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
