import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { Language, detectAI } from "@/lib/humanize-engine";
import { emulateCompilatio, COMPILATIO_PATTERNS } from "@/lib/compilatio-emulator";

export const runtime = "nodejs";
export const maxDuration = 300;

const TOKEN_COST = 1;
const MAX_CHARS = 10000;

interface Detail {
  perplexity: number;
  burstiness: number;
  homoglyphs: number;
  connectors: number;
  formality: number;
  parallelism: number;
}

interface ParagraphScore {
  index: number;
  text: string;
  score: number;
  risk: "high" | "medium" | "low";
  details: Detail;
  reason: string;
}

interface ClaudeAnalysis {
  overall: {
    overall: number;
    gptZeroLike: number;
    saplingLike: number;
    originalityLike: number;
    compilatioLike: number;
    perplexity: number;
    burstiness: number;
    homoglyphs: number;
    connectors: number;
    formality: number;
    parallelism: number;
  };
  paragraphs: ParagraphScore[];
  topRiskZones: string[];
  summary: string;
}

const SYSTEM_PROMPT = `Tu es un expert en détection de textes générés par IA (GPT, Claude, Gemini). Tu analyses des textes académiques en français, anglais ou espagnol.

Ta mission : produire un rapport ULTRA COMPLET style Compilatio qui identifie **phrase par phrase** quelles portions sont probablement générées par IA, avec ta propre réflexion et ton raisonnement.

Format JSON STRICT en sortie (rien avant, rien après, pas de backticks) :
{
  "overall": {
    "overall": <0-100 probabilité globale IA>,
    "gptZeroLike": <0-100 en pondérant perplexité + burstiness>,
    "saplingLike": <0-100 en pondérant connecteurs + formalité>,
    "originalityLike": <0-100 en pondérant homoglyphes + burstiness>,
    "compilatioLike": <0-100 en pondérant homoglyphes + connecteurs + parallélisme>,
    "perplexity": <0-100, à quel point le vocab est prévisible>,
    "burstiness": <0-100, à quel point les phrases sont monotones>,
    "homoglyphs": <0-100, présence de caractères cyrilliques cachés>,
    "connectors": <0-100, densité de connecteurs académiques>,
    "formality": <0-100, sophistication du vocabulaire>,
    "parallelism": <0-100, structures parallèles typées IA>
  },
  "paragraphs": [
    {
      "index": 0,
      "text": "<PHRASE ou petit segment 1 à 3 phrases max — comme le fait Compilatio>",
      "score": <0-100>,
      "risk": "high" | "medium" | "low",
      "details": { ... les 6 dimensions ... },
      "reason": "<1 phrase pourquoi ce paragraphe est flag>"
    },
    ...
  ],
  "topRiskZones": [
    "<extrait 200 chars max du passage le plus flag>",
    ... (jusqu'à 5)
  ],
  "summary": "<1 phrase résumant l'analyse globale>"
}

Règles :
- Score 0-15% = probablement humain
- Score 15-40% = zone de doute
- Score 40+ % = probablement IA
- risk: "high" si score >= 60, "medium" si 30-60, "low" si < 30
- Analyse CHAQUE phrase (ou groupe de 1-3 phrases très courtes) séparément — segmente finement comme Compilatio
- Retourne 15-60 segments selon la longueur du texte, pas juste 5-10
- topRiskZones : trie du plus risqué au moins risqué
- Sois précis et honnête, n'invente pas`;

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

    const body = await req.json().catch(() => null);
    const text = String(body?.text ?? "").slice(0, MAX_CHARS);
    const language = (body?.language ?? "fr") as Language;

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        { error: "Texte trop court (min. 100 caractères)." },
        { status: 400 }
      );
    }
    if (!(["fr", "en", "es"] as Language[]).includes(language)) {
      return NextResponse.json({ error: "Langue non supportée" }, { status: 400 });
    }

    const deductResult = await prisma.user.updateMany({
      where: { id: user.id, tokens: { gte: TOKEN_COST } },
      data: { tokens: { decrement: TOKEN_COST } },
    });
    if (deductResult.count === 0) {
      return NextResponse.json(
        { error: `Il faut ${TOKEN_COST} token pour analyser un texte.` },
        { status: 403 }
      );
    }

    try {
      // Compilatio emulator — 5 Claude Opus 4.8 perspectives + sentence tagger
      const verdict = await emulateCompilatio(text, language);
      const heuristic = detectAI(text, language);

      const paragraphs = verdict.sentences.map((s) => ({
        index: s.index,
        text: s.text,
        score: s.score,
        risk: s.risk,
        patterns: s.patterns,
        patternLabels: s.patterns.map((k) => COMPILATIO_PATTERNS[k]?.label ?? k),
        reason: s.reason,
        details: heuristic, // heuristic reference retained for legacy consumers
      }));

      const highRisk = paragraphs.filter((p) => p.risk === "high").length;
      const mediumRisk = paragraphs.filter((p) => p.risk === "medium").length;
      const lowRisk = paragraphs.filter((p) => p.risk === "low").length;

      return NextResponse.json({
        // Aggregated ensemble score
        overall: {
          overall: verdict.overall,
          confidence: verdict.confidence,
          // Legacy heuristic fields for existing UI
          gptZeroLike: heuristic.gptZeroLike,
          saplingLike: heuristic.saplingLike,
          originalityLike: heuristic.originalityLike,
          compilatioLike: verdict.overall, // use the emulator score as "compilatio" number
          perplexity: heuristic.perplexity,
          burstiness: heuristic.burstiness,
          homoglyphs: heuristic.homoglyphs,
          connectors: heuristic.connectors,
          formality: heuristic.formality,
          parallelism: heuristic.parallelism,
        },
        perspectives: verdict.perspectives,
        patternsFound: verdict.patternsFound,
        paragraphs,
        wordCount: text.trim().split(/\s+/).length,
        charCount: text.length,
        stats: {
          totalParagraphs: paragraphs.length,
          highRisk,
          mediumRisk,
          lowRisk,
        },
        topRiskZones: verdict.topRiskZones,
        summary: verdict.summary,
        reasoning: verdict.reasoning,
      });
    } catch (err) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: TOKEN_COST } },
      });
      console.error("[api/ai-detect] Claude failed:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Erreur analyse Claude" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[api/ai-detect] Fatal:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
