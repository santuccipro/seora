import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reformulateText } from "@/lib/analyze-cv";
import { rateLimit } from "@/lib/rate-limit";

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

    const { success } = rateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    if (user.tokens < 1) {
      return NextResponse.json(
        { error: "Pas assez de tokens. La reformulation coûte 1 token." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { text, style } = body;

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Le texte doit contenir au moins 50 caractères." },
        { status: 400 }
      );
    }

    if (text.length > 15000) {
      return NextResponse.json(
        { error: "Le texte ne doit pas dépasser 15 000 caractères." },
        { status: 400 }
      );
    }

    const validStyles = ["academique", "simplifie", "professionnel", "soutenu"];
    const safeStyle = validStyles.includes(style) ? style : "academique";

    const result = await reformulateText(text, safeStyle);

    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: { decrement: 1 } },
    });

    return NextResponse.json({
      ...result,
      tokensUsed: 1,
    });
  } catch (error) {
    console.error("Erreur reformulation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la reformulation." },
      { status: 500 }
    );
  }
}
