"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/components/auth/auth-context";
import { CV_SECTOR_LIST } from "@/lib/cv-criteria";
import type { LinkedInAnalysis } from "@/app/api/linkedin-analyzer/route";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCopy,
  Clock,
  Linkedin,
  Loader2,
  Sparkles,
} from "lucide-react";

/* ─── Loading steps ─── */
const LOADING_STEPS = [
  "Lecture du profil en cours...",
  "Analyse du secteur...",
  "Comparaison avec les top profils du marché...",
  "Rédaction des sections optimisées...",
  "Calcul du score final...",
];

type TargetLevel = "stage" | "alternance" | "junior" | "senior" | "executive";
type CurrentSituation = "etudiant" | "en-poste" | "en-recherche";

const LEVEL_OPTIONS: Array<{ id: TargetLevel; emoji: string; label: string; sub: string }> = [
  { id: "stage", emoji: "🎓", label: "Trouver un stage", sub: "< 6 mois" },
  { id: "alternance", emoji: "🔄", label: "Décrocher une alternance", sub: "1-2 ans" },
  { id: "junior", emoji: "💼", label: "Changer de poste", sub: "junior / mid" },
  { id: "senior", emoji: "🚀", label: "Évoluer vers senior/exec", sub: "leadership" },
];

const SITUATION_OPTIONS: Array<{ id: CurrentSituation; label: string }> = [
  { id: "etudiant", label: "En études" },
  { id: "en-poste", label: "En poste" },
  { id: "en-recherche", label: "En recherche active" },
];

/* ─── Circular score ring (inline SVG) ─── */
function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f3f4f6" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black text-gray-900">{score}</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">/100</span>
      </div>
    </div>
  );
}

/* ─── Score bar ─── */
function ScoreBar({ label, score, max = 20 }: { label: string; score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100);
  const color =
    pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 text-[11px] font-semibold text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold text-gray-900 w-10 text-right">{score}/{max}</span>
    </div>
  );
}

