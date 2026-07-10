"use client";

/**
 * 10/07/26 (Orsu) — Utilitaire d'export PDF haute-fidélité pour le rapport
 * /humanizer. Utilise html2canvas-pro (fork qui gère oklch/oklab de Tailwind
 * v4) + jsPDF. Ajoute header Seora + footer + gère la pagination multi-page
 * en découpant le canvas par hauteur de page A4.
 */

import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function sanitize(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_.]/g, "-")
    .slice(0, 80);
}

export async function exportReportToPDF(
  node: HTMLElement,
  fileName: string
): Promise<void> {
  if (!node) throw new Error("Aucun nœud à exporter");

  // Rasterize à 2× pour du texte net.
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  });

  // A4 portrait, marges 10mm.
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const margin = 10;
  const headerHeight = 14;
  const footerHeight = 10;

  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2 - headerHeight - footerHeight;

  // Ratio px → mm.
  const pxPerMm = canvas.width / contentWidth;
  const sliceHeightPx = Math.floor(contentHeight * pxPerMm);
  const totalPages = Math.max(1, Math.ceil(canvas.height / sliceHeightPx));

  const dateStr = formatDate(new Date());

  const drawHeader = (pageNum: number) => {
    // Barre orange fine
    pdf.setFillColor(249, 115, 22);
    pdf.rect(0, 0, pageWidth, 3, "F");

    // Logo texte "seora" — style bold orange
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(249, 115, 22);
    pdf.text("seora", margin, margin + 4);

    // Baseline
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(120, 113, 108);
    pdf.text("Rapport d'analyse IA", margin + 22, margin + 4);

    // Date + page à droite
    pdf.setFontSize(8);
    pdf.setTextColor(120, 113, 108);
    pdf.text(`Généré le ${dateStr}`, pageWidth - margin, margin + 4, { align: "right" });
    pdf.text(`Page ${pageNum} / ${totalPages}`, pageWidth - margin, margin + 8, {
      align: "right",
    });

    // Séparateur
    pdf.setDrawColor(228, 228, 231);
    pdf.setLineWidth(0.2);
    pdf.line(margin, margin + headerHeight - 2, pageWidth - margin, margin + headerHeight - 2);
  };

  const drawFooter = () => {
    pdf.setDrawColor(228, 228, 231);
    pdf.setLineWidth(0.2);
    pdf.line(
      margin,
      pageHeight - margin - footerHeight + 2,
      pageWidth - margin,
      pageHeight - margin - footerHeight + 2
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(120, 113, 108);
    pdf.text(
      "Ce diagnostic est une indication statistique et non une preuve. Aucun détecteur IA n'atteint 100% de fiabilité.",
      pageWidth / 2,
      pageHeight - margin - 4,
      { align: "center" }
    );
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(249, 115, 22);
    pdf.text("tryseora.com", pageWidth / 2, pageHeight - margin, { align: "center" });
  };

  // Découpage du canvas en tranches page-par-page.
  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    drawHeader(page + 1);

    const sy = page * sliceHeightPx;
    const remaining = canvas.height - sy;
    const sliceH = Math.min(sliceHeightPx, remaining);

    // Canvas intermédiaire pour cette page
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, sy, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    const imgData = pageCanvas.toDataURL("image/png");
    const imgHeightMm = sliceH / pxPerMm;

    pdf.addImage(
      imgData,
      "PNG",
      margin,
      margin + headerHeight,
      contentWidth,
      imgHeightMm,
      undefined,
      "FAST"
    );

    drawFooter();
  }

  pdf.save(`${sanitize(fileName)}-rapport-seora.pdf`);
}
