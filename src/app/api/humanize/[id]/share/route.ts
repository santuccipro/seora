import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

/**
 * POST /api/humanize/[id]/share — creates a public share token for the analysis
 * DELETE /api/humanize/[id]/share — revokes the share token
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

  const analysis = await prisma.humanizerAnalysis.findFirst({
    where: { id, userId: user.id },
  });
  if (!analysis) return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });

  const token = randomBytes(18).toString("base64url");
  await prisma.humanizerAnalysis.update({
    where: { id: analysis.id },
    data: { shareToken: token },
  });

  return NextResponse.json({ shareToken: token });
}

export async function DELETE(
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

  await prisma.humanizerAnalysis.updateMany({
    where: { id, userId: user.id },
    data: { shareToken: null },
  });

  return NextResponse.json({ ok: true });
}
