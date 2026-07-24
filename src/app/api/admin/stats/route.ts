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

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersThisMonth,
      usersThisWeek,
      totalAnalyses,
      analysesThisMonth,
      totalCoverLetters,
      totalJobMatches,
      totalRevenue,
      revenueThisMonth,
      avgScore,
      recentUsers,
      recentPurchases,
      tokensDistributed,
      totalHumanizer,
      totalPhotoGenerations,
      totalInterviewPrep,
      totalLinkedInAnalysis,
      dormantUsers,
      totalCvDrafts,
      totalPublicCvs,
      publicCvViews,
      cvBySector,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.cVAnalysis.count(),
      prisma.cVAnalysis.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.coverLetterAnalysis.count(),
      prisma.jobMatch.count(),
      prisma.tokenPurchase.aggregate({
        where: { status: "completed" },
        _sum: { price: true },
      }),
      prisma.tokenPurchase.aggregate({
        where: { status: "completed", createdAt: { gte: thirtyDaysAgo } },
        _sum: { price: true },
      }),
      prisma.cVAnalysis.aggregate({
        where: { score: { not: null } },
        _avg: { score: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, email: true, tokens: true, createdAt: true },
      }),
      prisma.tokenPurchase.findMany({
        where: { status: "completed" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.user.aggregate({ _sum: { tokens: true } }),
      prisma.humanizerAnalysis.count().catch(() => 0),
      prisma.photoGeneration.count().catch(() => 0),
      prisma.interviewPrepSession.count().catch(() => 0),
      prisma.linkedInAnalysis.count().catch(() => 0),
      prisma.user.count({ where: { tokens: 150, createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.cvDraft.count().catch(() => 0),
      prisma.publicCv.count({ where: { isActive: true } }).catch(() => 0),
      prisma.publicCv.aggregate({ _sum: { viewCount: true } }).catch(() => ({ _sum: { viewCount: 0 } })),
      prisma.publicCv.groupBy({ by: ["sector"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 8 }).catch(() => []),
    ]);

    const featureUsage = [
      { name: "CV Builder", count: totalCvDrafts as number },
      { name: "Analyse CV", count: totalAnalyses },
      { name: "Lettre de motivation", count: totalCoverLetters },
      { name: "Job Matching", count: totalJobMatches },
      { name: "Humaniseur", count: totalHumanizer as number },
      { name: "Photo Pro", count: totalPhotoGenerations as number },
      { name: "Prep Entretien", count: totalInterviewPrep as number },
      { name: "LinkedIn Analyzer", count: totalLinkedInAnalysis as number },
    ].sort((a, b) => b.count - a.count).slice(0, 6);

    const sectorStats = (cvBySector as Array<{ sector: string; _count: { id: number } }>).map(
      (r) => ({ sector: r.sector, count: r._count.id })
    );

    return NextResponse.json({
      users: {
        total: totalUsers,
        thisMonth: usersThisMonth,
        thisWeek: usersThisWeek,
        dormant7d: dormantUsers,
      },
      analyses: {
        total: totalAnalyses,
        thisMonth: analysesThisMonth,
        coverLetters: totalCoverLetters,
        jobMatches: totalJobMatches,
        avgScore: Math.round(avgScore._avg.score ?? 0),
      },
      revenue: {
        total: (totalRevenue._sum.price ?? 0) / 100,
        thisMonth: (revenueThisMonth._sum.price ?? 0) / 100,
      },
      tokensDistributed: tokensDistributed._sum.tokens ?? 0,
      featureUsage,
      recentUsers,
      recentPurchases,
      cvBuilder: {
        drafts: totalCvDrafts as number,
        published: totalPublicCvs as number,
        totalViews: (publicCvViews as { _sum: { viewCount: number | null } })._sum.viewCount ?? 0,
        sectorStats,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
