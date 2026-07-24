import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getApplicationForUser(id: string, userEmail: string) {
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) return null;

  const application = await prisma.jobApplication.findFirst({
    where: { id, userId: user.id },
  });
  return application;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getApplicationForUser(id, session.user.email);
    if (!existing) {
      return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
    }

    const body = await req.json();
    const {
      companyName,
      position,
      sector,
      status,
      appliedAt,
      interviewDate,
      notes,
      jobUrl,
      salary,
      location,
      contactName,
      contactEmail,
    } = body;

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: {
        ...(companyName !== undefined && { companyName }),
        ...(position !== undefined && { position }),
        ...(sector !== undefined && { sector }),
        ...(status !== undefined && { status }),
        ...(appliedAt !== undefined && { appliedAt: appliedAt ? new Date(appliedAt) : null }),
        ...(interviewDate !== undefined && { interviewDate: interviewDate ? new Date(interviewDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(jobUrl !== undefined && { jobUrl }),
        ...(salary !== undefined && { salary }),
        ...(location !== undefined && { location }),
        ...(contactName !== undefined && { contactName }),
        ...(contactEmail !== undefined && { contactEmail }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[JOB-APPLICATIONS] PATCH error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getApplicationForUser(id, session.user.email);
    if (!existing) {
      return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
    }

    await prisma.jobApplication.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[JOB-APPLICATIONS] DELETE error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
