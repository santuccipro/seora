import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email et code requis" }, { status: 400 });
    }

    // Find the verification token
    const token = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: code,
        expires: { gt: new Date() },
      },
    });

    if (!token) {
      return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 401 });
    }

    // Delete used token
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create or find user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0],
          tokens: 5,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tokens: user.tokens,
      },
    });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
