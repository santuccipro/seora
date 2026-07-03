import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { analyzeCVDeep } from "@/lib/cv-deep-analysis";
import { CvSectorKey } from "@/lib/cv-criteria";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/cv-report
 *
 * Body: { cvAnalysisId: string, sector: CvSectorKey, targetRole?: string }
 *
 * Consumes 2 tokens. Runs a sector-aware deep analysis (Claude Sonnet)
 * and returns the full report. Result is cached inline in
 * CVAnalysis.corrections (JSON string) so the front can reload it later
 * without re-consuming tokens.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const { success } = rateLimit(user.id);
  if (!success) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as
    | { cvAnalysisId: string; sector: CvSectorKey; targetRole?: string }
    | null;
  if (!body?.cvAnalysisId || !body?.sector) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const cvAnalysis = await prisma.cVAnalysis.findFirst({
    where: { id: body.cvAnalysisId, userId: user.id },
  });
  if (!cvAnalysis) return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });

  const TOKEN_COST = 2;
  const deduct = await prisma.user.updateMany({
    where: { id: user.id, tokens: { gte: TOKEN_COST } },
    data: { tokens: { decrement: TOKEN_COST } },
  });
  if (deduct.count === 0) {
    return NextResponse.json({ error: `Il te faut ${TOKEN_COST} tokens.` }, { status: 403 });
  }

  try {
    const report = await analyzeCVDeep(cvAnalysis.fileContent, body.sector, body.targetRole);

    // Persist inline in `corrections` field (existing text col) so we can
    // reload without a schema migration.
    await prisma.cVAnalysis.update({
      where: { id: cvAnalysis.id },
      data: {
        corrections: JSON.stringify({ __deepReport: report }),
        tokensUsed: (cvAnalysis.tokensUsed ?? 0) + TOKEN_COST,
      },
    });

    return NextResponse.json({ report });
  } catch (err) {
    // Refund on failure
    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: { increment: TOKEN_COST } },
    });
    console.error("cv-report error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur analyse" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cv-report?cvAnalysisId=...
 * Returns a previously cached deep report (no token cost).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const id = new URL(req.url).searchParams.get("cvAnalysisId");
  if (!id) return NextResponse.json({ error: "cvAnalysisId manquant" }, { status: 400 });

  const cv = await prisma.cVAnalysis.findFirst({ where: { id, userId: user.id } });
  if (!cv) return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });

  if (!cv.corrections) return NextResponse.json({ report: null });
  try {
    const parsed = JSON.parse(cv.corrections);
    if (parsed?.__deepReport) return NextResponse.json({ report: parsed.__deepReport });
  } catch {
    // corrections field is holding non-deep-report data
  }
  return NextResponse.json({ report: null });
}
