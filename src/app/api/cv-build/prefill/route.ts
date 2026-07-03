import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { structureCV } from "@/lib/analyze-cv";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cv-build/prefill?cvAnalysisId=...
 *
 * Reuses the already-uploaded CV text to auto-populate the wizard's
 * draft shape. No token cost — the user already paid on the original
 * analysis. Caches the structured payload in CVAnalysis.structuredCV so
 * a second call is instant.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const id = new URL(req.url).searchParams.get("cvAnalysisId");
  if (!id) return NextResponse.json({ error: "cvAnalysisId manquant" }, { status: 400 });

  const cv = await prisma.cVAnalysis.findFirst({ where: { id, userId: user.id } });
  if (!cv) return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });

  let structured: Record<string, unknown> | null = null;

  if (cv.structuredCV) {
    try {
      structured = JSON.parse(cv.structuredCV);
    } catch {
      structured = null;
    }
  }

  if (!structured) {
    structured = await structureCV(cv.fileContent);
    await prisma.cVAnalysis.update({
      where: { id: cv.id },
      data: { structuredCV: JSON.stringify(structured) },
    });
  }
  if (!structured) {
    return NextResponse.json({ error: "Structuration impossible" }, { status: 500 });
  }
  const src = structured;

  // Map to the wizard's shape
  const header = (src.header ?? {}) as Record<string, string>;
  const experiences = ((src.experiences ?? []) as Array<Record<string, unknown>>).map((e, i) => ({
    id: (e.id as string) ?? `exp_${i}`,
    title: (e.position as string) ?? "",
    company: (e.company as string) ?? "",
    location: (e.location as string) ?? "",
    startDate: (e.startDate as string) ?? "",
    endDate: (e.endDate as string) ?? "",
    current: /présent|en cours/i.test((e.endDate as string) ?? ""),
    bullets: Array.isArray(e.bullets) ? (e.bullets as string[]) : [],
  }));
  const educations = ((src.education ?? []) as Array<Record<string, unknown>>).map((edu, i) => ({
    id: (edu.id as string) ?? `edu_${i}`,
    degree: (edu.degree as string) ?? "",
    school: (edu.school as string) ?? "",
    location: (edu.location as string) ?? "",
    startDate: (edu.startDate as string) ?? "",
    endDate: (edu.endDate as string) ?? "",
    mention: (edu.description as string) ?? "",
  }));
  const skills: string[] = [];
  for (const s of (src.skills ?? []) as Array<{ items?: string[] }>) {
    if (Array.isArray(s.items)) skills.push(...s.items);
  }
  const languages = ((src.languages ?? []) as Array<Record<string, string>>).map((l, i) => ({
    id: `lang_${i}`,
    name: l.name ?? "",
    level: l.level ?? "B2",
  }));

  return NextResponse.json({
    draft: {
      firstName: header.firstName ?? "",
      lastName: header.lastName ?? "",
      email: header.email ?? "",
      phone: header.phone ?? "",
      city: header.location ?? "",
      linkedIn: header.linkedin ?? "",
      portfolio: header.website ?? "",
      photoUrl: cv.originalImage ?? null,
      sector: "generique",
      targetRole: header.title ?? "",
      summary: (src.summary as string) ?? "",
      experiences,
      educations,
      skills,
      languages,
      interests: (src.interests as string[]) ?? [],
    },
    detectedTheme: src.detectedTheme ?? null,
  });
}
