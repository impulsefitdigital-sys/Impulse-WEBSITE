import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Footer from "@/components/Footer";

const PolitiqueConfidentialite = () => {
  return (
    <div className="imp min-h-screen">
      <Seo title="Politique de confidentialité" description="Politique de confidentialité et de protection des données d'Impulse Fitness Maroc." path="/politique-de-confidentialite" />
      <Navbar />

      <div className="article-wrap no-cover">
        <span className="eyebrow" style={{ marginBottom: 18 }}>Mentions légales</span>
        <h1>Politique de confidentialité</h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--steel-dim)", marginTop: 16, marginBottom: 8 }}>
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
        </p>

        <div className="article-body">
          <h2>1. Introduction</h2>
          <p>Impulse Fitness Maroc s'engage à protéger la vie privée des utilisateurs de son site web. Cette politique de confidentialité décrit la manière dont nous collectons, utilisons et protégeons vos informations personnelles.</p>

          <h2>2. Données collectées</h2>
          <p>Nous collectons les données suivantes lorsque vous utilisez notre site :</p>
          <ul>
            <li>Nom et prénom</li>
            <li>Adresse email</li>
            <li>Numéro de téléphone</li>
            <li>Nom de l'entreprise (le cas échéant)</li>
            <li>Messages envoyés via le formulaire de contact ou de devis</li>
          </ul>

          <h2>3. Utilisation des données</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul>
            <li>Répondre à vos demandes de devis et de contact</li>
            <li>Vous envoyer notre newsletter (avec votre consentement)</li>
            <li>Améliorer nos services et notre site</li>
          </ul>

          <h2>4. Partage des données</h2>
          <p>Nous ne vendons ni ne louons vos données personnelles à des tiers. Vos informations restent strictement confidentielles et ne sont utilisées qu'en interne.</p>

          <h2>5. Cookies</h2>
          <p>Notre site utilise :</p>
          <ul>
            <li><strong>Des éléments nécessaires</strong> : mémorisation de votre sélection de devis et une mesure d'audience anonyme (identifiant de session aléatoire, effacé à la fermeture de l'onglet, sans donnée personnelle), qui nous indique les pages consultées et le parcours jusqu'à la demande de devis.</li>
            <li><strong>Des cookies de statistiques</strong>, avec votre accord : identifiant de visiteur (6 mois) pour compter les visiteurs uniques et savoir quelle campagne vous a fait découvrir le site, Google Analytics et Microsoft Clarity.</li>
            <li><strong>Des cookies publicitaires</strong>, avec votre accord : Meta Pixel (Facebook / Instagram), pour mesurer l'efficacité de nos publicités.</li>
          </ul>
          <p>Vous pouvez modifier vos choix à tout moment via le lien « Gérer les cookies » en bas de chaque page.</p>

          <h2>6. Vos droits</h2>
          <p>Conformément à la législation en vigueur, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition au traitement de vos données personnelles. Pour exercer ces droits, contactez-nous via la page Contact.</p>

          <h2>7. Contact</h2>
          <p>Pour toute question concernant cette politique de confidentialité, n'hésitez pas à nous contacter via notre page de contact.</p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PolitiqueConfidentialite;
