import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CV_SECTOR_CRITERIA, CvSectorKey, CvTemplateKey } from "@/lib/cv-criteria";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb, RGB } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 300;

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
 * Renders one of 4 real template families based on sector:
 *   - sober      : single column, serif titles, right-aligned dates
 *   - modern     : two-column (sidebar + main), photo + contact in sidebar
 *   - creative   : accent block header, colored section chips
 *   - editorial  : airy, big serif title, top-right photo, decorative rules
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

  const doc = await PDFDocument.create();
  const fonts = {
    body: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    titleSerif: await doc.embedFont(StandardFonts.TimesRomanBold),
    serifBody: await doc.embedFont(StandardFonts.TimesRoman),
    serifItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };

  const [primary, secondary, accent] = criteria.visual.palette.map(hexToRgb) as [RGB, RGB, RGB];
  const palette = {
    primary,
    secondary: secondary ?? primary,
    accent: accent ?? secondary ?? primary,
    grayDark: rgb(0.15, 0.17, 0.2),
    grayMid: rgb(0.35, 0.38, 0.42),
    grayLight: rgb(0.55, 0.58, 0.62),
    grayFaint: rgb(0.85, 0.87, 0.9),
    white: rgb(1, 1, 1),
  };

  const photo = await embedPhoto(doc, cv.photoUrl);

  switch (criteria.visual.templateKey) {
    case "modern":
      await renderModern(doc, fonts, palette, cv, criteria.visual.density, photo);
      break;
    case "creative":
      await renderCreative(doc, fonts, palette, cv, criteria.visual.density, photo);
      break;
    case "editorial":
      await renderEditorial(doc, fonts, palette, cv, criteria.visual.density, photo);
      break;
    default:
      await renderSober(doc, fonts, palette, cv, criteria.visual.density, photo);
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

/* ───────── Shared helpers ───────── */

type Fonts = {
  body: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  titleSerif: PDFFont;
  serifBody: PDFFont;
  serifItalic: PDFFont;
};

type Palette = {
  primary: RGB;
  secondary: RGB;
  accent: RGB;
  grayDark: RGB;
  grayMid: RGB;
  grayLight: RGB;
  grayFaint: RGB;
  white: RGB;
};

const A4: [number, number] = [595.28, 841.89];

function hexToRgb(hex?: string): RGB {
  if (!hex) return rgb(0.2, 0.2, 0.2);
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}

async function embedPhoto(doc: PDFDocument, dataUrl: string | null): Promise<PDFImage | null> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return null;
  try {
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!match) return null;
    const bytes = Buffer.from(match[2], "base64");
    return match[1] === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

function wrap(text: string, width: number, font: PDFFont, size: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > width && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCirclePhoto(page: PDFPage, img: PDFImage, cx: number, cy: number, radius: number) {
  // pdf-lib has no clipping — draw a white circle border first, then square inside.
  // Uses the "circular avatar" trick: overlay 4 white arcs mask via pieces. Simpler:
  // just draw square image, then draw a colored border ring so it visually reads as framed.
  const size = radius * 2;
  page.drawImage(img, { x: cx - radius, y: cy - radius, width: size, height: size });
  page.drawCircle({ x: cx, y: cy, size: radius, borderColor: rgb(1, 1, 1), borderWidth: 4 });
}

/* ───────── SOBER (banque, conseil, juridique, santé, industrie, logistique, éducation) ───────── */

async function renderSober(
  doc: PDFDocument,
  f: Fonts,
  p: Palette,
  cv: CvPayload,
  density: "airy" | "balanced" | "dense",
  photo: PDFImage | null
) {
  let page = doc.addPage(A4);
  const margin = 50;
  const maxWidth = A4[0] - margin * 2;
  const bodySize = density === "dense" ? 9.5 : density === "airy" ? 10.5 : 10;
  const lineGap = density === "dense" ? 12 : density === "airy" ? 15 : 13;
  let y = A4[1] - margin;

  const ensure = (need: number) => {
    if (y - need < margin + 20) {
      page = doc.addPage(A4);
      y = A4[1] - margin;
    }
  };

  // Header: name in serif, target role subtle, gold underline
  page.drawText(`${cv.firstName} ${cv.lastName}`, {
    x: margin, y: y - 24, size: 26, font: f.titleSerif, color: p.primary,
  });
  y -= 34;
  if (cv.targetRole) {
    page.drawText(cv.targetRole, { x: margin, y, size: 12, font: f.serifItalic, color: p.grayMid });
    y -= 20;
  }
  // Contact line
  const contact = [cv.email, cv.phone, cv.city, cv.linkedIn, cv.portfolio].filter(Boolean).join("   ·   ");
  if (contact) {
    page.drawText(contact, { x: margin, y, size: 8.5, font: f.body, color: p.grayLight });
    y -= 12;
  }
  page.drawLine({
    start: { x: margin, y: y - 4 }, end: { x: margin + 80, y: y - 4 },
    thickness: 1.5, color: p.accent,
  });
  y -= 20;

  // Photo top-right (small)
  if (photo) {
    const size = 70;
    page.drawImage(photo, {
      x: A4[0] - margin - size, y: A4[1] - margin - size,
      width: size, height: size,
    });
  }

  const section = (title: string) => {
    ensure(28);
    page.drawText(title.toUpperCase(), {
      x: margin, y, size: 10, font: f.titleSerif, color: p.primary,
    });
    y -= 4;
    page.drawLine({
      start: { x: margin, y }, end: { x: A4[0] - margin, y },
      thickness: 0.5, color: p.grayFaint,
    });
    y -= lineGap;
  };

  if (cv.summary) {
    section("Résumé pro");
    for (const line of wrap(cv.summary, maxWidth, f.serifBody, bodySize)) {
      ensure(lineGap);
      page.drawText(line, { x: margin, y, size: bodySize, font: f.serifBody, color: p.grayDark });
      y -= lineGap;
    }
    y -= 4;
  }

  if (cv.experiences.length) {
    section("Expériences professionnelles");
    for (const exp of cv.experiences) {
      ensure(lineGap * 3);
      page.drawText(`${exp.title}${exp.company ? " · " + exp.company : ""}`, {
        x: margin, y, size: bodySize + 0.5, font: f.bold, color: p.grayDark,
      });
      const range = [exp.startDate, exp.endDate || (exp.current ? "En cours" : "")].filter(Boolean).join(" – ");
      const rw = f.body.widthOfTextAtSize(range, bodySize - 1);
      page.drawText(range, { x: A4[0] - margin - rw, y, size: bodySize - 1, font: f.body, color: p.grayLight });
      y -= lineGap;
      if (exp.location) {
        page.drawText(exp.location, { x: margin, y, size: bodySize - 1, font: f.italic, color: p.grayLight });
        y -= lineGap;
      }
      for (const b of exp.bullets) {
        if (!b.trim()) continue;
        const wrapped = wrap(b, maxWidth - 14, f.body, bodySize);
        for (let i = 0; i < wrapped.length; i++) {
          ensure(lineGap);
          const line = i === 0 ? `• ${wrapped[i]}` : `  ${wrapped[i]}`;
          page.drawText(line, { x: margin + (i === 0 ? 0 : 4), y, size: bodySize, font: f.body, color: p.grayDark });
          y -= lineGap;
        }
      }
      y -= 6;
    }
  }

  if (cv.educations.length) {
    section("Formations");
    for (const edu of cv.educations) {
      ensure(lineGap * 2);
      page.drawText(edu.degree, { x: margin, y, size: bodySize + 0.5, font: f.bold, color: p.grayDark });
      const range = [edu.startDate, edu.endDate].filter(Boolean).join(" – ");
      const rw = f.body.widthOfTextAtSize(range, bodySize - 1);
      page.drawText(range, { x: A4[0] - margin - rw, y, size: bodySize - 1, font: f.body, color: p.grayLight });
      y -= lineGap;
      const line2 = [edu.school, edu.location, edu.mention].filter(Boolean).join(" · ");
      if (line2) {
        page.drawText(line2, { x: margin, y, size: bodySize - 0.5, font: f.serifItalic, color: p.grayMid });
        y -= lineGap;
      }
      y -= 4;
    }
  }

  const misc: Array<[string, string]> = [];
  if (cv.skills.length) misc.push(["Compétences", cv.skills.join(" · ")]);
  if (cv.languages.length) misc.push(["Langues", cv.languages.map((l) => `${l.name} (${l.level})`).join(" · ")]);
  if (cv.interests.length) misc.push(["Centres d'intérêt", cv.interests.join(" · ")]);
  for (const [t, c] of misc) {
    section(t);
    for (const line of wrap(c, maxWidth, f.body, bodySize)) {
      ensure(lineGap);
      page.drawText(line, { x: margin, y, size: bodySize, font: f.body, color: p.grayDark });
      y -= lineGap;
    }
    y -= 4;
  }
}

/* ───────── MODERN (tech, commerce, immobilier, RH, générique) ───────── */

async function renderModern(
  doc: PDFDocument,
  f: Fonts,
  p: Palette,
  cv: CvPayload,
  _density: "airy" | "balanced" | "dense",
  photo: PDFImage | null
) {
  let page = doc.addPage(A4);
  const sidebarWidth = 190;
  const margin = 22;
  const sideX = margin;
  const mainX = sidebarWidth + margin + 16;
  const mainWidth = A4[0] - mainX - margin;
  const bodySize = 9.5;
  const lineGap = 12.5;

  // Full-height sidebar with primary color
  page.drawRectangle({ x: 0, y: 0, width: sidebarWidth + margin, height: A4[1], color: p.primary });

  // Sidebar contents
  let sideY = A4[1] - 28;

  // Photo in circle
  if (photo) {
    const radius = 60;
    const cx = margin + (sidebarWidth) / 2 - margin / 2;
    const cy = sideY - radius;
    drawCirclePhoto(page, photo, cx, cy, radius);
    sideY -= radius * 2 + 22;
  } else {
    sideY -= 16;
  }

  // Name in sidebar
  const nameLines = wrap(`${cv.firstName} ${cv.lastName}`, sidebarWidth - 24, f.bold, 15);
  for (const line of nameLines) {
    const w = f.bold.widthOfTextAtSize(line, 15);
    page.drawText(line, {
      x: sideX + (sidebarWidth - w) / 2 - margin / 2, y: sideY,
      size: 15, font: f.bold, color: p.white,
    });
    sideY -= 18;
  }
  if (cv.targetRole) {
    const roleLines = wrap(cv.targetRole, sidebarWidth - 24, f.italic, 9.5);
    sideY -= 4;
    for (const line of roleLines) {
      const w = f.italic.widthOfTextAtSize(line, 9.5);
      page.drawText(line, {
        x: sideX + (sidebarWidth - w) / 2 - margin / 2, y: sideY,
        size: 9.5, font: f.italic, color: rgb(0.92, 0.92, 0.94),
      });
      sideY -= 12;
    }
  }
  sideY -= 12;
  page.drawLine({ start: { x: sideX + 20, y: sideY }, end: { x: sideX + sidebarWidth - 20 - margin, y: sideY }, thickness: 0.6, color: p.accent });
  sideY -= 16;

  const sideSection = (title: string) => {
    sideY -= 4;
    page.drawText(title.toUpperCase(), { x: sideX + 12, y: sideY, size: 8.5, font: f.bold, color: p.accent });
    sideY -= 12;
  };
  const sideLine = (text: string, opts: { size?: number; font?: PDFFont } = {}) => {
    const size = opts.size ?? 8.5;
    const font = opts.font ?? f.body;
    const lines = wrap(text, sidebarWidth - 18, font, size);
    for (const l of lines) {
      page.drawText(l, { x: sideX + 12, y: sideY, size, font, color: p.white });
      sideY -= size + 3;
    }
  };

  if (cv.email || cv.phone || cv.city || cv.linkedIn || cv.portfolio) {
    sideSection("Contact");
    [cv.email, cv.phone, cv.city, cv.linkedIn, cv.portfolio].filter(Boolean).forEach((t) => sideLine(t));
    sideY -= 6;
  }
  if (cv.skills.length) {
    sideSection("Compétences");
    for (const s of cv.skills) sideLine(`• ${s}`);
    sideY -= 6;
  }
  if (cv.languages.length) {
    sideSection("Langues");
    for (const l of cv.languages) sideLine(`${l.name} · ${l.level}`);
    sideY -= 6;
  }
  if (cv.interests.length) {
    sideSection("Intérêts");
    for (const i of cv.interests) sideLine(`• ${i}`);
  }

  // Main column
  let y = A4[1] - 40;
  const ensure = (need: number) => {
    if (y - need < 40) {
      page = doc.addPage(A4);
      // Re-draw sidebar on new page for visual continuity
      page.drawRectangle({ x: 0, y: 0, width: sidebarWidth + margin, height: A4[1], color: p.primary });
      y = A4[1] - 40;
    }
  };

  const section = (title: string) => {
    ensure(30);
    page.drawText(title, { x: mainX, y, size: 12, font: f.bold, color: p.primary });
    y -= 4;
    page.drawLine({ start: { x: mainX, y }, end: { x: mainX + 40, y }, thickness: 2, color: p.accent });
    y -= 12;
  };

  if (cv.summary) {
    section("Profil");
    for (const line of wrap(cv.summary, mainWidth, f.body, bodySize)) {
      ensure(lineGap);
      page.drawText(line, { x: mainX, y, size: bodySize, font: f.body, color: p.grayDark });
      y -= lineGap;
    }
    y -= 6;
  }

  if (cv.experiences.length) {
    section("Expériences");
    for (const exp of cv.experiences) {
      ensure(lineGap * 3);
      page.drawText(exp.title, { x: mainX, y, size: bodySize + 1, font: f.bold, color: p.grayDark });
      y -= lineGap;
      const meta = [exp.company, exp.location].filter(Boolean).join(" · ");
      const range = [exp.startDate, exp.endDate || (exp.current ? "En cours" : "")].filter(Boolean).join(" – ");
      page.drawText(meta, { x: mainX, y, size: bodySize - 0.5, font: f.italic, color: p.grayMid });
      const rw = f.body.widthOfTextAtSize(range, bodySize - 1);
      page.drawText(range, { x: mainX + mainWidth - rw, y, size: bodySize - 1, font: f.body, color: p.grayLight });
      y -= lineGap + 2;
      for (const b of exp.bullets) {
        if (!b.trim()) continue;
        const wrapped = wrap(b, mainWidth - 14, f.body, bodySize);
        for (let i = 0; i < wrapped.length; i++) {
          ensure(lineGap);
          const line = i === 0 ? `▸ ${wrapped[i]}` : `  ${wrapped[i]}`;
          page.drawText(line, { x: mainX, y, size: bodySize, font: f.body, color: p.grayDark });
          y -= lineGap;
        }
      }
      y -= 6;
    }
  }

  if (cv.educations.length) {
    section("Formations");
    for (const edu of cv.educations) {
      ensure(lineGap * 2);
      page.drawText(edu.degree, { x: mainX, y, size: bodySize + 0.5, font: f.bold, color: p.grayDark });
      const range = [edu.startDate, edu.endDate].filter(Boolean).join(" – ");
      const rw = f.body.widthOfTextAtSize(range, bodySize - 1);
      page.drawText(range, { x: mainX + mainWidth - rw, y, size: bodySize - 1, font: f.body, color: p.grayLight });
      y -= lineGap;
      const line2 = [edu.school, edu.location, edu.mention].filter(Boolean).join(" · ");
      if (line2) {
        page.drawText(line2, { x: mainX, y, size: bodySize - 0.5, font: f.italic, color: p.grayMid });
        y -= lineGap;
      }
      y -= 4;
    }
  }
}

/* ───────── CREATIVE (marketing, communication) ───────── */

async function renderCreative(
  doc: PDFDocument,
  f: Fonts,
  p: Palette,
  cv: CvPayload,
  _density: "airy" | "balanced" | "dense",
  photo: PDFImage | null
) {
  let page = doc.addPage(A4);
  const margin = 44;
  const maxWidth = A4[0] - margin * 2;
  const bodySize = 10;
  const lineGap = 13.5;

  // Top accent block
  page.drawRectangle({ x: 0, y: A4[1] - 8, width: A4[0], height: 8, color: p.primary });
  // Corner accent triangle
  page.drawRectangle({ x: A4[0] - 40, y: A4[1] - 48, width: 40, height: 40, color: p.secondary });

  let y = A4[1] - 60;
  // Name huge
  page.drawText(`${cv.firstName}`, { x: margin, y, size: 28, font: f.bold, color: p.grayDark });
  const fnW = f.bold.widthOfTextAtSize(`${cv.firstName} `, 28);
  page.drawText(cv.lastName, { x: margin + fnW, y, size: 28, font: f.bold, color: p.primary });
  y -= 30;

  if (cv.targetRole) {
    page.drawText(cv.targetRole, { x: margin, y, size: 12, font: f.italic, color: p.grayMid });
    y -= 22;
  }

  // Contact chips
  const chips = [cv.email, cv.phone, cv.city, cv.linkedIn, cv.portfolio].filter(Boolean);
  let chipX = margin;
  for (const c of chips) {
    const w = f.body.widthOfTextAtSize(c, 8.5) + 14;
    if (chipX + w > A4[0] - margin) { y -= 18; chipX = margin; }
    page.drawRectangle({ x: chipX, y: y - 4, width: w, height: 14, color: p.grayFaint, borderColor: p.accent, borderWidth: 0.5 });
    page.drawText(c, { x: chipX + 7, y, size: 8.5, font: f.body, color: p.grayDark });
    chipX += w + 4;
  }
  y -= 26;

  if (photo) {
    // Round photo top-right
    drawCirclePhoto(page, photo, A4[0] - margin - 40, A4[1] - 100, 40);
  }

  const ensure = (need: number) => {
    if (y - need < margin) {
      page = doc.addPage(A4);
      y = A4[1] - margin;
    }
  };

  const section = (title: string) => {
    ensure(28);
    // Colored pill chip
    const w = f.bold.widthOfTextAtSize(title.toUpperCase(), 9) + 16;
    page.drawRectangle({ x: margin, y: y - 3, width: w, height: 16, color: p.primary });
    page.drawText(title.toUpperCase(), { x: margin + 8, y, size: 9, font: f.bold, color: p.white });
    y -= 22;
  };

  if (cv.summary) {
    section("Profil");
    for (const line of wrap(cv.summary, maxWidth, f.body, bodySize)) {
      ensure(lineGap);
      page.drawText(line, { x: margin, y, size: bodySize, font: f.body, color: p.grayDark });
      y -= lineGap;
    }
    y -= 6;
  }
  if (cv.experiences.length) {
    section("Expériences");
    for (const exp of cv.experiences) {
      ensure(lineGap * 3);
      // Left accent bar
      page.drawRectangle({ x: margin - 6, y: y - 12, width: 3, height: 22, color: p.accent });
      page.drawText(`${exp.title} @ ${exp.company}`, { x: margin, y, size: bodySize + 0.5, font: f.bold, color: p.primary });
      const range = [exp.startDate, exp.endDate || (exp.current ? "En cours" : "")].filter(Boolean).join(" – ");
      const rw = f.body.widthOfTextAtSize(range, bodySize - 1);
      page.drawText(range, { x: A4[0] - margin - rw, y, size: bodySize - 1, font: f.body, color: p.grayLight });
      y -= lineGap;
      if (exp.location) {
        page.drawText(exp.location, { x: margin, y, size: bodySize - 1, font: f.italic, color: p.grayLight });
        y -= lineGap;
      }
      for (const b of exp.bullets) {
        if (!b.trim()) continue;
        for (const line of wrap(b, maxWidth - 14, f.body, bodySize)) {
          ensure(lineGap);
          page.drawText(`▸ ${line}`, { x: margin, y, size: bodySize, font: f.body, color: p.grayDark });
          y -= lineGap;
        }
      }
      y -= 6;
    }
  }
  if (cv.educations.length) {
    section("Formations");
    for (const edu of cv.educations) {
      ensure(lineGap * 2);
      page.drawText(edu.degree, { x: margin, y, size: bodySize + 0.5, font: f.bold, color: p.grayDark });
      const range = [edu.startDate, edu.endDate].filter(Boolean).join(" – ");
      const rw = f.body.widthOfTextAtSize(range, bodySize - 1);
      page.drawText(range, { x: A4[0] - margin - rw, y, size: bodySize - 1, font: f.body, color: p.grayLight });
      y -= lineGap;
      const line2 = [edu.school, edu.location, edu.mention].filter(Boolean).join(" · ");
      if (line2) {
        page.drawText(line2, { x: margin, y, size: bodySize - 0.5, font: f.italic, color: p.grayMid });
        y -= lineGap;
      }
      y -= 4;
    }
  }

  // Skills / Languages side by side at bottom
  const misc: Array<[string, string[]]> = [];
  if (cv.skills.length) misc.push(["Skills", cv.skills]);
  if (cv.languages.length) misc.push(["Langues", cv.languages.map((l) => `${l.name} (${l.level})`)]);
  if (cv.interests.length) misc.push(["Intérêts", cv.interests]);
  for (const [title, items] of misc) {
    section(title);
    let cx = margin;
    for (const item of items) {
      const w = f.body.widthOfTextAtSize(item, bodySize) + 14;
      if (cx + w > A4[0] - margin) { y -= 16; cx = margin; }
      page.drawRectangle({ x: cx, y: y - 4, width: w, height: 14, color: p.grayFaint });
      page.drawText(item, { x: cx + 7, y, size: bodySize - 1, font: f.body, color: p.grayDark });
      cx += w + 4;
    }
    y -= 22;
  }
}

/* ───────── EDITORIAL (design, luxe, hôtellerie) ───────── */

async function renderEditorial(
  doc: PDFDocument,
  f: Fonts,
  p: Palette,
  cv: CvPayload,
  _density: "airy" | "balanced" | "dense",
  photo: PDFImage | null
) {
  let page = doc.addPage(A4);
  const margin = 56;
  const maxWidth = A4[0] - margin * 2;
  const bodySize = 10.5;
  const lineGap = 15;

  // Top decorative rule
  page.drawLine({ start: { x: margin, y: A4[1] - 40 }, end: { x: A4[0] - margin, y: A4[1] - 40 }, thickness: 0.3, color: p.grayLight });
  page.drawLine({ start: { x: margin, y: A4[1] - 44 }, end: { x: margin + 40, y: A4[1] - 44 }, thickness: 1.2, color: p.accent });

  let y = A4[1] - 90;
  // Big serif name
  page.drawText(cv.firstName.toUpperCase(), { x: margin, y, size: 34, font: f.titleSerif, color: p.primary });
  y -= 36;
  page.drawText(cv.lastName.toUpperCase(), { x: margin, y, size: 34, font: f.titleSerif, color: p.accent });
  y -= 30;

  if (cv.targetRole) {
    page.drawText(cv.targetRole, { x: margin, y, size: 11, font: f.serifItalic, color: p.grayMid });
    y -= 20;
  }

  // Contact — small caps letterspaced
  const contact = [cv.email, cv.phone, cv.city, cv.linkedIn, cv.portfolio].filter(Boolean).join(" · ");
  if (contact) {
    page.drawText(contact, { x: margin, y, size: 8, font: f.body, color: p.grayLight });
    y -= 14;
  }

  // Photo top-right, larger
  if (photo) {
    const size = 120;
    page.drawImage(photo, { x: A4[0] - margin - size, y: A4[1] - margin - size - 4, width: size, height: size });
    page.drawRectangle({ x: A4[0] - margin - size - 6, y: A4[1] - margin - size - 10, width: size + 12, height: size + 12, borderColor: p.accent, borderWidth: 0.6 });
  }

  y -= 20;
  page.drawLine({ start: { x: margin, y }, end: { x: A4[0] - margin, y }, thickness: 0.3, color: p.grayLight });
  y -= 20;

  const ensure = (need: number) => {
    if (y - need < margin) { page = doc.addPage(A4); y = A4[1] - margin; }
  };

  const section = (title: string) => {
    ensure(32);
    page.drawText(title, { x: margin, y, size: 13, font: f.titleSerif, color: p.primary });
    y -= 4;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + 24, y }, thickness: 1, color: p.accent });
    y -= 16;
  };

  if (cv.summary) {
    section("Profil");
    for (const line of wrap(cv.summary, maxWidth, f.serifBody, bodySize)) {
      ensure(lineGap);
      page.drawText(line, { x: margin, y, size: bodySize, font: f.serifBody, color: p.grayDark });
      y -= lineGap;
    }
    y -= 6;
  }
  if (cv.experiences.length) {
    section("Expériences");
    for (const exp of cv.experiences) {
      ensure(lineGap * 3);
      page.drawText(`${exp.title}`, { x: margin, y, size: bodySize + 1, font: f.titleSerif, color: p.grayDark });
      const range = [exp.startDate, exp.endDate || (exp.current ? "présent" : "")].filter(Boolean).join(" – ");
      const rw = f.body.widthOfTextAtSize(range, bodySize - 1);
      page.drawText(range, { x: A4[0] - margin - rw, y, size: bodySize - 1, font: f.serifItalic, color: p.grayLight });
      y -= lineGap;
      const meta = [exp.company, exp.location].filter(Boolean).join(" — ");
      if (meta) {
        page.drawText(meta, { x: margin, y, size: bodySize - 0.5, font: f.serifItalic, color: p.grayMid });
        y -= lineGap;
      }
      for (const b of exp.bullets) {
        if (!b.trim()) continue;
        for (const line of wrap(b, maxWidth - 18, f.serifBody, bodySize)) {
          ensure(lineGap);
          page.drawText(line, { x: margin + 18, y, size: bodySize, font: f.serifBody, color: p.grayDark });
          y -= lineGap;
        }
      }
      y -= 8;
    }
  }
  if (cv.educations.length) {
    section("Formations");
    for (const edu of cv.educations) {
      ensure(lineGap * 2);
      page.drawText(edu.degree, { x: margin, y, size: bodySize + 0.5, font: f.titleSerif, color: p.grayDark });
      const range = [edu.startDate, edu.endDate].filter(Boolean).join(" – ");
      const rw = f.body.widthOfTextAtSize(range, bodySize - 1);
      page.drawText(range, { x: A4[0] - margin - rw, y, size: bodySize - 1, font: f.serifItalic, color: p.grayLight });
      y -= lineGap;
      const line2 = [edu.school, edu.location, edu.mention].filter(Boolean).join(" · ");
      if (line2) {
        page.drawText(line2, { x: margin, y, size: bodySize - 0.5, font: f.serifItalic, color: p.grayMid });
        y -= lineGap;
      }
      y -= 4;
    }
  }
  const misc: Array<[string, string]> = [];
  if (cv.skills.length) misc.push(["Compétences", cv.skills.join(" · ")]);
  if (cv.languages.length) misc.push(["Langues", cv.languages.map((l) => `${l.name} (${l.level})`).join(" · ")]);
  if (cv.interests.length) misc.push(["Intérêts", cv.interests.join(" · ")]);
  for (const [t, c] of misc) {
    section(t);
    for (const line of wrap(c, maxWidth, f.serifBody, bodySize)) {
      ensure(lineGap);
      page.drawText(line, { x: margin, y, size: bodySize, font: f.serifBody, color: p.grayDark });
      y -= lineGap;
    }
    y -= 4;
  }
}
