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
 * 07/07 (Orsu) — refonte : AUTO-REFUND direct au lieu de renvoyer la
 * liste au client. Le patron ne veut plus voir "clique pour rembourser".
 * Toute analyse coincée >5min → tokens remboursés + status=failed dans
 * la même transaction. Le client n'a rien à faire, on retourne juste le
 * nombre remboursé pour un éventuel toast discret.
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
    select: { id: true, tokensUsed: true },
    take: 20,
  });

  if (stuck.length === 0) {
    return NextResponse.json({ ok: true, autoRefunded: 0, tokens: 0 });
  }

  const totalTokens = stuck.reduce((sum, s) => sum + (s.tokensUsed ?? 0), 0);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { tokens: { increment: totalTokens } },
    }),
    prisma.humanizerAnalysis.updateMany({
      where: { id: { in: stuck.map((s) => s.id) } },
      data: {
        status: "failed",
        errorMessage: "Interrompu — tokens remboursés automatiquement.",
      },
    }),
  ]);

  return NextResponse.json({ ok: true, autoRefunded: stuck.length, tokens: totalTokens });
}
