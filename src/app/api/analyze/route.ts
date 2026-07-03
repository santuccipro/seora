import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeCV } from "@/lib/analyze-cv";
import { rateLimit } from "@/lib/rate-limit";

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
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const { success } = rateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    // Atomic token deduction
    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: 1 } },
      data: { tokens: { decrement: 1 } },
    });

    if (deductResult.count === 0) {
      return NextResponse.json(
        { error: "Pas assez de tokens. Achetez des tokens pour continuer." },
        { status: 403 }
      );
    }

    try {
      const formData = await req.formData();
      const file = formData.get("cv") as File;

      if (!file) {
        // Refund token
        await prisma.user.update({
          where: { id: user.id },
          data: { tokens: { increment: 1 } },
        });
        return NextResponse.json(
          { error: "Aucun fichier fourni" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      let cvText: string;

      const isImage = file.type.startsWith("image/");

      if (isImage) {
        // OCR image → Cloudinary (upload with ocr:adv_ocr, read text_annotations)
        const { v2: cloudinary } = await import("cloudinary");
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
        const upload = await cloudinary.uploader.upload(dataUri, {
          folder: `seora/cv-ocr/${user.id}`,
          ocr: "adv_ocr",
          resource_type: "image",
        });
        type OcrAnnotation = { description?: string };
        type OcrInfo = {
          adv_ocr?: {
            data?: Array<{ textAnnotations?: OcrAnnotation[] }>;
          };
        };
        const info = (upload as unknown as { info?: OcrInfo }).info ?? {};
        const annotations = info.adv_ocr?.data?.[0]?.textAnnotations ?? [];
        // First annotation contains the full text block; fallbacks join tokens
        cvText = annotations[0]?.description
          ?? annotations.slice(1).map((a) => a.description ?? "").join(" ")
          ?? "";
        if (!cvText || cvText.trim().length < 20) {
          // Refund token on OCR failure
          await prisma.user.update({
            where: { id: user.id },
            data: { tokens: { increment: 1 } },
          });
          return NextResponse.json(
            { error: "Impossible d'extraire le texte de cette image. Essaie un PDF ou DOCX." },
            { status: 422 }
          );
        }
      } else if (file.type === "application/pdf") {
        // `unpdf` = serverless-friendly pdfjs (no DOMMatrix, no subprocess).
        const { extractText, getDocumentProxy } = await import("unpdf");
        const doc = await getDocumentProxy(new Uint8Array(buffer));
        const { text: pdfText } = await extractText(doc, { mergePages: true });
        cvText = Array.isArray(pdfText) ? pdfText.join("\n") : (pdfText as string);
      } else {
        cvText = buffer.toString("utf-8");
      }

      if (!cvText.trim()) {
        // Refund token
        await prisma.user.update({
          where: { id: user.id },
          data: { tokens: { increment: 1 } },
        });
        return NextResponse.json(
          { error: "Le fichier semble vide ou illisible" },
          { status: 400 }
        );
      }

      const analysis = await analyzeCV(cvText);

      // Store original image as base64 data URL for later photo extraction
      const originalImage = isImage ? `data:${file.type};base64,${buffer.toString("base64")}` : null;

      const cvAnalysis = await prisma.cVAnalysis.create({
        data: {
          userId: user.id,
          fileName: file.name,
          fileContent: cvText,
          originalImage,
          score: analysis.score,
          scoreBreakdown: JSON.stringify(analysis.scoreBreakdown),
          summary: analysis.summary,
          strengths: JSON.stringify(analysis.strengths),
          weaknesses: JSON.stringify(analysis.weaknesses),
          status: "analyzed",
          tokensUsed: 1,
        },
      });

      return NextResponse.json({
        id: cvAnalysis.id,
        score: analysis.score,
        scoreBreakdown: analysis.scoreBreakdown,
        summary: analysis.summary,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
      });
    } catch (error) {
      // Refund token on failure
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: 1 } },
      });
      console.error("Analyze error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'analyse" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse" },
      { status: 500 }
    );
  }
}
