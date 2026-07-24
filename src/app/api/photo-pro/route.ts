import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const TOKEN_COST = 2;
const NUM_VARIANTS = 4;
const ALEXYA_BASE = "https://alexya.ai";

const FOND_PROMPTS: Record<string, string> = {
  neutre:   "soft neutral grey studio background, professional seamless grey backdrop",
  blanc:    "pure white studio background, clean white infinity backdrop, bright studio",
  sombre:   "dark charcoal background, dramatic dark studio, moody premium backdrop",
  nature:   "blurred outdoor nature background, soft green bokeh trees and leaves",
  bureau:   "blurred modern office background, open space, contemporary corporate environment",
  colore:   "vibrant colorful gradient background, bold creative colors, artistic backdrop",
};

const TONALITE_PROMPTS: Record<string, string> = {
  classique:   "business suit, clean corporate look, polished professional appearance",
  chaleureux:  "casual professional attire, warm welcoming personality, approachable vibe",
  decontracte: "casual chic business attire, relaxed natural expression, modern startup vibe",
  dynamique:   "bold powerful presence, energetic confident body language, impactful posture",
};

const POSE_PROMPTS: Record<string, string> = {
  face:         "direct frontal pose, face to camera, centered composition",
  trois_quarts: "three-quarter angle, body slightly turned, dynamic composition",
  bras_croises: "arms crossed, confident power stance, authoritative posture",
};

const EXPRESSION_PROMPTS: Record<string, string> = {
  souriant:  "warm genuine smile, bright happy eyes, friendly welcoming expression",
  neutre:    "neutral relaxed expression, calm natural face, composed look",
  serieux:   "serious strong expression, intense direct gaze, composed and authoritative",
  confiant:  "confident subtle smile, engaging charismatic expression, direct eye contact",
};

const TENUE_PROMPTS: Record<string, string> = {
  costume_noir:    "wearing a sharp black suit, white dress shirt, professional executive appearance",
  costume_gris:    "wearing a tailored grey suit, business formal attire",
  costume_bleu:    "wearing a navy blue suit, classic business professional",
  chemise_blanche: "wearing a crisp white dress shirt, smart casual business",
  polo:            "wearing a clean polo shirt, smart casual look",
  decontracte:     "wearing smart casual clothing, relaxed professional",
};

const VARIANT_TWEAKS = [
  "slight left angle, natural asymmetric composition",
  "direct frontal symmetrical composition",
  "slight right angle, dynamic composition",
  "minimal tilt, relaxed natural framing",
];

function buildPrompt(fond: string, tonalite: string, pose: string, expression: string, notes?: string, variantIdx = 0, tenue?: string): string {
  const parts = [
    "professional portrait headshot, photorealistic, shot on Sony A7R IV 85mm f/1.8",
    FOND_PROMPTS[fond] ?? FOND_PROMPTS.neutre,
    tenue && TENUE_PROMPTS[tenue] ? TENUE_PROMPTS[tenue] : (TONALITE_PROMPTS[tonalite] ?? TONALITE_PROMPTS.classique),
    POSE_PROMPTS[pose] ?? POSE_PROMPTS.face,
    EXPRESSION_PROMPTS[expression] ?? EXPRESSION_PROMPTS.neutre,
    VARIANT_TWEAKS[variantIdx % VARIANT_TWEAKS.length],
    "realistic natural skin texture, visible skin pores, no skin smoothing, no airbrushing, natural complexion, ultra sharp focus, professional studio lighting, high detail",
  ];
  if (notes?.trim()) parts.push(notes.trim());
  return parts.join(", ");
}

