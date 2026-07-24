import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Seora <noreply@tryseora.com>";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const from72h = new Date(now.getTime() - 96 * 60 * 60 * 1000);
  const to72h = new Date(now.getTime() - 72 * 60 * 60 * 1000);

  // Users created 3 days ago who still have 150 tokens (never used the platform)
  const dormantUsers = await prisma.user.findMany({
    where: {
      createdAt: { gte: from72h, lte: to72h },
      tokens: 150,
      email: { not: undefined },
    },
    select: { id: true, email: true, name: true },
  });

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    dormantUsers.map(async (user) => {
      try {
        await resend.emails.send({
          from: FROM,
          to: user.email,
          subject: "Ton CV mérite mieux 🎯",
          html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 32px 28px;">
      <p style="margin:0;font-size:28px;font-weight:800;color:white;">Seora ✨</p>
      <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">L'IA pour décrocher ton stage ou alternance</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
        ${user.name ? `Hey ${user.name.split(" ")[0]}` : "Hey"}, t'as 150 tokens qui t'attendent 👋
      </p>
      <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
        Tu t'es inscrit(e) sur Seora mais tu n'as pas encore essayé. Pourtant, tes 150 tokens gratuits peuvent t'aider à :
      </p>
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 24px;">
        <p style="margin:0 0 10px;font-size:14px;color:#374151;">✅ <strong>Analyser ton CV</strong> — score sur 6 critères en 30 secondes</p>
        <p style="margin:0 0 10px;font-size:14px;color:#374151;">✅ <strong>Générer une lettre de motivation</strong> adaptée à l'offre</p>
        <p style="margin:0 0 10px;font-size:14px;color:#374151;">✅ <strong>Humaniser un texte IA</strong> — indétectable Turnitin/Compilatio</p>
        <p style="margin:0;font-size:14px;color:#374151;">✅ <strong>Photo pro IA</strong> — 4 photos LinkedIn en moins de 2 min</p>
      </div>
      <a href="https://tryseora.com/app" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">
        Utiliser mes 150 tokens →
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
        Tu reçois cet email car tu t'es inscrit(e) sur <a href="https://tryseora.com" style="color:#6366f1;">tryseora.com</a>.
        <a href="https://tryseora.com/api/auth/signout" style="color:#9ca3af;">Se désinscrire</a>
      </p>
    </div>
  </div>
</body>
</html>`,
        });
        sent++;
      } catch {
        failed++;
      }
    })
  );

  return NextResponse.json({ ok: true, dormant: dormantUsers.length, sent, failed });
}
