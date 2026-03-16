import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// In-memory store for verification codes (in production, use Redis or DB)
// We use the VerificationToken model in prisma
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up old codes for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Store the code
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: code,
        expires,
      },
    });

    // In production: send email via Resend/SendGrid/etc.
    // For now, log it (and also return it in dev for testing)
    console.log(`[VERIFICATION] Code for ${email}: ${code}`);

    return NextResponse.json({
      success: true,
      message: "Code envoyé",
      // Remove this in production - only for dev/testing
      ...(process.env.NODE_ENV === "development" ? { code } : {}),
    });
  } catch (error) {
    console.error("Send code error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
