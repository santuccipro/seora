import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/humanize/[id]/export?format=docx|pdf|txt
 * Streams the humanized document back to the user in the requested format.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const analysis = await prisma.humanizerAnalysis.findFirst({
    where: { id, userId: user.id },
  });
  if (!analysis || !analysis.humanizedText) {
    return NextResponse.json({ error: "Analyse introuvable ou non terminée" }, { status: 404 });
  }

  const format = (new URL(req.url).searchParams.get("format") || "docx").toLowerCase();
  const baseName = analysis.fileName.replace(/\.[^.]+$/, "");
  const safeName = baseName.replace(/[^\w\-\s]/g, "_");

  if (format === "txt") {
    return new NextResponse(analysis.humanizedText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-humanise.txt"`,
      },
    });
  }

  if (format === "docx") {
    const buffer = await buildDocx(analysis.humanizedText, analysis.fileName);
    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}-humanise.docx"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await buildPdf(analysis.humanizedText, safeName);
    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}-humanise.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Format non supporté (docx, pdf, txt)" }, { status: 400 });
}

async function buildDocx(text: string, sourceFileName: string): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

  const paragraphs = text.split(/\n\n+/).flatMap((raw, idx) => {
    const clean = raw.trim();
    if (!clean) return [];

    // Detect headings (activity title, "I.", "II.", "1.", etc.)
    if (/^Activité\s*-\s*Type\s*\d/i.test(clean)) {
      return [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: clean, bold: true, color: "FF0000", size: 32 })],
          spacing: { before: 400, after: 200 },
        }),
      ];
    }
    if (/^[IVX]+\.\s+[A-ZÉÈÀÎÔÛÇ]/.test(clean) && clean.length < 100) {
      return [
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: clean, bold: true, size: 28 })],
          spacing: { before: 360, after: 160 },
        }),
      ];
    }
    if (/^\d+\.\s+/.test(clean) && clean.length < 120 && !clean.endsWith(".")) {
      return [
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: clean, bold: true, size: 24 })],
          spacing: { before: 240, after: 120 },
        }),
      ];
    }
    return [
      new Paragraph({
        children: [new TextRun({ text: clean, size: 22 })],
        spacing: { after: 140, line: 300 },
      }),
    ];
  });

  const doc = new Document({
    creator: "Seora",
    title: `${sourceFileName} — humanisé`,
    sections: [{ children: paragraphs }],
  });

  return Packer.toBuffer(doc);
}

async function buildPdf(text: string, safeName: string): Promise<Buffer> {
  // Convert plain text → simple HTML → PDF via Chromium (Playwright is not
  // guaranteed on the server, so fallback to a lightweight PDF builder using
  // pdf-lib for portability).
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const margin = 60;
  const maxWidth = pageSize[0] - margin * 2;
  const lineHeight = 14;
  const fontSize = 11;

  let page = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  const paragraphs = text.split(/\n\n+/);
  for (const raw of paragraphs) {
    const clean = raw.trim();
    if (!clean) continue;

    const isHeading =
      /^Activité\s*-\s*Type/i.test(clean) ||
      /^[IVX]+\.\s/.test(clean) ||
      (/^\d+\.\s/.test(clean) && clean.length < 120);

    const activeFont = isHeading ? boldFont : font;
    const size = isHeading ? 13 : fontSize;

    const lines = wrapText(clean, maxWidth, activeFont, size);
    if (y - lines.length * lineHeight < margin) {
      page = doc.addPage(pageSize);
      y = pageSize[1] - margin;
    }

    // Extra space before heading
    if (isHeading) y -= 8;

    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: activeFont,
        color: rgb(0.08, 0.09, 0.11),
      });
      y -= lineHeight;
      if (y < margin) {
        page = doc.addPage(pageSize);
        y = pageSize[1] - margin;
      }
    }
    y -= 8;
  }

  return Buffer.from(await doc.save());
}

function wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
