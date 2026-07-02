import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { runFullHumanize, HumanizeMode, Language } from "@/lib/humanize-engine";

const TOKEN_COST: Record<HumanizeMode, number> = {
  basic: 2,
  balanced: 3,
  aggressive: 5,
};

const MAX_BATCH = 5;

/**
 * POST /api/humanize/batch
 *
 * FormData:
 *   files       : multiple File entries (max 5)
 *   mode        : "basic"|"balanced"|"aggressive"
 *   language    : "fr"|"en"|"es"
 *   targetScore : 0-100
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
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  const mode = (formData.get("mode") as HumanizeMode) ?? "balanced";
  const language = (formData.get("language") as Language) ?? "fr";
  const targetScore = Number(formData.get("targetScore") ?? 15);

  if (files.length === 0) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }
  if (files.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Max ${MAX_BATCH} fichiers par batch` },
      { status: 400 }
    );
  }

  const totalCost = TOKEN_COST[mode] * files.length;
  const deductResult = await prisma.user.updateMany({
    where: { id: user.id, tokens: { gte: totalCost } },
    data: { tokens: { decrement: totalCost } },
  });
  if (deductResult.count === 0) {
    return NextResponse.json(
      { error: `Pas assez de tokens (batch ${files.length}x ${mode} = ${totalCost} tokens).` },
      { status: 403 }
    );
  }

  const results: Array<{ fileName: string; id?: string; error?: string; aiScoreBefore?: number; aiScoreAfter?: number }> = [];

  for (const file of files) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["pdf", "docx", "doc", "txt"].includes(ext)) {
      results.push({ fileName: file.name, error: "Format non supporté" });
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: TOKEN_COST[mode] } },
      });
      continue;
    }

    const analysis = await prisma.humanizerAnalysis.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileType: ext,
        originalText: "",
        status: "extracting",
        tokensUsed: TOKEN_COST[mode],
      },
    });

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await runFullHumanize(buffer, file.name, file.type, {
        mode,
        language,
        targetScore,
      });
      await prisma.humanizerAnalysis.update({
        where: { id: analysis.id },
        data: {
          originalText: result.originalText,
          humanizedText: result.humanizedText,
          aiScoreBefore: result.scoreBefore.overall,
          aiScoreAfter: result.scoreAfter.overall,
          scoreDetails: JSON.stringify({
            before: result.scoreBefore,
            after: result.scoreAfter,
            metrics: result.metrics,
            mode: result.mode,
            language: result.language,
          }),
          passesCount: result.passesApplied,
          wordCount: result.wordCount,
          status: "done",
        },
      });
      results.push({
        fileName: file.name,
        id: analysis.id,
        aiScoreBefore: result.scoreBefore.overall,
        aiScoreAfter: result.scoreAfter.overall,
      });
    } catch (err) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: TOKEN_COST[mode] } },
      });
      await prisma.humanizerAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Erreur inconnue",
        },
      });
      results.push({
        fileName: file.name,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  }

  return NextResponse.json({ results });
}
