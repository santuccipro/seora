import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildCvHtml } from "@/app/api/cv-build/pdf/route";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/cv-build/preview
 * Returns the rendered HTML for live preview in an iframe.
 * Same payload as /api/cv-build/pdf but returns HTML instead of PDF.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const cv = await req.json().catch(() => null);
  if (!cv || !cv.firstName || !cv.lastName) {
    return NextResponse.json({ error: "Données CV incomplètes" }, { status: 400 });
  }

  const html = await buildCvHtml(cv);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
