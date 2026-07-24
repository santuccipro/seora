import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST — publish/update a user's public CV
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null) as {
    cvPayload?: { firstName?: string; lastName?: string; sector?: string; [key: string]: unknown };
  } | null;

  if (!body?.cvPayload?.firstName || !body?.cvPayload?.lastName) {
    return NextResponse.json({ error: "Prénom et nom requis" }, { status: 400 });
  }

  const { firstName, lastName, sector = "generique" } = body.cvPayload;
  const shortId = nanoid(6);
  const slug = `${firstName}-${lastName}-${shortId}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const payload = JSON.stringify(body.cvPayload);

  // One public CV per user — upsert
  const existing = await prisma.publicCv.findFirst({ where: { userId: user.id, isActive: true } });

  let publicCv;
  if (existing) {
    publicCv = await prisma.publicCv.update({
      where: { id: existing.id },
      data: { slug, payload, sector: String(sector), firstName: String(firstName), lastName: String(lastName), updatedAt: new Date() },
    });
  } else {
    publicCv = await prisma.publicCv.create({
      data: { userId: user.id, slug, payload, sector: String(sector), firstName: String(firstName), lastName: String(lastName) },
    });
  }

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://tryseora.com";
  return NextResponse.json({ slug: publicCv.slug, url: `${baseUrl}/cv/${publicCv.slug}` });
}

// GET — fetch a public CV by slug (public, no auth)
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug requis" }, { status: 400 });

  const record = await prisma.publicCv.findUnique({ where: { slug } });
  if (!record || !record.isActive) {
    return NextResponse.json({ error: "CV non trouvé" }, { status: 404 });
  }

  // Increment view count (fire-and-forget)
  prisma.publicCv.update({ where: { id: record.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  return NextResponse.json({
    payload: JSON.parse(record.payload),
    firstName: record.firstName,
    lastName: record.lastName,
    sector: record.sector,
    viewCount: record.viewCount,
  });
}
