import type { Database } from "@/integrations/supabase/types";

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
    "Équipements", "Message", "Montant (MAD)", "Relance", "Notes", "Source", "Support", "Campagne", "Page d'arrivée"];
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  const lines = rows.map((r) => [
    r.quote_number, formatDate(r.created_at), r.request_type === "devis" ? "Devis" : "Contact", statusInfo(r.status).label,
    r.full_name, r.phone, realEmail(r.email), r.company, r.city, r.usage_type,
    requestItems(r).map((i) => `${i.name} x${i.quantity}`).join(" ; "), r.message, r.amount ?? "", r.follow_up_date ?? "",
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

  // équipements
  const items = requestItems(r);
  if (items.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ÉQUIPEMENTS DEMANDÉS", M, y);
    autoTable(doc, {
      startY: y + 3,
      margin: { left: M, right: M },
      head: [["#", "Équipement", "Catégorie", "Quantité"]],
      body: items.map((i, idx) => [String(idx + 1), i.name, i.category || "", String(i.quantity)]),
      headStyles: { fillColor: [23, 23, 23], textColor: 255, fontStyle: "bold", fontSize: 9.5 },
      bodyStyles: { fontSize: 9.5, textColor: [20, 20, 25] },
      alternateRowStyles: { fillColor: [246, 246, 244] },
      columnStyles: { 0: { cellWidth: 10 }, 3: { cellWidth: 22, halign: "center" } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Total : ${items.reduce((s, i) => s + Number(i.quantity || 0), 0)} article(s)`, W - M, y + 2, { align: "right" });
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
