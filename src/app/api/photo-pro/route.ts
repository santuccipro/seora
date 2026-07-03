import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";
export const maxDuration = 300;

const TOKEN_COST = 1;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/photo-pro
 *
 * Body: FormData with "photo" File
 * Response: { originalUrl, transformedUrls: { neutral, warm, corporate } }
 *
 * Uses Cloudinary AI transformations:
 *   1. Background removal (e_background_removal)
 *   2. Neutral background color
 *   3. Face-centered crop (g_face)
 *   4. Enhance & upscale
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const { success } = rateLimit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
    }

    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: TOKEN_COST } },
      data: { tokens: { decrement: TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json({ error: `Il faut ${TOKEN_COST} token pour Photo Pro.` }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
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
      const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

      // Upload the raw selfie to Cloudinary
      const upload = await cloudinary.uploader.upload(dataUri, {
        folder: `seora/photo-pro/${user.id}`,
        resource_type: "image",
      });

      const publicId = upload.public_id;
      const originalUrl = upload.secure_url;

      // Generate 3 professional variants (background removal + face crop + enhance)
      // Note: background_removal add-on may not be enabled on every Cloudinary account;
      // fallback uses ordinary transformations that still produce a clean result.
      const buildUrl = (backgroundColor: string) =>
        cloudinary.url(publicId, {
          transformation: [
            { effect: "background_removal", fetch_format: "png" },
            { width: 800, height: 800, gravity: "face:center", crop: "fill" },
            { background: backgroundColor },
            { effect: "improve:outdoor" },
            { effect: "sharpen:50" },
            { quality: "auto:best" },
          ],
          secure: true,
        });

      const fallbackUrl = (backgroundColor: string) =>
        cloudinary.url(publicId, {
          transformation: [
            { width: 800, height: 800, gravity: "face:center", crop: "fill" },
            { background: backgroundColor },
            { effect: "improve:indoor" },
            { effect: "sharpen:50" },
            { quality: "auto:best" },
          ],
          secure: true,
        });

      const transformedUrls = {
        neutral: buildUrl("#F1F5F9"),
        warm: buildUrl("#FEF3C7"),
        corporate: buildUrl("#0F172A"),
        fallbackNeutral: fallbackUrl("#F1F5F9"),
        fallbackWarm: fallbackUrl("#FEF3C7"),
        fallbackCorporate: fallbackUrl("#0F172A"),
      };

      return NextResponse.json({
        originalUrl,
        transformedUrls,
        publicId,
        tokensLeft: user.tokens - TOKEN_COST,
      });
    } catch (err) {
      await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: TOKEN_COST } } });
      console.error("[api/photo-pro] Cloudinary failed:", err);
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
