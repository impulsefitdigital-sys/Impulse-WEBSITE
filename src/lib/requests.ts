import type { Database } from "@/integrations/supabase/types";
import { STOCK_ITEMS } from "@/data/stock-landing";

export type ContactRequest = Database["public"]["Tables"]["contact_requests"]["Row"];

export interface RequestItem { id: string; name: string; category?: string; quantity: number }

export const STATUSES = [
  { value: "nouveau", label: "Nouveau", className: "bg-red-100 text-red-700" },
  { value: "contacte", label: "Contacté", className: "bg-amber-100 text-amber-800" },
  { value: "devis_envoye", label: "Devis envoyé", className: "bg-blue-100 text-blue-700" },
  { value: "gagne", label: "Gagné", className: "bg-green-100 text-green-700" },
  { value: "perdu", label: "Perdu", className: "bg-zinc-200 text-zinc-600" },
] as const;

export const statusInfo = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

export const isOpenStatus = (s: string) => s !== "gagne" && s !== "perdu";

export const requestItems = (r: Pick<ContactRequest, "items">): RequestItem[] =>
  Array.isArray(r.items) ? (r.items as unknown as RequestItem[]) : [];

// ---------------------------------------------------------------- landing page
export const isLandingRequest = (r: Pick<ContactRequest, "source">) => r.source === "landing";

/** Nature d'une demande de la landing page (d'après le formulaire utilisé). */
export const LANDING_KINDS = [
  { value: "commande", label: "Commande", className: "bg-red-600 text-white" },
  { value: "rdv", label: "RDV showroom", className: "bg-violet-100 text-violet-800" },
  { value: "projet", label: "Projet sur mesure", className: "bg-sky-100 text-sky-800" },
  { value: "machine", label: "Question machine", className: "bg-emerald-100 text-emerald-800" },
  { value: "contact", label: "Contact", className: "bg-zinc-100 text-zinc-700" },
] as const;
export type LandingKind = (typeof LANDING_KINDS)[number]["value"];

/** « Intérêt : … » ajouté au message par le formulaire de la landing (bouton cliqué). */
export const landingInterest = (r: Pick<ContactRequest, "message">) => /Intérêt : (.+)/.exec(r.message || "")?.[1]?.trim() || "";

export const landingKind = (r: Pick<ContactRequest, "request_type" | "message">): LandingKind => {
  if (r.request_type === "devis") return "commande";
  const i = landingInterest(r).toLowerCase();
  if (!i) return "contact";
  if (i.includes("showroom")) return "rdv";
  if (i.includes("projet")) return "projet";
  return "machine";
};
export const landingKindInfo = (k: LandingKind) => LANDING_KINDS.find((x) => x.value === k) ?? LANDING_KINDS[4];

const STOCK_PRICE = new Map(STOCK_ITEMS.map((i) => [i.ref, i.pu]));
/** Référence de la machine (« Chest press ECP201 (ECP201) » → ECP201). */
export const itemRef = (i: RequestItem) => /\(([A-Z]{2,4}\d{3,5})\)\s*$/.exec(i.name)?.[1] || "";
/** Prix unitaire HT affiché sur la landing pour une ligne de commande (0 si la machine n'est plus dans la liste). */
export const itemPrice = (i: RequestItem) => STOCK_PRICE.get(itemRef(i)) ?? 0;
/** Valeur HT d'une commande de la landing (prix affichés × quantités). */
export const landingValue = (r: Pick<ContactRequest, "items">) => requestItems(r).reduce((s, i) => s + itemPrice(i) * Number(i.quantity || 0), 0);

/** Heures écoulées depuis la réception. */
export const ageHours = (r: Pick<ContactRequest, "created_at">) => (Date.now() - new Date(r.created_at).getTime()) / 3600000;
/** Demande « Nouveau » depuis plus de 24 h (promesse de rappel de la landing). */
export const isLate = (r: Pick<ContactRequest, "created_at" | "status">) => r.status === "nouveau" && ageHours(r) > 24;
export const ageLabel = (r: Pick<ContactRequest, "created_at">) => {
  const h = ageHours(r);
  if (h < 1) return `il y a ${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `il y a ${Math.round(h)} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} jour${d > 1 ? "s" : ""}`;
};

/** Email réel (les anciennes demandes sans email utilisaient « téléphone@no-email.local »). */
export const realEmail = (email: string | null) => (email && !email.endsWith("@no-email.local") ? email : "");

export const sourceLabel = (r: Pick<ContactRequest, "utm_source" | "utm_medium" | "utm_campaign" | "referrer">) => {
  if (r.utm_source) return [r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean).join(" · ");
  if (r.referrer) return r.referrer;
  return "Direct / inconnu";
};

export const formatDate = (iso: string, withTime = true) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

export const formatAmount = (n: number | null) =>
  n == null ? "" : `${Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} MAD`;

// ---------------------------------------------------------------- export CSV (Excel, séparateur ;)
export const exportRequestsCsv = (rows: ContactRequest[]) => {
  const header = ["Numéro", "Date", "Type", "Statut", "Nom", "Téléphone", "Email", "Entreprise", "Ville", "Usage",
    "Équipements", "Message", "Valeur affichée HT (landing)", "Montant (MAD)", "Relance", "Notes", "Source", "Support", "Campagne", "Page d'arrivée"];
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  const lines = rows.map((r) => [
    r.quote_number, formatDate(r.created_at), r.source === "landing" ? `Landing page · ${landingKindInfo(landingKind(r)).label}` : r.request_type === "devis" ? "Devis" : "Contact", statusInfo(r.status).label,
    r.full_name, r.phone, realEmail(r.email), r.company, r.city, r.usage_type,
    requestItems(r).map((i) => `${i.name} x${i.quantity}`).join(" ; "), r.message, r.source === "landing" && r.request_type === "devis" ? landingValue(r) : "", r.amount ?? "", r.follow_up_date ?? "",
    r.notes, r.utm_source ?? r.referrer ?? "direct", r.utm_medium, r.utm_campaign, r.landing_page,
  ].map(cell).join(";"));
  // BOM : accents corrects à l'ouverture dans Excel
  const blob = new Blob(["﻿" + [header.map(cell).join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `demandes-impulse-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

