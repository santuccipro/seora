import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Fetch all data in parallel
    const [analyses, coverLetters, jobMatches, purchases] = await Promise.all([
      prisma.cVAnalysis.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileName: true,
          score: true,
          status: true,
          createdAt: true,
          tokensUsed: true,
        },
      }),
      prisma.coverLetterAnalysis.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileName: true,
          score: true,
          status: true,
          createdAt: true,
          tokensUsed: true,
        },
      }),
      prisma.jobMatch.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          jobTitle: true,
          matchScore: true,
          status: true,
          createdAt: true,
          tokensUsed: true,
        },
      }),
      prisma.tokenPurchase.findMany({
        where: { userId: user.id, status: "completed" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          price: true,
          createdAt: true,
        },
      }),
    ]);

    // Compute stats
    const totalAnalyses = analyses.length;
    const totalCoverLetters = coverLetters.length;
    const totalJobMatches = jobMatches.length;
    const avgScore = totalAnalyses > 0
      ? Math.round(analyses.reduce((sum, a) => sum + (a.score || 0), 0) / totalAnalyses)
      : 0;
    const bestScore = totalAnalyses > 0
      ? Math.max(...analyses.map(a => a.score || 0))
      : 0;
    const totalTokensSpent = [
      ...analyses.map(a => a.tokensUsed || 0),
      ...coverLetters.map(c => c.tokensUsed || 0),
      ...jobMatches.map(j => j.tokensUsed || 0),
    ].reduce((sum, t) => sum + t, 0);

    // Build recent activity (last 10 items, mixed)
    const recentActivity = [
      ...analyses.slice(0, 10).map(a => ({
        id: a.id,
        type: "cv" as const,
        title: a.fileName || "CV sans nom",
        score: a.score,
        date: a.createdAt,
      })),
      ...coverLetters.slice(0, 5).map(c => ({
        id: c.id,
        type: "cover-letter" as const,
        title: c.fileName || "Lettre de motivation",
        score: c.score,
        date: c.createdAt,
      })),
      ...jobMatches.slice(0, 5).map(j => ({
        id: j.id,
        type: "job-match" as const,
        title: j.jobTitle || "Job Match",
        score: j.matchScore,
        date: j.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        tokens: user.tokens,
        createdAt: user.createdAt,
        referralCode: user.referralCode,
        totalReferrals: user.totalReferrals,
      },
      stats: {
        totalAnalyses,
        totalCoverLetters,
        totalJobMatches,
        avgScore,
        bestScore,
        totalTokensSpent,
      },
      recentActivity,
      recentPurchases: purchases,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
