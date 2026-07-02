import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/extract-photo
 *
 * Body JSON: { image: dataUri }
 * Returns: { found: boolean, croppedUrl?: string }
 *
 * Uses Cloudinary face detection (g_face) instead of Gemini Vision.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "Aucune image" }, { status: 400 });
    }

    const upload = await cloudinary.uploader.upload(image, {
      folder: `seora/extract-photo/${session.user.email}`,
      detection: "adv_face",
      resource_type: "image",
    });

    type Faces = number[][];
    type Info = {
      detection?: {
        adv_face?: {
          data?: { faces?: Faces };
        };
      };
    };
    const info = (upload as unknown as { info?: Info; faces?: Faces }).info ?? {};
    const faces: Faces =
      info.detection?.adv_face?.data?.faces ??
      ((upload as unknown as { faces?: Faces }).faces) ??
      [];

    if (!Array.isArray(faces) || faces.length === 0) {
      return NextResponse.json({ found: false });
    }

    const croppedUrl = cloudinary.url(upload.public_id, {
      transformation: [
        { width: 400, height: 400, gravity: "face:center", crop: "thumb", zoom: "0.9" },
        { radius: "max" },
        { fetch_format: "auto", quality: "auto" },
      ],
      secure: true,
    });

    return NextResponse.json({ found: true, croppedUrl });
  } catch (err) {
    console.error("[api/extract-photo] Failed:", err);
    return NextResponse.json({ found: false });
  }
}
