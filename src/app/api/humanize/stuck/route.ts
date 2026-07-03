import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;

const NON_TERMINAL = ["extracting", "detecting-before", "cleaning-deterministic", "rewriting-llm", "detecting-after", "retrying", "restoring", "pending"];

/**
 * GET /api/humanize/stuck
 *
 * Lists the current user's humanizer analyses that are stuck in a
 * non-terminal state for more than 5 minutes — probably killed by a
 * serverless timeout. The client uses this to prompt a one-click
 * "Refund + retry".
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const stuck = await prisma.humanizerAnalysis.findMany({
    where: {
      userId: user.id,
      status: { in: NON_TERMINAL },
      createdAt: { lt: fiveMinAgo },
    },
    select: { id: true, fileName: true, status: true, tokensUsed: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ stuck });
}