async function alexyaPost(path: string, body: object, apiKey: string) {
  return fetch(`${ALEXYA_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
}

async function presignUpload(apiKey: string, contentType: string, fileName: string) {
  const res = await alexyaPost(
    "/api/v1/uploads/presign",
    { kind: "image_input", content_type: contentType, file_name: fileName },
    apiKey
  );
  if (!res.ok) throw new Error(`Alexya presign failed: ${res.status}`);
  return res.json() as Promise<{ upload_url: string; public_url: string }>;
}

async function uploadToAlexya(apiKey: string, buffer: Buffer, contentType: string, fileName: string): Promise<string> {
  const { upload_url, public_url } = await presignUpload(apiKey, contentType, fileName);
  const put = await fetch(upload_url, {
    method: "PUT",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: buffer as any,
    headers: { "Content-Type": contentType },
  });
  if (!put.ok) throw new Error(`Alexya upload PUT failed: ${put.status}`);
  return public_url;
}

async function launchGeneration(apiKey: string, prompt: string, imageUrl: string): Promise<string> {
  const res = await alexyaPost(
    "/api/v1/image/generate",
    { prompt, mode: "high_quality", aspect_ratio: "1:1", image_urls: [imageUrl] },
    apiKey
  );
  if (res.status !== 202) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Alexya generate failed: ${res.status} — ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  if (!data.id) throw new Error("Alexya returned no generation ID");
  return data.id as string;
}

async function pollGeneration(apiKey: string, genId: string, maxWaitMs = 240_000): Promise<string | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${ALEXYA_BASE}/api/v1/generations/${genId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Alexya poll failed: ${res.status}`);
    const data = await res.json();
    if (data.status === "completed") return data.output_url ?? data.image_url ?? null;
    if (data.status === "failed") return null;
    await new Promise((r) => setTimeout(r, 8000));
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const limit = Number(new URL(req.url).searchParams.get("limit") ?? "12");
    const generations = await prisma.photoGeneration.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
      select: { id: true, imageUrls: true, fond: true, tonalite: true, pose: true, expression: true, createdAt: true },
    });

    return NextResponse.json({ generations });
  } catch (err) {
    console.error("[api/photo-pro GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const { success } = rateLimit(user.id);
    if (!success) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: TOKEN_COST } },
      data: { tokens: { decrement: TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json({ error: `Il faut ${TOKEN_COST} tokens pour Photo Pro.` }, { status: 403 });
    }

    const apiKey = process.env.ALEXYA_API_KEY;
    if (!apiKey) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: TOKEN_COST } } });
      return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    const fond = (formData.get("fond") as string | null) ?? "neutre";
    const tonalite = (formData.get("tonalite") as string | null) ?? "classique";
    const pose = (formData.get("pose") as string | null) ?? "face";
    const expression = (formData.get("expression") as string | null) ?? "neutre";
    const tenue = (formData.get("tenue") as string | null) ?? "";
    const notes = (formData.get("notes") as string | null) ?? "";

    if (!file || !file.type.startsWith("image/")) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: TOKEN_COST } } });
      return NextResponse.json({ error: "Fichier image requis" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: TOKEN_COST } } });
      return NextResponse.json({ error: "Image trop lourde (max 10 Mo)" }, { status: 400 });
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      const fileName = `photo_${user.id}_${Date.now()}.${ext}`;

      const imageUrl = await uploadToAlexya(apiKey, buffer, file.type, fileName);

      // Launch all 4 generations simultaneously with per-variant prompt tweaks
      const genIds = await Promise.all(
        Array.from({ length: NUM_VARIANTS }, (_, i) =>
          launchGeneration(apiKey, buildPrompt(fond, tonalite, pose, expression, notes, i, tenue), imageUrl)
        )
      );

      // Poll all 4 in parallel
      const results = await Promise.all(genIds.map((id) => pollGeneration(apiKey, id)));
      const urls = results.filter((u): u is string => u !== null);

      if (urls.length === 0) {
        await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: TOKEN_COST } } });
        throw new Error("Toutes les générations ont échoué");
      }

      // Save to history
      await prisma.photoGeneration.create({
        data: { userId: user.id, imageUrls: urls, fond, tonalite, pose, expression, notes, tokensUsed: TOKEN_COST },
      });

      return NextResponse.json({ urls, tokensLeft: user.tokens - TOKEN_COST });
    } catch (err) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: TOKEN_COST } } });
      console.error("[api/photo-pro] Alexya error:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Erreur transformation" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[api/photo-pro] Fatal:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
