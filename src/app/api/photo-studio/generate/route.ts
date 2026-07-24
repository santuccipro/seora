import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PHOTO_STYLES } from "@/lib/photo-styles";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALEXYA_BASE = "https://alexya.ai";
const ALEXYA_API_KEY = process.env.ALEXYA_API_KEY!;

interface PhotoStudioPayload {
  photo: string;   // base64 data URL: "data:image/jpeg;base64,..."
  styleKey: string;
}

export async function POST(req: NextRequest) {
  let deductedUserId: string | null = null;
  const TOKEN_COST = 2;

  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: TOKEN_COST } },
      data: { tokens: { decrement: TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json({ error: "Pas assez de tokens. Achetez des tokens pour continuer." }, { status: 403 });
    }
    deductedUserId = user.id;

    // Parse body
    let body: PhotoStudioPayload;
    try {
      body = await req.json();
    } catch {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: TOKEN_COST } } });
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }

    const { photo, styleKey } = body;
    if (!photo || !styleKey) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: TOKEN_COST } } });
      return NextResponse.json({ error: "photo et styleKey requis" }, { status: 400 });
    }

    // Find style
    const style = PHOTO_STYLES.find((s) => s.key === styleKey);
    if (!style) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: TOKEN_COST } } });
      return NextResponse.json({ error: `Style inconnu: ${styleKey}` }, { status: 400 });
    }

    // Decode base64 data URL → Buffer
    const commaIdx = photo.indexOf(",");
    if (commaIdx === -1 || !photo.startsWith("data:")) {
      return NextResponse.json({ error: "Format photo invalide (data URL attendu)" }, { status: 400 });
    }
    const prefix = photo.substring(0, commaIdx); // "data:image/jpeg;base64"
    const base64Data = photo.substring(commaIdx + 1);
    const ctMatch = prefix.match(/^data:([^;]+);base64$/);
    const contentType = ctMatch?.[1] ?? "image/jpeg";
    const photoBuffer = Buffer.from(base64Data, "base64");

    const headers: HeadersInit = {
      Authorization: `Bearer ${ALEXYA_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Step A — Presign upload
    const presignRes = await fetch(`${ALEXYA_BASE}/api/v1/uploads/presign`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        kind: "image_input",
        content_type: "image/jpeg",
        file_name: "photo.jpg",
      }),
    });
    if (!presignRes.ok) {
      const err = await presignRes.text();
      throw new Error(`Presign failed (${presignRes.status}): ${err}`);
    }
    const presignData = (await presignRes.json()) as { upload_url: string; file_url: string };
    const { upload_url, file_url } = presignData;

    // Step B — Upload photo to presigned URL (no auth header)
    const uploadRes = await fetch(upload_url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: photoBuffer,
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Upload failed (${uploadRes.status}): ${err}`);
    }

    // Step C — Generate
    const generateRes = await fetch(`${ALEXYA_BASE}/api/v1/image/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: style.prompt,
        mode: "high_quality",
        aspect_ratio: "1:1",
        image_urls: [file_url],
      }),
    });
    if (!generateRes.ok) {
      const err = await generateRes.text();
      throw new Error(`Generate failed (${generateRes.status}): ${err}`);
    }
    const generateData = (await generateRes.json()) as { id: string; status: string };
    const generationId = generateData.id;
    if (!generationId) {
      throw new Error("Alexya n'a pas retourné d'ID de génération");
    }

    // Step D — Poll until done (max 300s, every 8s)
    const MAX_POLLS = 37; // 37 × 8s = 296s
    const POLL_INTERVAL_MS = 8000;

    type GenerationOutput = { url: string } | Array<{ url: string }>;
    type PollResponse = {
      id: string;
      status: "pending" | "processing" | "completed" | "failed";
      output?: GenerationOutput;
    };

    let resultUrl: string | undefined;

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const pollRes = await fetch(`${ALEXYA_BASE}/api/v1/generations/${generationId}`, {
        method: "GET",
        headers,
      });
      if (!pollRes.ok) {
        const err = await pollRes.text();
        throw new Error(`Poll failed (${pollRes.status}): ${err}`);
      }
      const pollData = (await pollRes.json()) as PollResponse;

      if (pollData.status === "failed") {
        throw new Error("La génération Alexya a échoué");
      }

      if (pollData.status === "completed") {
        const output = pollData.output;
        if (!output) {
          throw new Error("Génération terminée mais pas d'output retourné");
        }
        // Handle both { url } and [{ url }]
        if (Array.isArray(output)) {
          resultUrl = output[0]?.url;
        } else {
          resultUrl = output.url;
        }
        break;
      }
      // Still pending/processing → continue polling
    }

    if (!resultUrl) {
      throw new Error("Délai dépassé — la génération n'a pas abouti en 5 minutes");
    }

    return NextResponse.json({ resultUrl, styleKey });
  } catch (err) {
    if (deductedUserId) {
      try {
        await prisma.user.update({ where: { id: deductedUserId }, data: { tokens: { increment: TOKEN_COST } } });
      } catch { /* ignore refund errors */ }
    }
    console.error("[api/photo-studio/generate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
