import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { callClaude, type ClaudeModel } from "@/lib/claude-client";
import { briefForClaude, CV_SECTOR_CRITERIA, CvSectorKey } from "@/lib/cv-criteria";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * SSE variant of /api/cv-report.
 *
 * Splits the deep analysis into 3 parallel Claude calls so the front-end
 * can reveal sections as soon as they arrive instead of waiting 30-45s
 * on a single blocking Sonnet response.
 *
 *   phase A (Sonnet)  → globalScore, verdict, headline, dimensions, sections
 *   phase B (Sonnet)  → redFlags, quickWins
 *   phase C (Haiku)   → atsMatch, upsell, timeToImproveMinutes
 *
 * Events emitted (SSE):
 *   { type: "start", sector, targetRole }
 *   { type: "phase", key: "A"|"B"|"C", data: {...partial CvDeepReport} }
 *   { type: "done", report: CvDeepReport }
 *   { type: "error", error: string }
 */

const encoder = new TextEncoder();

function sse(controller: ReadableStreamDefaultController<Uint8Array>, obj: unknown) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
}

function parseJson<T>(raw: string): T {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Réponse Claude non JSON");
  return JSON.parse(match[0]) as T;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return new Response("Not found", { status: 404 });

  const { success } = rateLimit(user.id);
  if (!success) return new Response("Rate limited", { status: 429 });

  const body = (await req.json().catch(() => null)) as
    | { cvAnalysisId: string; sector: CvSectorKey; targetRole?: string }
    | null;
  if (!body?.cvAnalysisId || !body?.sector) return new Response("Bad request", { status: 400 });

  const cvAnalysis = await prisma.cVAnalysis.findFirst({
    where: { id: body.cvAnalysisId, userId: user.id },
  });
  if (!cvAnalysis) return new Response("Not found", { status: 404 });

  const TOKEN_COST = 2;
  const deduct = await prisma.user.updateMany({
    where: { id: user.id, tokens: { gte: TOKEN_COST } },
    data: { tokens: { decrement: TOKEN_COST } },
  });
  if (deduct.count === 0) return new Response("Not enough tokens", { status: 403 });

  const cvText = cvAnalysis.fileContent.slice(0, 12_000);
  const sector = body.sector;
  const targetRole = body.targetRole;
  const criteria = CV_SECTOR_CRITERIA[sector] ?? CV_SECTOR_CRITERIA.generique;
  const brief = briefForClaude(sector);
  const system =
    "Tu es un DRH français avec 20 ans d'expérience, spécialisé dans le secteur cible. Tu réponds UNIQUEMENT par un objet JSON valide sans backticks, sans commentaire.";

  const promptA = `${brief}

Poste visé : ${targetRole || "(déduis-le du CV)"}
CV :
"""
${cvText}
"""

Réponds STRICTEMENT ce JSON :
{
  "globalScore": <int 0-100>,
  "scoreLabel": "<Excellent|Solide|À retravailler|Faible>",
  "verdict": "<3-5 phrases cash>",
  "headline": "<1 phrase 12-18 mots>",
  "targetRole": "<poste visé>",
  "dimensions": [
    {"key":"structure","label":"Structure & lisibilité","score":<0-100>,"verdict":"<1-2 phrases>"},
    {"key":"impact","label":"Impact & résultats chiffrés","score":<0-100>,"verdict":"..."},
    {"key":"contenu","label":"Contenu & pertinence","score":<0-100>,"verdict":"..."},
    {"key":"ats","label":"Optimisation ATS","score":<0-100>,"verdict":"..."},
    {"key":"coherence_secteur","label":"Cohérence secteur ${criteria.label}","score":<0-100>,"verdict":"..."},
    {"key":"orthographe","label":"Orthographe & syntaxe","score":<0-100>,"verdict":"..."}
  ],
  "sections": [
    {"section":"En-tête","status":"<excellent|correct|insuffisant|manquant>","score":<0-100>,"comment":"...","quickFixes":["...","..."]},
    {"section":"Résumé pro","status":"...","score":<0-100>,"comment":"...","quickFixes":[...]},
    {"section":"Expériences","status":"...","score":<0-100>,"comment":"...","quickFixes":[...]},
    {"section":"Formations","status":"...","score":<0-100>,"comment":"...","quickFixes":[...]},
    {"section":"Compétences","status":"...","score":<0-100>,"comment":"...","quickFixes":[...]},
    {"section":"Langues","status":"...","score":<0-100>,"comment":"...","quickFixes":[...]},
    {"section":"Extras / centres d'intérêt","status":"...","score":<0-100>,"comment":"...","quickFixes":[...]}
  ]
}
`;

  const promptB = `${brief}

Poste visé : ${targetRole || "(déduis-le du CV)"}
CV :
"""
${cvText}
"""

Réponds STRICTEMENT ce JSON :
{
  "redFlags": [
    {"severity":"<critical|warning|info>","title":"...","detail":"...","location":"<section>"}
  ],
  "quickWins": [
    {"title":"...","before":"<passage du CV actuel>","after":"<réécriture>","gainPoints":<int 1-8>}
  ]
}

Règles : 5-12 red flags, 3-6 quick wins avec avant/après issus du CV réel. Français, sans emoji.`;

  const promptC = `${brief}

Poste visé : ${targetRole || "(déduis-le du CV)"}
CV :
"""
${cvText}
"""

Réponds STRICTEMENT ce JSON :
{
  "atsMatch": {
    "matchedKeywords": ["..."],
    "missingKeywords": ["..."],
    "coveragePct": <int 0-100>,
    "advice": "<1-2 phrases actionnables>"
  },
  "upsell": [
    {"key":"rewrite_all","title":"Réécrire tout le CV avec Claude","pitch":"...","cost":5},
    {"key":"regenerate_pdf_sector","title":"Régénérer un PDF ${criteria.label}","pitch":"...","cost":2},
    {"key":"coaching_call","title":"Coaching CV avec un expert","pitch":"...","cost":10}
  ],
  "timeToImproveMinutes": <int 15-180>
}
Règles : coveragePct = matched ÷ (matched + missing) × 100.`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      sse(controller, { type: "start", sector, targetRole });

      let anyFailure = false;
      const combined: Record<string, unknown> = { sector, targetRole };

      const runPhase = async (
        key: "A" | "B" | "C",
        prompt: string,
        model: ClaudeModel,
        timeoutMs: number
      ) => {
        try {
          const raw = await callClaude(prompt, { system, model, timeoutMs });
          const data = parseJson<Record<string, unknown>>(raw);
          Object.assign(combined, data);
          sse(controller, { type: "phase", key, data });
        } catch (err) {
          anyFailure = true;
          sse(controller, {
            type: "phase-error",
            key,
            error: err instanceof Error ? err.message : "erreur",
          });
        }
      };

      try {
        await Promise.all([
          runPhase("A", promptA, "claude-sonnet-4-6", 60_000),
          runPhase("B", promptB, "claude-sonnet-4-6", 60_000),
          runPhase("C", promptC, "claude-haiku-4-5", 40_000),
        ]);

        if (anyFailure && !combined.globalScore) {
          throw new Error("Analyse incomplète");
        }

        // Persist inline for later reloads
        await prisma.cVAnalysis.update({
          where: { id: cvAnalysis.id },
          data: {
            corrections: JSON.stringify({ __deepReport: combined }),
            tokensUsed: (cvAnalysis.tokensUsed ?? 0) + TOKEN_COST,
          },
        });

        sse(controller, { type: "done", report: combined });
      } catch (err) {
        await prisma.user.update({
          where: { id: user.id },
          data: { tokens: { increment: TOKEN_COST } },
        });
        sse(controller, {
          type: "error",
          error: err instanceof Error ? err.message : "Erreur analyse",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
