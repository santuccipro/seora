import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/humanize/[id]/cleanup
 *
 * Marks an analysis stuck in a non-terminal state (`extracting`,
 * `detecting-before`, `rewriting-llm`, `retrying`, `restoring`, `pending`)
 * as `failed` and refunds the tokens it consumed. Idempotent — safe to
 * call multiple times.
 *
 * Called by the client when the SSE stream dies before completion (Vercel
 * function timeout, Cloudflare tunnel drop, etc.).
 */
const TERMINAL_STATUSES = new Set(["done", "failed"]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const { id } = await ctx.params;
  const analysis = await prisma.humanizerAnalysis.findFirst({ where: { id, userId: user.id } });
  if (!analysis) return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });
  if (TERMINAL_STATUSES.has(analysis.status)) {
    return NextResponse.json({ ok: true, alreadyDone: true, status: analysis.status });
  }

  // Refund the tokens that were deducted at start
  const refund = analysis.tokensUsed ?? 0;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { tokens: { increment: refund } },
    }),
    prisma.humanizerAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: "failed",
        errorMessage: analysis.errorMessage || "Interrompu (timeout serverless) — tokens remboursés.",
      },
    }),
  ]);

  return NextResponse.json({ ok: true, refunded: refund });
}
