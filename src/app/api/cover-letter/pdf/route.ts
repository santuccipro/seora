import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  CoverLetterData,
  getSectorLetterDefaults,
  renderLetterHtml,
} from "@/lib/cover-letter-templates/index";
import { launchBrowser } from "@/lib/pdf-browser";

export const runtime = "nodejs";
export const maxDuration = 300;

interface PdfPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  companyName?: string;
  companyAddress?: string;
  recipientName?: string;
  coverLetter: string;
  tone?: string;
  templateStyle?: "sober" | "modern" | "creative" | "editorial";
  customization?: Record<string, string>;
}

function parseLetter(text: string, payload: PdfPayload): CoverLetterData {
  const lines = text.trim().split("\n");

  const subjectIdx = lines.findIndex((l) => /^objet\s*:/i.test(l.trim()));
  const subject =
    subjectIdx >= 0
      ? lines[subjectIdx].replace(/^objet\s*:/i, "").trim()
      : `Candidature — ${payload.companyName ?? ""}`;

  const bodyLines = subjectIdx >= 0 ? lines.slice(subjectIdx + 1) : lines;
  const rawParas: string[] = [];
  let cur = "";
  for (const line of bodyLines) {
    if (line.trim() === "") {
      if (cur.trim()) { rawParas.push(cur.trim()); cur = ""; }
    } else {
      cur += (cur ? " " : "") + line;
    }
  }
  if (cur.trim()) rawParas.push(cur.trim());

  const closing =
    rawParas.length > 1
      ? rawParas.pop()!
      : "Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.";

  const paragraphs = rawParas.filter(
    (p) => p.length > 20 && !/^(madame|monsieur|à|objet)/i.test(p)
  );

  const today = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return {
    firstName: payload.firstName ?? "",
    lastName: payload.lastName ?? "",
    email: payload.email ?? "",
    phone: payload.phone ?? "",
    city: payload.city ?? "",
    date: `${payload.city ?? "Paris"}, le ${today}`,
    recipientName: payload.recipientName ?? "Madame, Monsieur",
    companyName: payload.companyName ?? "",
    companyAddress: payload.companyAddress,
    subject,
    paragraphs,
    closing,
    signature: `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim(),
    accent: payload.customization?.accent ?? "#1A1A2E",
  };
}

function resolveStyle(payload: PdfPayload): "sober" | "modern" | "creative" | "editorial" {
  if (payload.templateStyle) return payload.templateStyle;
  const toneMap: Record<string, "sober" | "modern" | "creative" | "editorial"> = {
    finance: "sober",
    conseil: "sober",
    sante: "sober",
    startup: "modern",
  };
  return toneMap[payload.tone ?? ""] ?? "sober";
}

function buildHtml(payload: PdfPayload): string {
  const data = parseLetter(payload.coverLetter, payload);
  const style = resolveStyle(payload);
  return renderLetterHtml(data, style);
}

/**
 * POST /api/cover-letter/pdf — render to PDF
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as PdfPayload | null;
  if (!payload?.coverLetter) {
    return NextResponse.json({ error: "coverLetter manquant" }, { status: 400 });
  }

  const html = buildHtml(payload);

  const browser = await launchBrowser();

  let pdfBuffer: Buffer;
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    pdfBuffer = Buffer.from(await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    }));
    await page.close();
  } finally {
    await browser.close();
  }

  const safeName = `LM_${payload.lastName ?? "seora"}_${payload.companyName ?? ""}`.replace(/[^\w\-]/g, "_");
  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}

/**
 * GET /api/cover-letter/pdf?data=<base64-json> — HTML preview (no auth required)
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("data");
  if (!raw) return NextResponse.json({ error: "Missing data param" }, { status: 400 });

  let payload: PdfPayload;
  try {
    payload = JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as PdfPayload;
  } catch {
    return NextResponse.json({ error: "Invalid data param" }, { status: 400 });
  }

  if (!payload.coverLetter) {
    return NextResponse.json({ error: "coverLetter manquant" }, { status: 400 });
  }

  const html = buildHtml(payload);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