/* ─── Copy button ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="ml-2 inline-flex items-center gap-1 rounded-lg bg-gray-100 hover:bg-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition-colors"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
      {copied ? "Copié !" : "Copier"}
    </button>
  );
}

/* ─── Impact badge ─── */
function ImpactBadge({ impact }: { impact: "faible" | "moyen" | "fort" }) {
  const map = {
    fort: "bg-emerald-100 text-emerald-700",
    moyen: "bg-amber-100 text-amber-700",
    faible: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${map[impact]}`}>
      {impact}
    </span>
  );
}

/* ═══════════════════════════════════════════════ */
export default function LinkedInAnalyzerPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();

  /* Step 1 state */
  const [targetLevel, setTargetLevel] = useState<TargetLevel | null>(null);
  const [targetSector, setTargetSector] = useState<string>("");
  const [targetRole, setTargetRole] = useState("");
  const [currentSituation, setCurrentSituation] = useState<CurrentSituation | null>(null);

  /* Step 2 state */
  const [profileText, setProfileText] = useState("");

  /* Step */
  const [step, setStep] = useState<1 | 2 | 3>(1);

  /* Loading */
  const [loadingStep, setLoadingStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Results */
  const [analysis, setAnalysis] = useState<LinkedInAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Active tab in results */
  const [activeResultTab, setActiveResultTab] = useState(0);

  const charCount = profileText.length;
  const charMin = 200;
  const charMax = 5000;

  const step1Valid =
    targetLevel !== null &&
    targetSector !== "" &&
    targetRole.trim().length > 2 &&
    currentSituation !== null;

  const step2Valid = charCount >= charMin && charCount <= charMax;

  /* ─── Animate loading steps ─── */
  const startLoadingAnimation = () => {
    setLoadingStep(0);
    let current = 0;
    loadingIntervalRef.current = setInterval(() => {
      current += 1;
      if (current < LOADING_STEPS.length) {
        setLoadingStep(current);
      } else {
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      }
    }, 2400);
  };

  const stopLoadingAnimation = () => {
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
  };

  /* ─── Submit ─── */
  const handleAnalyze = async () => {
    if (!session) {
      openAuthModal();
      return;
    }
    if (!step2Valid || !step1Valid) return;

    setIsLoading(true);
    setError(null);
    startLoadingAnimation();

    try {
      const res = await fetch("/api/linkedin-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileText,
          targetSector,
          targetRole,
          targetLevel,
          currentSituation,
        }),
      });
      const data = await res.json() as LinkedInAnalysis & { error?: string };
      if (res.status === 403) {
        setError("Plus assez de tokens. Achètes-en sur la page tokens.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setAnalysis(data);
      setStep(3);
      setActiveResultTab(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'analyse");
    } finally {
      stopLoadingAnimation();
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setAnalysis(null);
    setError(null);
    setProfileText("");
    setTargetLevel(null);
    setTargetRole("");
    setCurrentSituation(null);
  };

  const RESULT_TABS = ["💪 Points clés", "✍️ Sections réécrites", "🔑 Mots-clés", "⚡ Plan d'action"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Linkedin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">LinkedIn Pro</h1>
              <p className="text-xs text-gray-400">Analyse + optimisation IA de ton profil LinkedIn</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link href="/linkedin-analyzer/history" className="text-sm text-indigo-500 hover:underline flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Voir mon historique
              </Link>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                Gratuit · Premium
              </span>
            </div>
          </div>

          {/* Step indicator */}
          {step < 3 && (
            <div className="flex items-center gap-2 mt-5">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                      step >= s
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {s}
                  </div>
                  <span className={`text-xs font-semibold ${step >= s ? "text-gray-900" : "text-gray-400"}`}>
                    {s === 1 ? "Contexte" : "Ton profil"}
                  </span>
                  {s < 2 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* ══════════ STEP 1 — Context ══════════ */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto space-y-7">
            {/* Objective */}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-3">Quel est ton objectif ?</p>
              <div className="grid grid-cols-2 gap-3">
                {LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTargetLevel(opt.id)}
                    className={`rounded-2xl p-4 text-left border-2 transition-all ${
                      targetLevel === opt.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{opt.emoji}</span>
                    <p className="text-sm font-bold text-gray-900">{opt.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Sector */}
            <div>
              <label className="text-sm font-bold text-gray-900 mb-2 block">
                Dans quel secteur ?
              </label>
              <select
                value={targetSector}
                onChange={(e) => setTargetSector(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
              >
                <option value="">— Choisis un secteur —</option>
                {CV_SECTOR_LIST.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div>
              <label className="text-sm font-bold text-gray-900 mb-2 block">
                Poste visé <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Ex : Analyste M&A chez Lazard, Développeur Full-Stack React, Chargé de marketing digital"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>

            {/* Situation */}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">Situation actuelle</p>
              <div className="flex flex-wrap gap-2">
                {SITUATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setCurrentSituation(opt.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                      currentSituation === opt.id
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!step1Valid}
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant — Coller mon profil
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ══════════ STEP 2 — Paste profile ══════════ */}
        {step === 2 && !isLoading && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">
                Colle le texte de ton profil LinkedIn
              </h2>
              <p className="text-sm text-gray-500">
                Pour{" "}
                <strong className="text-gray-900">{targetRole}</strong> —{" "}
                {CV_SECTOR_LIST.find((s) => s.key === targetSector)?.label ?? targetSector}
              </p>
            </div>

            {/* Instructions */}
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs font-bold text-amber-800 mb-1">Comment copier ton profil LinkedIn</p>
              <ol className="text-xs text-amber-700 space-y-0.5 list-decimal list-inside">
                <li>Va sur ton profil LinkedIn dans un navigateur</li>
                <li>Clique sur chaque section (Résumé, Expériences, Compétences, Formation)</li>
                <li>Sélectionne tout le texte visible et copie-le</li>
                <li>Colle-le ci-dessous — pas besoin d&apos;URL</li>
              </ol>
            </div>

            <div>
              <textarea
                value={profileText}
                onChange={(e) => setProfileText(e.target.value.slice(0, charMax))}
                placeholder={`Thomas Durand\nAnalyste M&A | HEC Paris | Finance & Strategy\n\nÀ propos\nPassionné par la finance d'entreprise et les opérations de fusion-acquisition...\n\nExpériences\nStagiaire Analyste — BNP Paribas CIB (Juin 2024 - Août 2024)\n- Participation au closing de 3 deals LBO pour un total de 850M€...\n\nFormation\nHEC Paris — Master Grande École (2022 - 2025)...`}
                rows={14}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none transition-colors font-mono"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-gray-400">
                  Min {charMin} · Max {charMax.toLocaleString("fr-FR")} caractères
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    charCount < charMin
                      ? "text-red-400"
                      : charCount > charMax * 0.9
                      ? "text-amber-500"
                      : "text-emerald-600"
                  }`}
                >
                  {charCount.toLocaleString("fr-FR")} / {charMax.toLocaleString("fr-FR")}
                </span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Retour
              </button>
              <button
                disabled={!step2Valid}
                onClick={() => void handleAnalyze()}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-lg transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4" />
                Analyser mon profil
              </button>
            </div>
          </div>
        )}

        {/* ══════════ LOADING ══════════ */}
        {isLoading && (
          <div className="max-w-md mx-auto py-16 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 shadow-lg shadow-blue-500/25">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-8">Analyse en cours...</h2>
            <div className="space-y-3 text-left">
              {LOADING_STEPS.map((label, i) => (
                <div key={i} className="flex items-center gap-3">
                  {i < loadingStep ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : i === loadingStep ? (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-200 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      i <= loadingStep ? "text-gray-900 font-semibold" : "text-gray-400"
                    }`}
                  >
                    {i === 1 ? label.replace("secteur", CV_SECTOR_LIST.find((s) => s.key === targetSector)?.label ?? "secteur") : label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ STEP 3 — Results ══════════ */}
        {step === 3 && analysis && (
          <div className="space-y-6">
            {/* 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left — Score */}
              <div className="lg:col-span-1 space-y-4">
                <div className="rounded-3xl bg-white border border-gray-200 p-6">
                  <div className="flex flex-col items-center mb-5">
                    <ScoreRing score={analysis.globalScore} />
                    <p className="text-sm font-black text-gray-900 mt-3 text-center">
                      {analysis.verdict}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-3">
                      Décomposition
                    </p>
                    <ScoreBar label="Titre" score={analysis.scoreBreakdown.titre} />
                    <ScoreBar label="Résumé" score={analysis.scoreBreakdown.resume} />
                    <ScoreBar label="Expériences" score={analysis.scoreBreakdown.experiences} />
                    <ScoreBar label="Compétences" score={analysis.scoreBreakdown.competences} />
                    <ScoreBar label="Formation" score={analysis.scoreBreakdown.formation} />
                  </div>
                </div>

                {/* Recruiter insight */}
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2">
                    Ce qu&apos;un recruteur pense
                  </p>
                  <p className="text-xs text-gray-600 italic leading-relaxed">
                    &ldquo;{analysis.recruiterInsight}&rdquo;
                  </p>
                </div>
              </div>

              {/* Right — Tabs */}
              <div className="lg:col-span-2">
                {/* Tab bar */}
                <div className="flex gap-1 mb-4 bg-gray-100 rounded-2xl p-1 overflow-x-auto">
                  {RESULT_TABS.map((tab, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveResultTab(i)}
                      className={`flex-1 min-w-max rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                        activeResultTab === i
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab 0 — Points clés */}
                {activeResultTab === 0 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
                      <p className="text-xs font-black text-emerald-800 uppercase tracking-wide mb-3">
                        ✅ Points forts détectés
                      </p>
                      <ul className="space-y-2">
                        {analysis.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl bg-orange-50 border border-orange-200 p-5">
                      <p className="text-xs font-black text-orange-800 uppercase tracking-wide mb-3">
                        ⚠️ Points à améliorer
                      </p>
                      <ul className="space-y-2">
                        {analysis.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-orange-900">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">🎯</span>
                        <div>
                          <p className="text-xs font-black text-blue-800 uppercase tracking-wide mb-1">
                            Positionnement concurrentiel
                          </p>
                          <p className="text-sm text-blue-900 leading-relaxed">
                            {analysis.competitorComparison}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 1 — Sections réécrites */}
                {activeResultTab === 1 && (
                  <div className="space-y-5">
                    <div className="rounded-2xl bg-white border border-gray-200 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-black text-gray-700 uppercase tracking-wide">
                          Nouveau titre LinkedIn
                        </p>
                        <CopyButton text={analysis.rewrittenTitle} />
                      </div>
                      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                        <p className="text-sm font-semibold text-blue-900">
                          {analysis.rewrittenTitle}
                        </p>
                        <p className="text-[10px] text-blue-400 mt-1">
                          {analysis.rewrittenTitle.length} / 220 caractères
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-200 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-black text-gray-700 uppercase tracking-wide">
                          Nouvelle section &ldquo;À propos&rdquo;
                        </p>
                        <CopyButton text={analysis.rewrittenSummary} />
                      </div>
                      <div className="max-h-52 overflow-y-auto rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                          {analysis.rewrittenSummary}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                      💡 Remplace ces sections directement dans l&apos;éditeur LinkedIn (onglet &ldquo;Modifier le profil&rdquo;)
                    </div>
                  </div>
                )}

                {/* Tab 2 — Mots-clés */}
                {activeResultTab === 2 && (
                  <div className="space-y-5">
                    <div className="rounded-2xl bg-white border border-gray-200 p-5">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wide mb-3">
                        🔍 Mots-clés manquants
                      </p>
                      <p className="text-xs text-gray-400 mb-3">
                        Clique sur un mot-clé pour le copier
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.missingKeywords.map((kw, i) => (
                          <button
                            key={i}
                            onClick={() => void navigator.clipboard.writeText(kw)}
                            className="rounded-full border-2 border-red-300 bg-red-50 hover:bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 transition-colors"
                          >
                            + {kw}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-200 p-5">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wide mb-3">
                        🏷️ Compétences LinkedIn à ajouter
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.recommendedSkills.map((sk, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-xs text-indigo-800">
                      💡 Intègre ces mots-clés dans ton titre, résumé et descriptions d&apos;expériences pour booster ta visibilité dans les recherches LinkedIn Recruiter.
                    </div>
                  </div>
                )}

                {/* Tab 3 — Plan d'action */}
                {activeResultTab === 3 && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500">
                      3 choses à faire <strong className="text-gray-900">aujourd&apos;hui</strong> pour améliorer ton profil
                    </p>
                    {analysis.quickWins.map((qw, i) => (
                      <div
                        key={i}
                        className="rounded-2xl bg-white border border-gray-200 p-5 flex gap-4"
                      >
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 mb-2">{qw.action}</p>
                          <div className="flex items-center gap-2">
                            <ImpactBadge impact={qw.impact} />
                            <span className="text-[11px] text-gray-400">⏱ {qw.timeEstimate}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="mt-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
                      <p className="text-sm font-black mb-1">Ton profil est optimisé ?</p>
                      <p className="text-xs text-emerald-100 mb-4">
                        Crée maintenant un CV assorti, adapté au même secteur.
                      </p>
                      <Link
                        href="/cv-builder"
                        className="inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2.5 text-sm font-bold text-white transition-colors"
                      >
                        Créer mon CV Seora maintenant
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cross-link card */}
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-7 text-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-black mb-1">
                    Ton profil LinkedIn est optimisé
                  </p>
                  <p className="text-sm text-emerald-100">
                    Crée maintenant ton CV assorti — même secteur, même cible, même impact.
                  </p>
                </div>
                <Link
                  href="/cv-builder"
                  className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-50 transition-colors shadow-md"
                >
                  Créer mon CV
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Reset */}
            <div className="text-center">
              <button
                onClick={handleReset}
                className="text-sm text-gray-400 hover:text-gray-700 underline underline-offset-4 transition-colors"
              >
                Recommencer l&apos;analyse avec un autre profil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
