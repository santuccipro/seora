import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CvSectorKey } from "@/lib/cv-criteria";
import { launchBrowser } from "@/lib/pdf-browser";

export const runtime = "nodejs";
export const maxDuration = 300;
export const preferredRegion = "cdg1";
// Puppeteer needs more memory than the default 1024MB
export const memory = 3009;

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
  customization?: Record<string, string | boolean>;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const cv = (await req.json().catch(() => null)) as CvPayload | null;
  if (!cv || !cv.firstName || !cv.lastName) {
    return NextResponse.json({ error: "Données CV incomplètes" }, { status: 400 });
  }

  let html: string;
  let pdfBuffer: Buffer;
  try {
    html = await buildCvHtml(cv);
    pdfBuffer = await renderPdf(html);
  } catch (err) {
    console.error("[cv-build/pdf] render error:", err);
    return NextResponse.json(
      { error: "Génération PDF échouée — réessaie dans quelques secondes" },
      { status: 500 }
    );
  }

  const safeName = `${cv.lastName || "cv"}_${cv.firstName || ""}`.replace(/[^\w\-]/g, "_");
  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}

export async function buildCvHtml(cv: CvPayload): Promise<string> {
  const { getTemplateFn, applyCustomize } = await import("@/lib/cv-templates");
  const tpl = getTemplateFn(cv.sector);
  const data = cvPayloadToTplData(cv);

  // Generate QR code SVG from LinkedIn or portfolio URL
  const qrTarget = cv.linkedIn
    ? (cv.linkedIn.startsWith("http") ? cv.linkedIn : `https://${cv.linkedIn}`)
    : cv.portfolio?.startsWith("http") ? cv.portfolio : cv.portfolio ? `https://${cv.portfolio}` : "";
  if (qrTarget) {
    try {
      const QRCode = await import("qrcode");
      const qrSvg = await QRCode.toString(qrTarget, { type: "svg", width: 72, margin: 1, color: { dark: "#0F172A", light: "#00000000" } });
      (data as Record<string, unknown>).qrSvg = qrSvg;
      (data as Record<string, unknown>).qrTarget = qrTarget;
    } catch { /* skip QR if generation fails */ }
  }

  const rawHtml = tpl(data);
  return applyCustomize(rawHtml, cv.customization ?? {});
}

async function renderPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    const buf = Buffer.from(await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    }));
    await page.close();
    return buf;
  } finally {
    await browser.close();
  }
}

function cvPayloadToTplData(cv: CvPayload) {
  return {
    firstName: cv.firstName,
    lastName: cv.lastName,
    role: cv.targetRole,
    email: cv.email,
    phone: cv.phone,
    city: cv.city,
    linkedin: cv.linkedIn,
    photo: cv.photoUrl ?? "",
    summary: cv.summary,
    experiences: cv.experiences.map((e) => ({
      title: e.title,
      company: e.company,
      location: e.location,
      dates: [e.startDate, e.endDate || (e.current ? "En cours" : "")]
        .filter(Boolean)
        .join(" – "),
      bullets: e.bullets.filter((b) => b.trim()),
    })),
    educations: cv.educations.map((e) => ({
      degree: e.degree,
      school: e.school,
      location: e.location,
      dates: [e.startDate, e.endDate].filter(Boolean).join(" – "),
      mention: e.mention,
    })),
    skills: cv.skills,
    languages: cv.languages.map((l) => ({ name: l.name, level: l.level })),
    interests: cv.interests,
  };
}
