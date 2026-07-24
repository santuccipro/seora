import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const analyses = await prisma.linkedInAnalysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      targetSector: true,
      targetRole: true,
      targetLevel: true,
      globalScore: true,
      verdict: true,
      rewrittenTitle: true,
      createdAt: true,
    },
  });

  return NextResponse.json(analyses);
}
