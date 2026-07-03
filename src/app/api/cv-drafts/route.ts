import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET  /api/cv-drafts  → { draft: CvDraft | null }  (last saved server-side)
 * PUT  /api/cv-drafts  → upsert body { draft: CvDraft }
 * DELETE                → clear
 */

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  const d = await prisma.cvDraft.findUnique({ where: { userId: user.id } });
  if (!d) return NextResponse.json({ draft: null });
  try {
    return NextResponse.json({ draft: JSON.parse(d.payload), updatedAt: d.updatedAt });
  } catch {
    return NextResponse.json({ draft: null });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { draft?: unknown } | null;
  if (!body?.draft) return NextResponse.json({ error: "draft manquant" }, { status: 400 });
  const payload = JSON.stringify(body.draft);
  if (payload.length > 500_000) return NextResponse.json({ error: "draft trop volumineux" }, { status: 413 });
  await prisma.cvDraft.upsert({
    where: { userId: user.id },
    create: { userId: user.id, payload },
    update: { payload },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  await prisma.cvDraft.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
