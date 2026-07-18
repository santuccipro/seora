import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { humanizeDocxNative } from "@/lib/humanize-docx-native";

/**
 * POST /api/humanize/docx-native
 *
 * Endpoint pour la refonte "native DOCX" du humanizer :
 *  - Preserve 100% du formatage (police, gras, taille) car la mutation
 *    passe par le XML natif (parser étape A) et non par une extraction
 *    texte → LLM → réinjection.
 *  - Ne humanise QUE les paragraphes flagged HIGH par le détecteur Seora
 *    (score par-paragraphe ≥ 60), avec retries + variants de prompt sur
 *    ceux qui restent au-dessus du target (étape B).
 *  - Vise un score global final ≤ finalTargetGlobal (default 15) avec
 *    un retry global qui abaisse le seuil HIGH de 10 (étape C).
 *
 * FormData :
 *   file : .docx (max 10 Mo, MIME requis)
 *
 * Réponse : le .docx modifié (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
 * Headers :
 *   X-Humanize-Report : rapport JSON encodé en base64 (globalScoreBefore/After,
 *                       paragraphs stats, passesUsed).
 *   Content-Disposition : attachment; filename="humanized_<origname>.docx"
 *
 * ⚠ Ne casse PAS `/api/humanize` (mode legacy) ni `/api/humanize/analyze-v2`
 *   (scoring seul). C'est un nouveau chemin.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

const HUMANIZE_TOKEN_COST = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth (NextAuth session — même pattern que /api/humanize)
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
        { status: 404 },
      );
    }

    // 2. Rate limit — 10 req / user / heure (MVP)
    const rl = rateLimit(`docx-native:${user.id}`, 10, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Trop de requêtes (max 10/heure). Réessayez plus tard." },
        { status: 429 },
      );
    }

    // 3. Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni (champ `file` requis)" },
        { status: 400 },
      );
    }

    // 4. Validation MIME + extension + taille
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Fichier trop lourd (max 10 Mo)" },
        { status: 400 },
      );
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext !== "docx") {
      return NextResponse.json(
        { error: "Format non supporté — .docx uniquement" },
        { status: 400 },
      );
    }
    // Le navigateur envoie parfois un MIME vide ; on tolère si l'extension
    // est bonne, mais on refuse tout MIME explicitement non-docx.
    if (file.type && file.type !== DOCX_MIME) {
      return NextResponse.json(
        { error: `Type MIME invalide (attendu ${DOCX_MIME}, reçu ${file.type})` },
        { status: 400 },
      );
    }

    // 5. Token deduction (atomic)
    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: HUMANIZE_TOKEN_COST } },
      data: { tokens: { decrement: HUMANIZE_TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json(
        {
          error: `Pas assez de tokens (requis : ${HUMANIZE_TOKEN_COST}).`,
        },
        { status: 403 },
      );
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    let result;
    try {
      result = await humanizeDocxNative(inputBuffer);
    } catch (err) {
      // Refund tokens on failure
      await prisma.user
        .update({
          where: { id: user.id },
          data: { tokens: { increment: HUMANIZE_TOKEN_COST } },
        })
        .catch(() => {});
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("[api/humanize/docx-native] humanize failed:", msg);
      return NextResponse.json(
        {
          error: `Humanisation échouée : ${msg}. Vos tokens ont été remboursés.`,
        },
        { status: 500 },
      );
    }

    // 6. Log analysis for observability (best-effort)
    prisma.humanizerAnalysis
      .create({
        data: {
          userId: user.id,
          fileName: file.name,
          fileType: "docx",
          originalText: "",
          aiScoreBefore: result.report.globalScoreBefore,
          aiScoreAfter: result.report.globalScoreAfter,
          scoreDetails: JSON.stringify({
            engineVersion: "docx-native-v1",
            paragraphsProcessed: result.report.paragraphsProcessed,
            paragraphsRewritten: result.report.paragraphsRewritten,
            paragraphsFailed: result.report.paragraphsFailed,
            passesUsed: result.report.passesUsed,
          }),
          passesCount: result.report.passesUsed,
          status: "done",
          tokensUsed: HUMANIZE_TOKEN_COST,
        },
      })
      .catch((err) => {
        console.error("[api/humanize/docx-native] log analysis failed:", err);
      });

    // 7. Renvoie le .docx + rapport en header
    const reportPayload = {
      globalScoreBefore: result.report.globalScoreBefore,
      globalScoreAfter: result.report.globalScoreAfter,
      paragraphsProcessed: result.report.paragraphsProcessed,
      paragraphsRewritten: result.report.paragraphsRewritten,
      paragraphsFailed: result.report.paragraphsFailed,
      passesUsed: result.report.passesUsed,
    };
    const reportB64 = Buffer.from(
      JSON.stringify(reportPayload),
      "utf-8",
    ).toString("base64");

    const outFilename = safeFilename(
      `humanized_${file.name.replace(/\.docx$/i, "")}.docx`,
    );

    // Buffer → Uint8Array — Response BodyInit accepte les typed arrays.
    // On slice() explicitement pour obtenir un ArrayBuffer (jamais Shared).
    const ab = new ArrayBuffer(result.outputBuffer.byteLength);
    new Uint8Array(ab).set(result.outputBuffer);

    return new Response(ab, {
      status: 200,
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": `attachment; filename="${outFilename}"`,
        "Content-Length": String(result.outputBuffer.byteLength),
        "X-Humanize-Report": reportB64,
        // Utile pour debug côté client sans avoir à décoder le b64
        "X-Global-Score-Before": String(result.report.globalScoreBefore),
        "X-Global-Score-After": String(result.report.globalScoreAfter),
      },
    });
  } catch (err) {
    console.error("[api/humanize/docx-native] Fatal:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** Anti-injection Content-Disposition. */
function safeFilename(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 120);
}
