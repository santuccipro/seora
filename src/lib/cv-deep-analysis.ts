import { callClaude } from "./claude-client";
import { briefForClaude, CvSectorKey, CV_SECTOR_CRITERIA } from "./cv-criteria";

/**
 * Deep, sector-aware CV report — the honest verdict + upsell fuel.
 *
 * A single Claude Sonnet call rated 6 dimensions (0-100), one section-by-
 * section verdict, red flags, quick wins, ATS gap, a plainspoken verdict
 * from a recruiter POV, and 3 upsell hooks the UI can turn into CTAs.
 */

export interface CvDeepDimension {
  key: "structure" | "impact" | "contenu" | "ats" | "coherence_secteur" | "orthographe";
  label: string;
  score: number; // 0-100
  verdict: string; // 1-2 sentences
}

export interface CvDeepSectionVerdict {
  section: string; // "En-tête", "Résumé", "Expériences", "Formations", "Compétences", "Langues", "Extras"
  status: "excellent" | "correct" | "insuffisant" | "manquant";
  score: number; // 0-100
  comment: string; // what the recruiter sees + what to fix
  quickFixes: string[]; // 2-4 concrete micro-actions
}

export interface CvDeepRedFlag {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  location?: string;
}

export interface CvDeepQuickWin {
  title: string;
  before?: string;
  after?: string;
  gainPoints: number; // estimated +N to the global score
}

export interface CvDeepAtsMatch {
  matchedKeywords: string[];
  missingKeywords: string[];
  coveragePct: number; // 0-100
  advice: string;
}

export interface CvDeepUpsellHook {
  key: "rewrite_all" | "regenerate_pdf_sector" | "coaching_call" | "linkedin_align" | "photo_pro" | "cover_letter";
  title: string;
  pitch: string;
  cost: number; // token cost
}

export interface CvDeepReport {
  sector: CvSectorKey;
  targetRole?: string;
  globalScore: number; // honest, sector-adjusted
  scoreLabel: string; // "Excellent", "Solide", "À retravailler", "Faible"
  verdict: string; // 3-5 lines of plain-spoken recruiter-style verdict
  headline: string; // 1 punchy sentence used as the report H1 subtitle
  dimensions: CvDeepDimension[];
  sections: CvDeepSectionVerdict[];
  redFlags: CvDeepRedFlag[];
  quickWins: CvDeepQuickWin[];
  atsMatch: CvDeepAtsMatch;
  upsell: CvDeepUpsellHook[];
  timeToImproveMinutes: number; // estimated effort to reach the next tier
}

const SYSTEM = `Tu es un directeur des ressources humaines français avec 20 ans d'expérience, spécialisé dans le secteur cible du candidat. Tu produis un rapport d'analyse de CV HONNÊTE, précis, chiffré, actionnable et adapté au secteur. Zéro complaisance. Tu réponds UNIQUEMENT par un objet JSON valide, sans backticks, sans commentaire, sans texte avant/après.`;

export async function analyzeCVDeep(
  cvText: string,
  sector: CvSectorKey,
  targetRole?: string
): Promise<CvDeepReport> {
  const brief = briefForClaude(sector);
  const sectorCriteria = CV_SECTOR_CRITERIA[sector] ?? CV_SECTOR_CRITERIA.generique;

  const prompt = `${brief}

Poste visé par le candidat : ${targetRole || "(non précisé — infère-le du CV)"}

CV du candidat (extrait brut) :
"""
${cvText.slice(0, 12_000)}
"""

Produis un rapport d'analyse détaillé au format JSON strictement suivant :

{
  "sector": "${sector}",
  "targetRole": "<poste visé, str>",
  "globalScore": <int 0-100, honnête pour le secteur — pas de complaisance>,
  "scoreLabel": "<'Excellent' si >=85, 'Solide' si 70-84, 'À retravailler' si 50-69, 'Faible' si <50>",
  "verdict": "<3-5 phrases: ce qu'un recruteur ${sectorCriteria.label} voit en 20s + verdict cash + où placer les efforts>",
  "headline": "<1 phrase punchy sous-titre du rapport, 12-18 mots, direct>",
  "dimensions": [
    { "key": "structure", "label": "Structure & lisibilité", "score": <0-100>, "verdict": "<1-2 phrases>" },
    { "key": "impact", "label": "Impact & résultats chiffrés", "score": <0-100>, "verdict": "..." },
    { "key": "contenu", "label": "Contenu & pertinence", "score": <0-100>, "verdict": "..." },
    { "key": "ats", "label": "Optimisation ATS", "score": <0-100>, "verdict": "..." },
    { "key": "coherence_secteur", "label": "Cohérence secteur ${sectorCriteria.label}", "score": <0-100>, "verdict": "..." },
    { "key": "orthographe", "label": "Orthographe & syntaxe", "score": <0-100>, "verdict": "..." }
  ],
  "sections": [
    { "section": "En-tête", "status": "<excellent|correct|insuffisant|manquant>", "score": <0-100>, "comment": "<...>", "quickFixes": ["<action concrète>", "..."] },
    { "section": "Résumé pro", ... },
    { "section": "Expériences", ... },
    { "section": "Formations", ... },
    { "section": "Compétences", ... },
    { "section": "Langues", ... },
    { "section": "Extras / centres d'intérêt", ... }
  ],
  "redFlags": [
    { "severity": "<critical|warning|info>", "title": "<...>", "detail": "<...>", "location": "<section concernée>" }
  ],
  "quickWins": [
    { "title": "<...>", "before": "<passage actuel dans le CV>", "after": "<réécriture recommandée>", "gainPoints": <int 1-8> }
  ],
  "atsMatch": {
    "matchedKeywords": ["<mot-clé ATS présent dans le CV>", "..."],
    "missingKeywords": ["<mot-clé secteur absent>", "..."],
    "coveragePct": <int 0-100>,
    "advice": "<1-2 phrases actionnables>"
  },
  "upsell": [
    { "key": "rewrite_all", "title": "Réécrire tout le CV avec Claude", "pitch": "<1 phrase percutante>", "cost": 5 },
    { "key": "regenerate_pdf_sector", "title": "Régénérer un PDF ${sectorCriteria.label}", "pitch": "<...>", "cost": 2 },
    { "key": "coaching_call", "title": "Coaching CV avec un expert", "pitch": "<...>", "cost": 10 }
  ],
  "timeToImproveMinutes": <int 15-180, temps réaliste pour passer au tier suivant>
}

Règles strictes :
- Sois honnête : si le CV est bof pour le secteur, dis-le clairement.
- Chaque score doit être argumenté par le verdict.
- 5 à 12 red flags maximum, priorité aux critiques.
- 3 à 6 quickWins, chacune avec un avant/après concret basé sur le CV réel.
- coveragePct calculé par : matchedKeywords ÷ (matchedKeywords + missingKeywords) × 100.
- Tous les textes en français, sans emoji, sans exagération marketing.
- Réponds SEULEMENT le JSON.`;

  const raw = await callClaude(prompt, {
    system: SYSTEM,
    model: "claude-sonnet-4-6",
    timeoutMs: 65_000,
  });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Réponse Claude non JSON");

  const parsed = JSON.parse(match[0]) as CvDeepReport;

  // Coerce and clamp
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
  if (parsed.atsMatch) {
    parsed.atsMatch.coveragePct = Math.max(
      0,
      Math.min(100, Math.round(parsed.atsMatch.coveragePct ?? 0))
    );
  }
  parsed.sector = sector;
  return parsed;
}