// ---------------------------------------------------------------- PDF récapitulatif
/** Logo réduit à la taille d'impression (sinon le PDF pèse plusieurs Mo). */
const toDataUrl = (src: string, height = 120) =>
  new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.height = height;
      canvas.width = Math.round((img.naturalWidth / img.naturalHeight) * height);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });

export interface CompanyInfo { phone?: string; email?: string; address?: string; website?: string }

/** Génère et télécharge le PDF « Demande de devis » (ou « Demande de contact »). */
export const downloadRequestPdf = async (r: ContactRequest, company: CompanyInfo, logoUrl: string) => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = doc.internal.pageSize.getWidth();
  const M = 16;
  const isQuote = r.request_type === "devis";
  const red: [number, number, number] = [227, 6, 19];

  // bandeau
  doc.setFillColor(23, 23, 23);
  doc.rect(0, 0, W, 34, "F");
  doc.setFillColor(...red);
  doc.rect(0, 34, W, 1.4, "F");
  try {
    const logo = await toDataUrl(logoUrl);
    const props = doc.getImageProperties(logo);
    const h = 10;
    doc.addImage(logo, "PNG", M, 12, (props.width / props.height) * h, h);
  } catch { /* logo indisponible : on continue sans */ }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(isQuote ? "DEMANDE DE DEVIS" : "DEMANDE DE CONTACT", W - M, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text([r.quote_number ? `N° ${r.quote_number}` : "", `Reçue le ${formatDate(r.created_at)}`].filter(Boolean), W - M, 21, { align: "right" });

  // client
  let y = 48;
  doc.setTextColor(20, 20, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CLIENT", M, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: { top: 1.4, bottom: 1.4, left: 0, right: 2 } },
    columnStyles: { 0: { cellWidth: 38, textColor: [110, 110, 120] }, 1: { textColor: [20, 20, 25] } },
    margin: { left: M, right: M },
    body: [
      ["Nom", r.full_name],
      ["Entreprise", r.company || "—"],
      ["Téléphone", r.phone || "—"],
      ["Email", realEmail(r.email) || "—"],
      ["Ville", r.city || "—"],
      ["Usage", r.usage_type === "professionnel" ? "Professionnel" : r.usage_type === "residentiel" ? "Résidentiel" : "—"],
    ],
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // équipements (commande de la landing page : avec les prix affichés)
  const items = requestItems(r);
  const priced = r.source === "landing" && isQuote && landingValue(r) > 0;
  const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/[\s\u202f]/g, " ")} DH`;
  if (items.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ÉQUIPEMENTS DEMANDÉS", M, y);
    autoTable(doc, {
      startY: y + 3,
      margin: { left: M, right: M },
      ...(priced ? {
        head: [["#", "Équipement", "Quantité", "PU HT (landing)", "Total HT"]],
        body: items.map((i, idx) => [String(idx + 1), i.name, String(i.quantity), money(itemPrice(i)), money(itemPrice(i) * Number(i.quantity || 0))]),
        columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 20, halign: "center" as const }, 3: { cellWidth: 32, halign: "right" as const }, 4: { cellWidth: 32, halign: "right" as const } },
      } : {
        head: [["#", "Équipement", "Catégorie", "Quantité"]],
        body: items.map((i, idx) => [String(idx + 1), i.name, i.category || "", String(i.quantity)]),
        columnStyles: { 0: { cellWidth: 10 }, 3: { cellWidth: 22, halign: "center" as const } },
      }),
      headStyles: { fillColor: [23, 23, 23], textColor: 255, fontStyle: "bold", fontSize: 9.5 },
      bodyStyles: { fontSize: 9.5, textColor: [20, 20, 25] },
      alternateRowStyles: { fillColor: [246, 246, 244] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const count = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
    doc.text(priced ? `Total : ${count} article(s) — ${money(landingValue(r))} HT (prix affichés sur la landing page)` : `Total : ${count} article(s)`, W - M, y + 2, { align: "right" });
    y += 10;
  }

  // message
  if (r.message) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("MESSAGE DU CLIENT", M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(r.message, W - 2 * M);
    doc.text(lines, M, y + 6);
    y += 6 + lines.length * 5 + 4;
  }

  // pied de page
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 220, 225);
  doc.line(M, H - 22, W - M, H - 22);
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 120);
  doc.text("Impulse Fitness Maroc — " + [company.address, company.phone, company.email, company.website].filter(Boolean).join(" · "), M, H - 16, { maxWidth: W - 2 * M });
  doc.text(`Document récapitulatif de la demande, sans valeur de devis chiffré. Édité le ${formatDate(new Date().toISOString())}.`, M, H - 10);

  doc.save(`${r.quote_number || "demande"}-${r.full_name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.pdf`);
};
