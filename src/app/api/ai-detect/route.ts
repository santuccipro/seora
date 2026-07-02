import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { detectAI, detectByParagraph, Language } from "@/lib/humanize-engine";

const TOKEN_COST = 1;
const MAX_CHARS = 10000;

/**
 * POST /api/ai-detect
 *
 * Body JSON: { text: string, language?: "fr"|"en"|"es" }
 * Response:
 *   {
 *     overall: DetectorScore,
 *     paragraphs: ParagraphAIScore[],
 *     wordCount: number,
 *     charCount: number,
 *     topRiskZones: string[]
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const { success } = rateLimit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const text = String(body?.text ?? "").slice(0, MAX_CHARS);
    const language = (body?.language ?? "fr") as Language;

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        { error: "Texte trop court (min. 100 caractères)." },
        { status: 400 }
      );
    }
    if (!(["fr", "en", "es"] as Language[]).includes(language)) {
      return NextResponse.json({ error: "Langue non supportée" }, { status: 400 });
    }

    // Deduct 1 token
    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: TOKEN_COST } },
      data: { tokens: { decrement: TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json(
        { error: `Il faut ${TOKEN_COST} token pour analyser un texte.` },
        { status: 403 }
      );
    }

    try {
      const overall = detectAI(text, language);
      const paragraphs = detectByParagraph(text, language);
      const highRisk = paragraphs.filter(p => p.risk === "high").length;
      const mediumRisk = paragraphs.filter(p => p.risk === "medium").length;
      const lowRisk = paragraphs.filter(p => p.risk === "low").length;

      const topRiskZones = paragraphs
        .filter(p => p.risk === "high")
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(p => p.text.slice(0, 200) + (p.text.length > 200 ? "…" : ""));

      return NextResponse.json({
        overall,
        paragraphs,
        wordCount: text.trim().split(/\s+/).length,
        charCount: text.length,
        stats: {
          totalParagraphs: paragraphs.length,
          highRisk,
          mediumRisk,
          lowRisk,
        },
        topRiskZones,
      });
    } catch (err) {
      // Refund tokens on internal failure
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: TOKEN_COST } },
      });
      throw err;
    }
  } catch (err) {
    console.error("[api/ai-detect] Fatal:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
