import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

/**
 * GET /api/humanize/history
 *
 * Query params:
 *   cursor   : opaque createdAt ISO string (for pagination)
 *   status   : filter by status ("done" | "failed" | "pending")
 *   maxScore : filter analyses with aiScoreAfter <= maxScore
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const status = url.searchParams.get("status");
  const maxScoreRaw = url.searchParams.get("maxScore");
  const maxScore = maxScoreRaw ? Number(maxScoreRaw) : undefined;

  const whereClause: Record<string, unknown> = { userId: user.id };
  if (status) whereClause.status = status;
  if (maxScore !== undefined && !Number.isNaN(maxScore)) {
    whereClause.aiScoreAfter = { lte: maxScore };
  }
  if (cursor) {
    whereClause.createdAt = { lt: new Date(cursor) };
  }

  const items = await prisma.humanizerAnalysis.findMany({
    where: whereClause as never,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      fileName: true,
      fileType: true,
      aiScoreBefore: true,
      aiScoreAfter: true,
      passesCount: true,
      wordCount: true,
      status: true,
      shareToken: true,
      createdAt: true,
    },
  });

  const hasMore = items.length > PAGE_SIZE;
  const list = hasMore ? items.slice(0, PAGE_SIZE) : items;
  const nextCursor = hasMore ? list[list.length - 1].createdAt.toISOString() : null;

  // Aggregated stats
  const [total, doneCount, avgAgg] = await Promise.all([
    prisma.humanizerAnalysis.count({ where: { userId: user.id } }),
    prisma.humanizerAnalysis.count({ where: { userId: user.id, status: "done" } }),
    prisma.humanizerAnalysis.aggregate({
      where: { userId: user.id, status: "done" },
      _avg: { aiScoreBefore: true, aiScoreAfter: true, wordCount: true },
    }),
  ]);

  return NextResponse.json({
    items: list,
    nextCursor,
    stats: {
      total,
      done: doneCount,
      avgScoreBefore: avgAgg._avg.aiScoreBefore ? Math.round(avgAgg._avg.aiScoreBefore) : 0,
      avgScoreAfter: avgAgg._avg.aiScoreAfter ? Math.round(avgAgg._avg.aiScoreAfter) : 0,
      avgWordCount: avgAgg._avg.wordCount ? Math.round(avgAgg._avg.wordCount) : 0,
      avgGain: avgAgg._avg.aiScoreBefore && avgAgg._avg.aiScoreAfter
        ? Math.round(avgAgg._avg.aiScoreBefore - avgAgg._avg.aiScoreAfter)
        : 0,
    },
  });
}
