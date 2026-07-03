import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { analyzeCoverLetterDeep } from "@/lib/cover-letter-deep-analysis";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/cover-letter/report
 *
 * Body: { letterText: string, targetRole?, companyName?, sectorLabel? }
 * Cost: 2 tokens. Returns a Compilatio-style report for a cover letter.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const { success } = rateLimit(user.id);
  if (!success) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

  const body = (await req.json().catch(() => null)) as
    | { letterText: string; targetRole?: string; companyName?: string; sectorLabel?: string }
    | null;
  if (!body?.letterText || body.letterText.trim().length < 100) {
    return NextResponse.json({ error: "Lettre trop courte" }, { status: 400 });
  }

  const TOKEN_COST = 2;
  const deduct = await prisma.user.updateMany({
    where: { id: user.id, tokens: { gte: TOKEN_COST } },
    data: { tokens: { decrement: TOKEN_COST } },
  });
  if (deduct.count === 0) return NextResponse.json({ error: "Pas assez de tokens" }, { status: 403 });

  try {
    const report = await analyzeCoverLetterDeep(
      body.letterText,
      body.targetRole,
      body.companyName,
      body.sectorLabel
    );
    return NextResponse.json({ report });
  } catch (err) {
    await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: TOKEN_COST } } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur analyse" },
      { status: 500 }
    );
  }
}
