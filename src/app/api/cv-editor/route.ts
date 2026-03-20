import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { structureCV } from "@/lib/analyze-cv";
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
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const { success } = rateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    const { analysisId } = await req.json();

    const analysis = await prisma.cVAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis || analysis.userId !== user.id) {
      return NextResponse.json(
        { error: "Analyse introuvable" },
        { status: 404 }
      );
    }

    // Return cached result if already generated
    if (analysis.structuredCV) {
      return NextResponse.json({
        structuredCV: JSON.parse(analysis.structuredCV),
      });
    }

    // Atomic token deduction (2 tokens)
    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: 2 } },
      data: { tokens: { decrement: 2 } },
    });

    if (deductResult.count === 0) {
      return NextResponse.json(
        { error: "Pas assez de tokens (2 requis)" },
        { status: 403 }
      );
    }

    try {
      const result = await structureCV(analysis.fileContent);

      await prisma.cVAnalysis.update({
        where: { id: analysisId },
        data: {
          structuredCV: JSON.stringify(result),
          tokensUsed: { increment: 2 },
        },
      });

      return NextResponse.json({ structuredCV: result });
    } catch (error) {
      // Refund tokens on failure
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: 2 } },
      });
      console.error("Structure CV error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la structuration du CV" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Structure CV error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
