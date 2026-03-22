import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function generateJSON(prompt: string, maxTokens: number = 4000): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return response.text ?? "";
}

export interface ScoreBreakdown {
  structure: number;
  contenu: number;
  experiences: number;
  competences: number;
  orthographe: number;
  impact: number;
}

export interface CVAnalysisResult {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CVCorrectionsResult {
  corrections: {
    section: string;
    original: string;
    suggestion: string;
    reason: string;
    priority: "haute" | "moyenne" | "basse";
  }[];
  correctedCV: string;
  tips: string[];
}

export interface CoverLetterAnalysisResult {
  score: number;
  scoreBreakdown: {
    accroche: number;
    motivation: number;
    adequation: number;
    structure: number;
    style: number;
    conclusion: number;
  };
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CoverLetterGenerationResult {
  coverLetter: string;
  tips: string[];
  companyInsights: string[];
}

export interface JobMatchResult {
  matchScore: number;
  adaptedCV: string;
  suggestions: string[];
  missingKeywords: string[];
  presentKeywords: string[];
  globalAdvice: string;
}

// ===== CV ANALYSIS =====

export async function analyzeCV(cvText: string): Promise<CVAnalysisResult> {
  const text = await generateJSON(`Tu es un expert RH français avec 15 ans d'expérience. Analyse ce CV en profondeur.

CV:
${cvText}

Réponds avec un JSON au format:
{
  "score": <0-100>,
  "scoreBreakdown": {
    "structure": <0-100>,
    "contenu": <0-100>,
    "experiences": <0-100>,
    "competences": <0-100>,
    "orthographe": <0-100>,
    "impact": <0-100>
  },
  "summary": "<résumé en 3-4 phrases, direct et actionnable>",
  "strengths": ["<point fort détaillé 1>", "<2>", "<3>", ...],
  "weaknesses": ["<axe amélioration détaillé 1>", "<2>", "<3>", ...]
}

Barème: structure=mise en page/lisibilité, contenu=pertinence/clarté, experiences=détails/résultats chiffrés, competences=hard+soft skills, orthographe=grammaire/syntaxe, impact=mots-clés ATS/accroche.
Minimum 3 points forts et 3 axes d'amélioration. Sois spécifique avec des exemples du CV.`, 2500);

  return JSON.parse(text);
}

// ===== STRUCTURE CV (for editor) =====

export async function structureCV(cvText: string) {
  const text = await generateJSON(`Tu es un expert RH français. Extrais et AMÉLIORE le contenu de ce CV en JSON structuré.

CV:
${cvText}

Réponds avec un JSON au format:
{
  "header": {
    "firstName": "<prénom>",
    "lastName": "<nom>",
    "title": "<titre professionnel optimisé, ex: 'Chef de Projet Marketing Digital'>",
    "email": "<email>",
    "phone": "<téléphone>",
    "location": "<ville>",
    "linkedin": "<url linkedin si présent, sinon null>",
    "website": "<url site si présent, sinon null>"
  },
  "summary": "<accroche professionnelle de 2-3 phrases, percutante et optimisée ATS. Si absente du CV original, CRÉE-EN une pertinente.>",
  "experiences": [
    {
      "id": "<id unique ex: exp_1>",
      "company": "<entreprise>",
      "position": "<poste amélioré avec titre plus impactant>",
      "startDate": "<date début>",
      "endDate": "<date fin ou Présent>",
      "location": "<lieu si disponible>",
      "bullets": ["<bullet point amélioré avec verbe d'action + résultat chiffré>", ...]
    }
  ],
  "education": [
    {
      "id": "<id unique ex: edu_1>",
      "school": "<établissement>",
      "degree": "<diplôme complet>",
      "startDate": "<année début>",
      "endDate": "<année fin>",
      "description": "<mention, spécialisation, ou détail pertinent si disponible>"
    }
  ],
  "skills": [
    {
      "category": "<catégorie ex: Marketing Digital, Outils, Développement>",
      "items": ["<compétence 1>", "<compétence 2>", ...]
    }
  ],
  "languages": [
    { "name": "<langue>", "level": "<niveau: Natif, Courant, B2, etc.>" }
  ],
  "interests": ["<centre d'intérêt>", ...],
  "detectedTheme": "<secteur détecté: banque/finance, tech/IT, design/créatif, médical/santé, admin/juridique, startup/digital, hôtellerie/tourisme, commerce, etc. Basé sur les expériences et compétences du candidat>"
}

RÈGLES CRITIQUES:
- AMÉLIORE chaque bullet point avec des verbes d'action forts (Piloté, Optimisé, Développé, Conçu...)
- AJOUTE des chiffres/résultats quand c'est possible (ex: "+15% de trafic", "équipe de 5 personnes")
- CRÉE un summary/accroche professionnel si absent
- OPTIMISE les titres de poste pour les ATS
- ORGANISE les compétences par catégories logiques
- Garde TOUTES les informations du CV original, n'invente rien
- Les IDs doivent être uniques (exp_1, exp_2, edu_1, etc.)`, 6000);

  return JSON.parse(text);
}

// ===== CV CORRECTIONS =====

export async function generateCorrections(cvText: string): Promise<CVCorrectionsResult> {
  const text = await generateJSON(`Tu es un expert RH français. Génère des corrections détaillées et réécris ce CV.

CV:
${cvText}

Réponds avec un JSON au format:
{
  "corrections": [
    {
      "section": "<nom section>",
      "original": "<texte original>",
      "suggestion": "<texte amélioré>",
      "reason": "<pourquoi cette correction>",
      "priority": "<haute|moyenne|basse>"
    }
  ],
  "correctedCV": "<CV complet réécrit, bien structuré>",
  "tips": ["<conseil actionnable 1>", ...]
}

Focus: verbes d'action, quantification résultats, optimisation ATS, suppression superflu, erreurs FR. Minimum 5 corrections et 5 conseils.`);

  return JSON.parse(text);
}

// ===== COVER LETTER ANALYSIS =====

export async function analyzeCoverLetter(letterText: string): Promise<CoverLetterAnalysisResult> {
  const text = await generateJSON(`Tu es un expert RH français spécialisé dans les lettres de motivation. Analyse cette lettre.

Lettre de motivation:
${letterText}

Réponds avec un JSON au format:
{
  "score": <0-100>,
  "scoreBreakdown": {
    "accroche": <0-100>,
    "motivation": <0-100>,
    "adequation": <0-100>,
    "structure": <0-100>,
    "style": <0-100>,
    "conclusion": <0-100>
  },
  "summary": "<résumé en 3-4 phrases>",
  "strengths": ["<point fort 1>", ...],
  "weaknesses": ["<axe amélioration 1>", ...]
}

Minimum 3 forces et 3 faiblesses. Sois spécifique.`, 2500);

  return JSON.parse(text);
}

// ===== COVER LETTER GENERATION (avec recherche entreprise) =====

export async function generateCoverLetter(
  cvText: string,
  jobDescription: string,
  companyName: string,
  companyInfo: string
): Promise<CoverLetterGenerationResult> {
  const text = await generateJSON(`Tu es un expert RH français spécialisé dans la rédaction de lettres de motivation percutantes.

Génère une lettre de motivation personnalisée en utilisant ces informations:

CV DU CANDIDAT:
${cvText}

OFFRE D'EMPLOI:
${jobDescription}

ENTREPRISE: ${companyName}
INFORMATIONS SUR L'ENTREPRISE:
${companyInfo}

Réponds avec un JSON au format:
{
  "coverLetter": "<lettre de motivation complète, professionnelle, en français. Utilise les informations de l'entreprise pour personnaliser. Format avec paragraphes. Environ 300-400 mots.>",
  "tips": ["<conseil pour personnaliser encore plus>", ...],
  "companyInsights": ["<info clé sur l'entreprise utilisée dans la lettre>", ...]
}

La lettre doit:
- Mentionner l'entreprise par son nom et montrer une connaissance de ses activités/valeurs
- Faire le lien entre les expériences du candidat et les besoins du poste
- Avoir une accroche qui capte l'attention (pas "Par la présente...")
- Être structurée: accroche, motivation, adéquation, conclusion avec call-to-action
- Sonner authentique, pas robotique
- Utiliser un ton professionnel mais pas trop formel`);

  return JSON.parse(text);
}

// ===== HUMANIZE TEXT (Anti AI Detection) =====

export interface HumanizeResult {
  humanizedText: string;
  changes: string[];
  aiScoreBefore: number;
  aiScoreAfter: number;
}

export async function humanizeText(
  text: string,
  intensity: "light" | "balanced" | "aggressive" = "balanced",
  tone: "standard" | "professionnel" | "academique" | "decontracte" = "standard"
): Promise<HumanizeResult> {
  const intensityInstructions = {
    light: "Fais des modifications subtiles : varie légèrement la structure des phrases, remplace quelques mots par des synonymes moins prévisibles, ajoute 1-2 expressions naturelles. Garde 90% du texte original.",
    balanced: "Reformule environ 50% des phrases en gardant le sens exact. Varie la longueur des phrases (mélange courtes et longues). Remplace les tournures typiquement IA par des expressions plus naturelles. Ajoute quelques imperfections stylistiques volontaires (phrases nominales, parenthèses).",
    aggressive: "Réécris complètement le texte en gardant strictement le même sens et les mêmes informations. Change la structure de chaque phrase. Utilise un style très humain avec des variations de rythme, des expressions idiomatiques françaises, des tournures personnelles. Le texte doit être impossible à distinguer d'un texte écrit par un humain natif français."
  };

  const toneInstructions = {
    standard: "Ton neutre et naturel.",
    professionnel: "Ton professionnel mais pas robotique — comme un cadre expérimenté qui écrit bien.",
    academique: "Ton académique mais pas artificiel — comme un bon étudiant qui maîtrise le sujet.",
    decontracte: "Ton décontracté mais crédible — comme quelqu'un qui écrit naturellement bien."
  };

  const responseText = await generateJSON(`Tu es un expert en rédaction française. Ta mission : réécrire ce texte pour qu'il soit INDÉTECTABLE par les outils de détection d'IA (GPTZero, Originality.ai, etc.).

TEXTE ORIGINAL:
${text}

INTENSITÉ: ${intensity}
${intensityInstructions[intensity]}

TON: ${tone}
${toneInstructions[tone]}

RÈGLES ANTI-DÉTECTION CRITIQUES:
- VARIE la longueur des phrases de manière irrégulière (certaines très courtes, d'autres longues)
- ÉVITE les structures parallèles répétitives (pas de "D'une part... D'autre part", pas de listes de 3 systématiques)
- ÉVITE ces mots/expressions typiques de l'IA : "En effet", "Il convient de", "Force est de constater", "Dans le cadre de", "Il est important de noter", "En outre", "Par ailleurs", "Ainsi", "De plus" en début de phrase
- UTILISE des connecteurs variés et moins formels : "D'ailleurs", "Bon", "Après", "Et puis", "Bref"
- AJOUTE de la personnalité : 1-2 expressions idiomatiques, une touche d'humour subtil si approprié
- CASSE le rythme : une phrase très courte après une longue, une question rhétorique, une parenthèse
- GARDE des "imperfections naturelles" : une virgule avant "et" parfois, une phrase qui commence par "Et" ou "Mais"
- Le sens, les informations et le niveau de qualité doivent rester IDENTIQUES

Réponds avec un JSON au format:
{
  "humanizedText": "<texte complet réécrit>",
  "changes": ["<description du changement 1>", "<changement 2>", ...],
  "aiScoreBefore": <estimation 0-100 du score IA du texte original, 100=100% IA>,
  "aiScoreAfter": <estimation 0-100 du score IA après humanisation>
}

Minimum 5 changements listés. Le aiScoreAfter doit être réaliste (pas toujours 0).`);

  return JSON.parse(responseText);
}

// ===== PLAGIARISM DETECTION =====

export interface PlagiarismResult {
  originalityScore: number;
  flaggedSections: {
    text: string;
    issue: "plagiat_probable" | "formulation_commune" | "citation_non_sourcee" | "paraphrase_proche";
    confidence: number;
    explanation: string;
    source_probable: string;
  }[];
  summary: string;
  tips: string[];
}

export async function detectPlagiarism(text: string): Promise<PlagiarismResult> {
  const responseText = await generateJSON(`Tu es un expert en détection de plagiat universitaire français avec 20 ans d'expérience (comme Compilatio/Turnitin). Analyse ce texte en profondeur pour détecter tout plagiat, paraphrase trop proche, ou contenu non-original.

TEXTE À ANALYSER:
${text}

ANALYSE REQUISE:
1. Identifie les passages qui semblent copiés-collés ou paraphrasés de sources connues (Wikipedia, sites éducatifs, manuels scolaires, articles de presse)
2. Repère les formulations trop "parfaites" ou encyclopédiques qui suggèrent un copier-coller
3. Détecte les changements de style brusques (signe de collage de différentes sources)
4. Identifie les citations sans guillemets ni références
5. Repère les passages qui ressemblent à du contenu généré par IA (structures trop régulières, vocabulaire trop soutenu)
6. Vérifie la cohérence du niveau de langue à travers le texte

Réponds avec un JSON au format:
{
  "originalityScore": <0-100, où 100 = totalement original>,
  "flaggedSections": [
    {
      "text": "<extrait exact du passage suspect, 20-50 mots>",
      "issue": "<plagiat_probable|formulation_commune|citation_non_sourcee|paraphrase_proche>",
      "confidence": <0-100, confiance dans la détection>,
      "explanation": "<pourquoi ce passage est suspect>",
      "source_probable": "<type de source probable: Wikipedia, manuel scolaire, article web, IA, inconnu>"
    }
  ],
  "summary": "<résumé en 3-4 phrases de l'analyse d'originalité>",
  "tips": ["<conseil pour améliorer l'originalité 1>", "<conseil 2>", ...]
}

Sois rigoureux mais juste. Ne flag pas les expressions courantes ou le vocabulaire technique normal. Minimum 3 tips. Si le texte est original, dis-le clairement avec un score élevé.`);

  return JSON.parse(responseText);
}

// ===== REFORMULATE TEXT =====

export interface ReformulateResult {
  reformulatedText: string;
  changes: string[];
}

export async function reformulateText(
  text: string,
  style: "academique" | "simplifie" | "professionnel" | "soutenu" = "academique"
): Promise<ReformulateResult> {
  const styleInstructions = {
    academique: "Style académique universitaire français : précis, structuré, avec un vocabulaire soutenu mais pas prétentieux. Adapté pour un mémoire, rapport ou dissertation.",
    simplifie: "Style simplifié et clair : phrases courtes, mots simples, accessible à tous. Garde les idées mais rend le texte plus digeste.",
    professionnel: "Style professionnel corporate : concis, impactant, adapté au monde de l'entreprise. Supprime le superflu.",
    soutenu: "Style littéraire soutenu : élégant, riche en vocabulaire, avec des figures de style subtiles. Registre de langue élevé.",
  };

  const responseText = await generateJSON(`Tu es un expert en rédaction française. Reformule ce texte dans un style différent en gardant EXACTEMENT le même sens et les mêmes informations.

TEXTE ORIGINAL:
${text}

STYLE DEMANDÉ: ${style}
${styleInstructions[style]}

RÈGLES:
- Garde le même sens et les mêmes informations
- Change la structure des phrases et le vocabulaire
- Le résultat doit être naturel et fluide
- Pas de perte de contenu

Réponds avec un JSON au format:
{
  "reformulatedText": "<texte complet reformulé>",
  "changes": ["<description du type de changement 1>", "<changement 2>", ...]
}

Minimum 5 changements listés.`);

  return JSON.parse(responseText);
}

// ===== GENERATE PRO EMAIL =====

export interface ProEmailResult {
  email: string;
  subject: string;
  tips: string[];
}

export async function generateProEmail(
  context: string,
  type: "candidature" | "relance" | "stage" | "remerciement" | "demande_info",
  details: { recipientName?: string; companyName?: string; position?: string; tone?: string }
): Promise<ProEmailResult> {
  const typeLabels = {
    candidature: "Mail de candidature spontanée",
    relance: "Mail de relance après candidature ou entretien",
    stage: "Mail de demande de stage",
    remerciement: "Mail de remerciement après entretien",
    demande_info: "Mail de demande d'information professionnelle",
  };

  const responseText = await generateJSON(`Tu es un coach en communication professionnelle français. Rédige un email professionnel.

TYPE: ${typeLabels[type]}
CONTEXTE: ${context}
${details.recipientName ? `DESTINATAIRE: ${details.recipientName}` : ""}
${details.companyName ? `ENTREPRISE: ${details.companyName}` : ""}
${details.position ? `POSTE: ${details.position}` : ""}
TON: ${details.tone || "professionnel mais naturel"}

Réponds avec un JSON au format:
{
  "email": "<corps complet du mail, avec formule de politesse adaptée>",
  "subject": "<objet du mail, court et percutant>",
  "tips": ["<conseil pour personnaliser>", ...]
}

RÈGLES:
- Pas de "Par la présente" ni de formules vieillotes
- Ton naturel et professionnel, adapté à un jeune candidat
- Court et efficace (150-250 mots max)
- Accroche qui donne envie de lire la suite
- Call-to-action clair en fin de mail
- Formule de politesse moderne (pas "Veuillez agréer l'expression de mes sentiments distingués")
- Le mail doit sonner humain, pas écrit par une IA`, 2500);

  return JSON.parse(responseText);
}

// ===== JOB MATCHING =====

export async function matchCVToJob(
  cvText: string,
  jobDescription: string
): Promise<JobMatchResult> {
  const text = await generateJSON(`Tu es un expert RH français. Compare ce CV avec cette offre et adapte le CV.

CV ACTUEL:
${cvText}

OFFRE D'EMPLOI:
${jobDescription}

Réponds avec un JSON au format:
{
  "matchScore": <0-100>,
  "adaptedCV": "<CV complet réécrit et optimisé pour cette offre spécifique>",
  "suggestions": ["<suggestion 1>", ...],
  "missingKeywords": ["<mot-clé offre absent du CV>", ...],
  "presentKeywords": ["<mot-clé offre présent dans CV>", ...],
  "globalAdvice": "<conseil global en 2-3 phrases>"
}

Le CV adapté doit reprendre les mots-clés de l'offre naturellement, réorganiser les expériences, optimiser pour les ATS.`);

  return JSON.parse(text);
}
