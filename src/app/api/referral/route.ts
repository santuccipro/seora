import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

// GET - Get user's referral code and stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Generate referral code if doesn't exist
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = randomBytes(4).toString("hex").toUpperCase();
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      });
    }

    return NextResponse.json({
      referralCode,
      totalReferrals: user.totalReferrals,
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/auth/signin?ref=${referralCode}`,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Apply referral code
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { referralCode } = await req.json();

    if (!referralCode) {
      return NextResponse.json({ error: "Code requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (user.referredBy) {
      return NextResponse.json({ error: "Vous avez déjà utilisé un code de parrainage" }, { status: 400 });
    }

    // Find referrer
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
    });

    if (!referrer || referrer.id === user.id) {
      return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    }

    // Apply referral: both get 2 free tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        referredBy: referrer.id,
        tokens: { increment: 2 },
      },
    });

    await prisma.user.update({
      where: { id: referrer.id },
      data: {
        totalReferrals: { increment: 1 },
        tokens: { increment: 2 },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Code appliqué ! Vous avez reçu 2 tokens gratuits.",
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
