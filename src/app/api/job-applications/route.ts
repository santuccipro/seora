import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

    const applications = await prisma.jobApplication.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("[JOB-APPLICATIONS] GET error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

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

    if (!companyName || !position) {
      return NextResponse.json(
        { error: "companyName et position sont requis" },
        { status: 400 }
      );
    }

    const application = await prisma.jobApplication.create({
      data: {
        userId: user.id,
        companyName,
        position,
        sector: sector ?? null,
        status: status ?? "planned",
        appliedAt: appliedAt ? new Date(appliedAt) : null,
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        notes: notes ?? null,
        jobUrl: jobUrl ?? null,
        salary: salary ?? null,
        location: location ?? null,
        contactName: contactName ?? null,
        contactEmail: contactEmail ?? null,
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error("[JOB-APPLICATIONS] POST error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
