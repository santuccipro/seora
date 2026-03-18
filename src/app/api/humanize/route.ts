import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { humanizeText } from "@/lib/analyze-cv";
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
        { error: "Pas assez de tokens. L'humanisation coûte 1 token." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { text, intensity, tone } = body;

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

    const validIntensities = ["light", "balanced", "aggressive"];
    const validTones = ["standard", "professionnel", "academique", "decontracte"];

    const safeIntensity = validIntensities.includes(intensity) ? intensity : "balanced";
    const safeTone = validTones.includes(tone) ? tone : "standard";

    // Call Claude to humanize
    const result = await humanizeText(text, safeIntensity, safeTone);

    // Deduct 1 token
    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: { decrement: 1 } },
    });

    return NextResponse.json({
      humanizedText: result.humanizedText,
      changes: result.changes,
      aiScoreBefore: result.aiScoreBefore,
      aiScoreAfter: result.aiScoreAfter,
      tokensUsed: 1,
    });
  } catch (error) {
    console.error("Erreur humanisation:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'humanisation." },
      { status: 500 }
    );
  }
}
