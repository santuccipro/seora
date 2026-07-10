// 10/07/26 (Orsu) — API user profile : GET + PATCH pour name/email/image.
// DELETE = suppression compte RGPD (cascade sur toutes les relations).
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      tokens: true,
      totalReferrals: true,
      referralCode: true,
      isAdmin: true,
      createdAt: true,
      _count: {
        select: {
          humanizerAnalyses: true,
          cvAnalyses: true,
          coverLetters: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, image } = body as { name?: string; image?: string };

  const data: { name?: string; image?: string } = {};
  if (typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 60) {
    data.name = name.trim();
  }
  if (typeof image === "string" && image.length < 2048) {
    data.image = image;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data,
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json(user);
}

// RGPD : suppression du compte + cascade (cf schema.prisma onDelete: Cascade)
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await prisma.user.delete({
    where: { email: session.user.email },
  });

  return NextResponse.json({ success: true });
}
