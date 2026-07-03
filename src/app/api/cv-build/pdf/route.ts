import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CV_SECTOR_CRITERIA, CvSectorKey } from "@/lib/cv-criteria";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}
interface Education {
  id: string;
  degree: string;
  school: string;
  location: string;
  startDate: string;
  endDate: string;
  mention?: string;
}
interface LanguageEntry {
  id: string;
  name: string;
  level: string;
}
interface CvPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  linkedIn: string;
  portfolio: string;
  photoUrl: string | null;
  sector: CvSectorKey;
  targetRole: string;
  summary: string;
  experiences: Experience[];
  educations: Education[];
  skills: string[];
  languages: LanguageEntry[];
  interests: string[];
}

/**
 * POST /api/cv-build/pdf
 *
 * Body: CvPayload (see /cv-builder)
 * Returns: application/pdf
 *
 * Uses the sector palette from `CV_SECTOR_CRITERIA` to pick colors and a
 * template feel. Density and typography are informed by the sector but the
 * layout is a single A4 column that ATS parsers handle reliably.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const cv = (await req.json().catch(() => null)) as CvPayload | null;
  if (!cv || !cv.firstName || !cv.lastName) {
    return NextResponse.json({ error: "Données CV incomplètes" }, { status: 400 });
  }

  const criteria = CV_SECTOR_CRITERIA[cv.sector] ?? CV_SECTOR_CRITERIA.generique;
  const [primaryHex, secondaryHex] = criteria.visual.palette;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const A4: [number, number] = [595.28, 841.89];
  let page = doc.addPage(A4);
  const margin = 46;
  const maxWidth = A4[0] - margin * 2;
  let y = A4[1] - margin;

  const primary = hexToRgb(primaryHex);
  const secondary = hexToRgb(secondaryHex);
  const grayDark = rgb(0.15, 0.17, 0.2);
  const grayLight = rgb(0.5, 0.53, 0.58);

  const density = criteria.visual.density;
  const bodySize = density === "dense" ? 9.5 : density === "airy" ? 10.5 : 10;
  const lineGap = density === "dense" ? 12 : density === "airy" ? 16 : 13.5;

  const ensureSpace = (need: number) => {
    if (y - need < margin) {
      page = doc.addPage(A4);
      y = A4[1] - margin;
    }
  };
  const drawText = (
    text: string,
    x: number,
    py: number,
    opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {}
  ) => {
    const f = opts.font ?? font;
    const size = opts.size ?? bodySize;
    const color = opts.color ?? grayDark;
    page.drawText(text, { x, y: py, size, font: f, color });
  };
  const wrap = (text: string, width: number, f: PDFFont, size: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > width && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  // ── Header block ──
  const headerHeight = 84;
  page.drawRectangle({ x: 0, y: A4[1] - headerHeight, width: A4[0], height: headerHeight, color: primary });
  drawText(`${cv.firstName} ${cv.lastName}`, margin, A4[1] - 40, { font: bold, size: 22, color: rgb(1, 1, 1) });
  drawText(cv.targetRole || "", margin, A4[1] - 60, { font: italic, size: 12, color: rgb(0.95, 0.95, 0.95) });
  const contactLine = [cv.email, cv.phone, cv.city].filter(Boolean).join("  ·  ");
  if (contactLine) drawText(contactLine, margin, A4[1] - 76, { size: 9, color: rgb(0.9, 0.9, 0.9) });
  const linksLine = [cv.linkedIn, cv.portfolio].filter(Boolean).join("  ·  ");
  y = A4[1] - headerHeight - 16;
  if (linksLine) {
    drawText(linksLine, margin, y, { size: 9, color: grayLight });
    y -= 14;
  }

  // ── Section helper ──
  const sectionTitle = (label: string) => {
    ensureSpace(28);
    y -= 6;
    drawText(label.toUpperCase(), margin, y, { font: bold, size: 10, color: primary });
    y -= 4;
    page.drawLine({
      start: { x: margin, y },
      end: { x: A4[0] - margin, y },
      thickness: 0.8,
      color: secondary,
    });
    y -= lineGap;
  };

  // ── Summary ──
  if (cv.summary) {
    sectionTitle("Résumé pro");
    const lines = wrap(cv.summary, maxWidth, font, bodySize);
    for (const line of lines) {
      ensureSpace(lineGap);
      drawText(line, margin, y, { size: bodySize });
      y -= lineGap;
    }
  }

  // ── Experiences ──
  if (cv.experiences.length > 0) {
    sectionTitle("Expériences professionnelles");
    for (const exp of cv.experiences) {
      ensureSpace(lineGap * 2 + 4);
      drawText(`${exp.title}${exp.company ? ` · ${exp.company}` : ""}`, margin, y, { font: bold, size: bodySize + 0.5 });
      const rangeStr = [exp.startDate, exp.endDate || (exp.current ? "En cours" : "")].filter(Boolean).join(" – ");
      const rangeWidth = font.widthOfTextAtSize(rangeStr, bodySize - 1);
      drawText(rangeStr, A4[0] - margin - rangeWidth, y, { size: bodySize - 1, color: grayLight });
      y -= lineGap;
      if (exp.location) {
        drawText(exp.location, margin, y, { font: italic, size: bodySize - 1, color: grayLight });
        y -= lineGap;
      }
      for (const b of exp.bullets) {
        if (!b.trim()) continue;
        const bulletPrefix = "• ";
        const wrapped = wrap(b, maxWidth - 14, font, bodySize);
        for (let i = 0; i < wrapped.length; i++) {
          ensureSpace(lineGap);
          const line = i === 0 ? `${bulletPrefix}${wrapped[i]}` : `  ${wrapped[i]}`;
          drawText(line, margin, y, { size: bodySize });
          y -= lineGap;
        }
      }
      y -= 6;
    }
  }

  // ── Educations ──
  if (cv.educations.length > 0) {
    sectionTitle("Formations");
    for (const edu of cv.educations) {
      ensureSpace(lineGap * 2);
      drawText(edu.degree, margin, y, { font: bold, size: bodySize + 0.5 });
      const rangeStr = [edu.startDate, edu.endDate].filter(Boolean).join(" – ");
      const rangeWidth = font.widthOfTextAtSize(rangeStr, bodySize - 1);
      drawText(rangeStr, A4[0] - margin - rangeWidth, y, { size: bodySize - 1, color: grayLight });
      y -= lineGap;
      const line2 = [edu.school, edu.location, edu.mention].filter(Boolean).join(" · ");
      if (line2) {
        drawText(line2, margin, y, { size: bodySize - 0.5, color: grayLight });
        y -= lineGap;
      }
      y -= 4;
    }
  }

  // ── Skills / Languages / Interests (grid-ish) ──
  const remaining: Array<[string, string]> = [];
  if (cv.skills.length > 0) remaining.push(["Compétences", cv.skills.join(" · ")]);
  if (cv.languages.length > 0) remaining.push(["Langues", cv.languages.map((l) => `${l.name} (${l.level})`).join(" · ")]);
  if (cv.interests.length > 0) remaining.push(["Centres d'intérêt", cv.interests.join(" · ")]);

  for (const [title, content] of remaining) {
    sectionTitle(title);
    const wrapped = wrap(content, maxWidth, font, bodySize);
    for (const line of wrapped) {
      ensureSpace(lineGap);
      drawText(line, margin, y, { size: bodySize });
      y -= lineGap;
    }
  }

  const buf = await doc.save();
  const safeName = `${cv.lastName || "cv"}_${cv.firstName || ""}`.replace(/[^\w\-]/g, "_");
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return rgb(r, g, b);
}
