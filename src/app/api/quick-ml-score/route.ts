import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractTextFromFile, Language } from "@/lib/humanize-engine";

/**
 * POST /api/quick-ml-score — Score rapide via l'API ML (detector.tryseora.com)
 *
 * Gratuit (pas de déduction de token). Renvoie le score global fast_mode du
 * détecteur ML (xlm-roberta fine-tuned) pour comparaison avec l'analyse v1.
 */

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as Language) ?? "fr";

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop lourd (max 15 Mo)" }, { status: 400 });
    }

    const detectorUrl = process.env.SEORA_DETECTOR_URL;
    if (!detectorUrl) {
      return NextResponse.json({ error: "SEORA_DETECTOR_URL non configuré" }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromFile(buffer, file.name, file.type);

    if (!text || text.trim().length < 100) {
      return NextResponse.json({ error: "Texte trop court ou extraction impossible" }, { status: 400 });
    }

    const token = process.env.SEORA_DETECTOR_TOKEN || "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 80_000);

    try {
      const res = await fetch(`${detectorUrl.replace(/\/$/, "")}/detect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, language, fast_mode: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Detector HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();

      return NextResponse.json({
        scoreGlobal: data.score_global ?? null,
        wordCount: text.trim().split(/\s+/).length,
        signals: {
          semantic: data.signals?.semantic_classifier_score ?? null,
          homoglyphs: data.signals?.homoglyph_count ?? 0,
          homoglyphScore: data.signals?.homoglyph_score ?? 0,
          connectors: data.signals?.connector_overuse ?? null,
          aiFavoriteHits: data.signals?.ai_favorite_hits ?? null,
          aiFavoriteTop: data.signals?.ai_favorite_top ?? [],
          nearZeroTypos: data.signals?.near_zero_typos_score ?? null,
          tripartite: data.signals?.tripartite_score ?? null,
        },
        failedSignals: data.signals?.failed_signals ?? [],
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error("[quick-ml-score]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
