import { Helmet } from "react-helmet-async";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  LOCALE,
  SITE_NAME,
  absoluteUrl,
} from "@/lib/seo-config";

interface SeoProps {
  /** Page title. Site name is appended automatically unless `titleFull` is set. */
  title?: string;
  /** Use this exact string as the <title> (no site-name suffix). */
  titleFull?: string;
  description?: string;
  /** Route path for canonical + og:url, e.g. "/contact". */
  path?: string;
  /** Absolute image URL for social cards. */
  image?: string;
  /** "website" (default) or "article" for blog posts. */
  type?: "website" | "article";
  /** Set true on pages that should not be indexed (login, admin, search results). */
  noindex?: boolean;
  /** Any structured-data object(s) to inject as JSON-LD. */
  jsonLd?: object | object[];
}

const Seo = ({
  title,
  titleFull,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  jsonLd,
}: SeoProps) => {
  const fullTitle = titleFull ?? (title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE);
  const canonical = absoluteUrl(path);
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet prioritizeSeoTags>
      <html lang="fr" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={LOCALE} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
