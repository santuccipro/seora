import { callClaude } from "./claude-client";

/**
 * Sector-agnostic deep analysis of a cover letter.
 * 6 dimensions × 5 section verdicts × red flags × quick wins × tone match
 * × upsell hooks × verdict.
 */

export interface ClDeepDimension {
  key: "accroche" | "motivation" | "adequation" | "structure" | "style" | "conclusion";
  label: string;
  score: number;
  verdict: string;
}

export interface ClDeepSectionVerdict {
  section: string; // "Accroche", "Corps 1", "Corps 2", "Motivation", "Conclusion"
  status: "excellent" | "correct" | "insuffisant" | "manquant";
  score: number;
  comment: string;
  quickFixes: string[];
}

export interface ClDeepRedFlag {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
}

export interface ClDeepQuickWin {
  title: string;
  before?: string;
  after?: string;
  gainPoints: number;
}

export interface ClDeepToneMatch {
  detectedTone: string;
  expectedTone: string;
  matchPct: number;
  advice: string;
}

export interface ClDeepUpsellHook {
  key: "rewrite_letter" | "generate_from_cv" | "cover_letter_pack" | "coaching_call";
  title: string;
  pitch: string;
  cost: number;
}

export interface ClDeepReport {
  targetRole?: string;
  companyName?: string;
  globalScore: number;
  scoreLabel: string;
  headline: string;
  verdict: string;
  dimensions: ClDeepDimension[];
  sections: ClDeepSectionVerdict[];
  redFlags: ClDeepRedFlag[];
  quickWins: ClDeepQuickWin[];
  toneMatch: ClDeepToneMatch;
  upsell: ClDeepUpsellHook[];
  timeToImproveMinutes: number;
}

const SYSTEM =
  "Tu es un DRH français avec 20 ans d'expérience qui recrute pour tous secteurs. Tu analyses les lettres de motivation avec honnêteté brute. Tu réponds UNIQUEMENT par un objet JSON valide sans backticks ni commentaire.";

export async function analyzeCoverLetterDeep(
  letterText: string,
  targetRole?: string,
  companyName?: string,
  sectorLabel?: string
): Promise<ClDeepReport> {
  const prompt = `Poste visé : ${targetRole || "(non précisé — infère du texte)"}
Entreprise : ${companyName || "(non précisée)"}
Secteur : ${sectorLabel || "généraliste"}

Lettre de motivation :
"""
${letterText.slice(0, 10_000)}
"""

Réponds STRICTEMENT ce JSON :

{
  "targetRole": "<poste visé>",
  "companyName": "<entreprise>",
  "globalScore": <int 0-100>,
  "scoreLabel": "<Excellent si >=85, Solide si 70-84, À retravailler si 50-69, Faible si <50>",
  "headline": "<1 phrase punchy 12-18 mots>",
  "verdict": "<3-5 phrases cash de recruteur : ce qu'il lit en 15s + verdict + où placer les efforts>",
  "dimensions": [
    {"key":"accroche","label":"Accroche","score":<0-100>,"verdict":"..."},
    {"key":"motivation","label":"Motivation authentique","score":<0-100>,"verdict":"..."},
    {"key":"adequation","label":"Adéquation poste/candidat","score":<0-100>,"verdict":"..."},
    {"key":"structure","label":"Structure & progression","score":<0-100>,"verdict":"..."},
    {"key":"style","label":"Style & orthographe","score":<0-100>,"verdict":"..."},
    {"key":"conclusion","label":"Conclusion & call-to-action","score":<0-100>,"verdict":"..."}
  ],
  "sections": [
    {"section":"Accroche","status":"<excellent|correct|insuffisant|manquant>","score":<0-100>,"comment":"...","quickFixes":["...","..."]},
    {"section":"Corps 1 (parcours)","status":"...","score":<0-100>,"comment":"...","quickFixes":[...]},
    {"section":"Corps 2 (motivation)","status":"...","score":<0-100>,"comment":"...","quickFixes":[...]},
    {"section":"Adéquation à l'entreprise","status":"...","score":<0-100>,"comment":"...","quickFixes":[...]},
    {"section":"Conclusion","status":"...","score":<0-100>,"comment":"...","quickFixes":[...]}
  ],
  "redFlags": [
    {"severity":"<critical|warning|info>","title":"...","detail":"..."}
  ],
  "quickWins": [
    {"title":"...","before":"<passage actuel de la lettre>","after":"<réécriture>","gainPoints":<int 1-8>}
  ],
  "toneMatch": {
    "detectedTone": "<1-3 mots>",
    "expectedTone": "<1-3 mots pour ce secteur/poste>",
    "matchPct": <int 0-100>,
    "advice": "<1-2 phrases>"
  },
  "upsell": [
    {"key":"rewrite_letter","title":"Réécrire toute la lettre avec Claude","pitch":"...","cost":3},
    {"key":"generate_from_cv","title":"Regénérer depuis mon CV Seora","pitch":"...","cost":3},
    {"key":"coaching_call","title":"Coaching lettre avec un expert","pitch":"...","cost":10}
  ],
  "timeToImproveMinutes": <int 15-120>
}

Règles :
- Sois honnête et précis. Si la lettre est plate, dis-le.
- 5-10 red flags max, priorité aux critiques (banalités, formules bateau, ton mal calibré, cliché IA).
- 3-5 quickWins avec avant/après issus du texte réel.
- Zéro emoji, français impeccable, style recruteur direct.`;

  const raw = await callClaude(prompt, {
    system: SYSTEM,
    model: "claude-sonnet-4-6",
    timeoutMs: 60_000,
  });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Réponse Claude non JSON");
  const parsed = JSON.parse(match[0]) as ClDeepReport;

  parsed.globalScore = Math.max(0, Math.min(100, Math.round(parsed.globalScore ?? 0)));
  parsed.dimensions = (parsed.dimensions ?? []).map((d) => ({
    ...d,
    score: Math.max(0, Math.min(100, Math.round(d.score ?? 0))),
  }));
  parsed.sections = (parsed.sections ?? []).map((s) => ({
    ...s,
    score: Math.max(0, Math.min(100, Math.round(s.score ?? 0))),
    quickFixes: s.quickFixes ?? [],
  }));
  if (parsed.toneMatch) {
    parsed.toneMatch.matchPct = Math.max(0, Math.min(100, Math.round(parsed.toneMatch.matchPct ?? 0)));
  }
  return parsed;
}
