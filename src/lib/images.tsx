/**
 * Images envoyées depuis l'admin :
 * - IMAGE_SPECS : taille conseillée pour chaque emplacement du site (affichée dans l'admin) ;
 * - optimizeImage : redimensionne et convertit en WebP AVANT l'envoi (une photo de 6 Mo
 *   devient ~200–400 Ko) → site plus rapide et stockage / bande passante Supabase préservés.
 */
export type ImageKind =
  | "hero" | "heroMobile" | "homeCard" | "category" | "subcategory" | "product" | "range"
  | "solution" | "realisation" | "realisationBlock" | "blog";

interface Spec { label: string; w: number; h: number; note?: string; maxW: number; maxH: number }

export const IMAGE_SPECS: Record<ImageKind, Spec> = {
  hero: { label: "Carrousel (ordinateur)", w: 1920, h: 750, maxW: 2400, maxH: 1200,
    note: "Format très large. Sur téléphone, seule la partie centrale reste visible : gardez le sujet au centre, ou ajoutez une image « téléphone »." },
  heroMobile: { label: "Carrousel (téléphone)", w: 1080, h: 920, maxW: 1400, maxH: 1400,
    note: "Optionnelle. Affichée sur les écrans de moins de 680 px de large à la place de l'image principale." },
  homeCard: { label: "Carte de l'accueil", w: 1400, h: 1000, maxW: 1800, maxH: 1800, note: "Le haut de l'image est assombri pour le texte." },
  category: { label: "Bannière de catégorie", w: 1920, h: 640, maxW: 2400, maxH: 1200, note: "Image de fond, assombrie à gauche sous le titre." },
  subcategory: { label: "Carte de sous-catégorie", w: 1600, h: 1000, maxW: 2000, maxH: 2000, note: "Le titre s'affiche en bas à gauche." },
  product: { label: "Photo produit", w: 1200, h: 1200, maxW: 1600, maxH: 1600, note: "Carré, fond blanc, produit entier centré." },
  range: { label: "Carte de gamme", w: 1200, h: 900, maxW: 1600, maxH: 1600, note: "Format 4:3, fond blanc conseillé." },
  solution: { label: "Image de solution", w: 1600, h: 1000, maxW: 2000, maxH: 2000 },
  realisation: { label: "Image de réalisation", w: 1600, h: 1000, maxW: 2000, maxH: 2000 },
  realisationBlock: { label: "Image de la page réalisation", w: 1600, h: 1200, maxW: 2000, maxH: 2000, note: "Vues 3D : 1920 × 1080 px." },
  blog: { label: "Couverture d'article", w: 1920, h: 960, maxW: 2400, maxH: 1600, note: "Format 2:1." },
};

/** Texte d'aide affiché sous un champ image de l'admin. */
export const ImageHint = ({ kind, className = "" }: { kind: ImageKind; className?: string }) => {
  const s = IMAGE_SPECS[kind];
  return (
    <p className={`mt-1 text-[11px] leading-snug text-muted-foreground ${className}`}>
      Taille conseillée : <strong>{s.w} × {s.h} px</strong>. JPG, PNG ou WebP ; l'image est optimisée automatiquement à l'envoi.
      {s.note ? ` ${s.note}` : ""}
    </p>
  );
};

const loadBitmap = (file: File): Promise<ImageBitmap | HTMLImageElement> => {
  if ("createImageBitmap" in window) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/** Redimensionne (sans agrandir) et convertit en WebP. En cas d'échec, renvoie le fichier d'origine. */
export async function optimizeImage(file: File, kind: ImageKind, quality = 0.82): Promise<File> {
  if (!/^image\/(jpeg|png|webp|bmp)$/i.test(file.type)) return file; // GIF animés, SVG… : inchangés
  try {
    const { maxW, maxH } = IMAGE_SPECS[kind];
    const bmp = await loadBitmap(file);
    const ratio = Math.min(1, maxW / bmp.width, maxH / bmp.height);
    const w = Math.round(bmp.width * ratio), h = Math.round(bmp.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/webp", quality));
    if (!blob || blob.type !== "image/webp") return file;
    if (blob.size >= file.size && ratio === 1 && file.type === "image/webp") return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}

/** Options d'envoi Supabase : noms de fichiers uniques → cache navigateur d'un an. */
export const uploadOptions = (file: File) => ({ cacheControl: "31536000", contentType: file.type || undefined });

/**
 * Vignettes des listes (catalogue, recherche, devis…) : les photos /photos/… ont une version
 * réduite (640 px, ~16 Ko au lieu de ~50 Ko) dans /photos-sm/… (scripts/photos/vignettes.py).
 * Si la vignette n'existe pas (photo ajoutée plus tard), l'image d'origine est chargée.
 */
export const thumb = (src?: string | null) =>
  src && src.startsWith("/photos/") ? `/photos-sm/${src.slice("/photos/".length)}` : src || "";

const useFull = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const el = e.currentTarget;
  const full = el.dataset.full;
  if (full && !el.src.endsWith(full)) el.src = full;
};

/** Props d'une <img> de liste : vignette + repli automatique sur l'image d'origine. */
export const thumbProps = (src?: string | null, fallback = "/placeholder.svg") => {
  const full = src || fallback;
  return { src: src ? thumb(src) : fallback, "data-full": full, onError: useFull };
};
