import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectPlagiarism } from "@/lib/analyze-cv";

export async function POST(req: NextRequest) {
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

    if (user.tokens < 1) {
      return NextResponse.json(
        { error: "Pas assez de tokens. La détection de plagiat coûte 1 token." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { text } = body;

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        { error: "Le texte doit contenir au moins 100 caractères." },
        { status: 400 }
      );
    }

    if (text.length > 20000) {
      return NextResponse.json(
        { error: "Le texte ne doit pas dépasser 20 000 caractères." },
        { status: 400 }
      );
    }

    const result = await detectPlagiarism(text);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: { decrement: 1 } },
    });

    return NextResponse.json({
      ...result,
      tokensUsed: 1,
    });
  } catch (error) {
    console.error("Erreur détection plagiat:", error);
    return NextResponse.json(
      { error: "Erreur lors de la détection de plagiat." },
      { status: 500 }
    );
  }
}
