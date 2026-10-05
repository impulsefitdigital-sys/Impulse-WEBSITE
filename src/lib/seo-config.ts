// Central SEO / business configuration.
// If the production domain differs, change SITE_URL here (one place).

export const SITE_URL = "https://www.impulsefitness.ma";
export const SITE_NAME = "Impulse Fitness Maroc";
export const DEFAULT_TITLE = "Impulse Fitness Maroc — Équipements de fitness professionnels & résidentiels";
export const DEFAULT_DESCRIPTION =
  "Impulse Fitness Maroc : vente d'équipements de fitness professionnels et résidentiels, matériel de musculation et cardio, consulting et aménagement de salles de sport au Maroc.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const LOCALE = "fr_MA";

export const BUSINESS = {
  legalName: "Impulse Fitness Maroc",
  phone: "+212668818164",
  email: "Infos@impulsefitness.ma",
  whatsapp: "212661464603",
  street: "Centre commercial OLINO, rond-point Bouskoura et Ouled Saleh",
  city: "Casablanca",
  region: "Casablanca-Settat",
  country: "MA",
  postalCode: "",
  latitude: 33.4342858,
  longitude: -7.6411045,
  openingHours: ["Mo-Fr 09:00-19:00", "Sa 09:00-14:00"],
  social: [
    "https://www.instagram.com/impulse_fitness_morocco/",
    "https://www.facebook.com/profile.php?id=61579067722030",
  ],
};

/** Build an absolute URL from a route path for canonical / OG tags. */
export const absoluteUrl = (path = "/") =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Site-wide Organization / LocalBusiness structured data (rendered once). */
export const organizationJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "SportingGoodsStore",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  legalName: BUSINESS.legalName,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  image: DEFAULT_OG_IMAGE,
  description: DEFAULT_DESCRIPTION,
  telephone: BUSINESS.phone,
  email: BUSINESS.email,
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.street,
    addressLocality: BUSINESS.city,
    addressRegion: BUSINESS.region,
    addressCountry: BUSINESS.country,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: BUSINESS.latitude,
    longitude: BUSINESS.longitude,
  },
  openingHoursSpecification: BUSINESS.openingHours,
  sameAs: BUSINESS.social,
});

/** WebSite structured data with search action (rendered once). */
export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  inLanguage: "fr-MA",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/recherche?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});
