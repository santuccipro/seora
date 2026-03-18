import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProEmail } from "@/lib/analyze-cv";
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
        { error: "Pas assez de tokens. La génération d'email coûte 1 token." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { context, type, recipientName, companyName, position, tone } = body;

    if (!context || context.trim().length < 20) {
      return NextResponse.json(
        { error: "Décrivez le contexte (minimum 20 caractères)." },
        { status: 400 }
      );
    }

    const validTypes = ["candidature", "relance", "stage", "remerciement", "demande_info"];
    const safeType = validTypes.includes(type) ? type : "candidature";

    const result = await generateProEmail(context, safeType, {
      recipientName,
      companyName,
      position,
      tone,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: { decrement: 1 } },
    });

    return NextResponse.json({
      ...result,
      tokensUsed: 1,
    });
  } catch (error) {
    console.error("Erreur génération email:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération de l'email." },
      { status: 500 }
    );
  }
}
