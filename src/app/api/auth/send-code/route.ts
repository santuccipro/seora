import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// In-memory store for verification codes (in production, use Redis or DB)
// We use the VerificationToken model in prisma
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const { success } = rateLimit(`send-code:${email}`, 5, 600_000);
    if (!success) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans 10 minutes." },
        { status: 429 }
      );
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

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Seora CV <onboarding@resend.dev>",
        to: email,
        subject: "Votre code de connexion Seora CV",
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">Seora CV</h2>
            <p>Votre code de vérification :</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #F3F4F6; border-radius: 12px; margin: 16px 0;">${code}</div>
            <p style="color: #6B7280; font-size: 14px;">Ce code est valable 10 minutes.</p>
          </div>
        `,
      });
    } else {
      console.log(`[VERIFICATION] Code for ${email}: ${code}`);
    }

    return NextResponse.json({
      success: true,
      message: "Code envoyé",
      // Remove this in production - only for dev/testing
      ...(process.env.NODE_ENV === "development" ? { code } : {}),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : "";
    console.error("Send code error:", errMsg, errStack);
    return NextResponse.json(
      { error: "Erreur serveur", debug: process.env.NODE_ENV === "development" ? errMsg : undefined },
      { status: 500 }
    );
  }
}
