import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  llmRewrite,
  deterministicHumanize,
  detectAI,
  applyPreservation,
  restorePreservation,
  HumanizeMode,
  Language,
} from "@/lib/humanize-engine";

const TOKEN_COST: Record<HumanizeMode, number> = {
  basic: 2,
  balanced: 3,
  aggressive: 5,
  "compilatio-proof": 8,
};

/**
 * POST /api/humanize/[id]/regenerate
 *
 * Re-runs the humanization with a stronger mode (bump to aggressive if not
 * already), on the existing originalText. Consumes tokens for the new mode.
 * Updates the same analysis in place.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const { success } = rateLimit(user.id);
  if (!success) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  const analysis = await prisma.humanizerAnalysis.findFirst({
    where: { id, userId: user.id },
  });
  if (!analysis || !analysis.originalText) {
    return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const mode: HumanizeMode = body.mode ?? "aggressive";
  const language: Language = body.language ?? "fr";

  const tokenCost = TOKEN_COST[mode];
  const deductResult = await prisma.user.updateMany({
    where: { id: user.id, tokens: { gte: tokenCost } },
    data: { tokens: { decrement: tokenCost } },
  });
  if (deductResult.count === 0) {
    return NextResponse.json(
      { error: `Pas assez de tokens. Il faut ${tokenCost} tokens (mode ${mode}).` },
      { status: 403 }
    );
  }

  try {
    const preservation = applyPreservation(analysis.originalText);
    const det = deterministicHumanize(preservation.text, language);
    const { text: rewritten } = await llmRewrite(det.text, language, mode);
    const finalText = restorePreservation(rewritten, preservation.map);
    const scoreAfter = detectAI(finalText, language);
    const scoreBefore = analysis.aiScoreBefore
      ? { overall: analysis.aiScoreBefore } as unknown
      : detectAI(analysis.originalText, language);

    const updated = await prisma.humanizerAnalysis.update({
      where: { id: analysis.id },
      data: {
        humanizedText: finalText,
        aiScoreAfter: scoreAfter.overall,
        passesCount: { increment: 1 },
        wordCount: finalText.trim().split(/\s+/).length,
        tokensUsed: { increment: tokenCost },
        status: "done",
        scoreDetails: JSON.stringify({
          before: scoreBefore,
          after: scoreAfter,
          mode,
          language,
          regenerated: true,
        }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      aiScoreAfter: updated.aiScoreAfter,
      passesCount: updated.passesCount,
      wordCount: updated.wordCount,
    });
  } catch (err) {
    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: { increment: tokenCost } },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur lors de la régénération" },
      { status: 500 }
    );
  }
}
