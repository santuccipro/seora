"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useAuthModal } from "@/components/auth/auth-context";
import Link from "next/link";
import { Loader2, ChevronDown, ChevronUp, RotateCcw, Clock } from "lucide-react";
import { CV_SECTOR_LIST } from "@/lib/cv-criteria";
import type { CvSectorKey } from "@/lib/cv-criteria";
import { toast } from "sonner";

/* ─── Types ─── */
interface PrepQuestion {
  question: string;
  category: "comportemental" | "technique" | "motivation" | "situation";
  difficulty: "facile" | "moyen" | "difficile";
  tip: string;
  sampleAnswer: string;
}

interface PrepResult {
  questions: PrepQuestion[];
  globalTips: string[];
  redFlags: string[];
}

type ExperienceLevel = "junior" | "senior" | "executive";
type CategoryTab = "comportemental" | "technique" | "motivation" | "situation";

/* ─── Config ─── */
const CATEGORY_TABS: { id: CategoryTab; label: string; emoji: string }[] = [
  { id: "comportemental", label: "Comportemental", emoji: "💬" },
  { id: "technique", label: "Technique", emoji: "⚙️" },
  { id: "motivation", label: "Motivation", emoji: "🔥" },
  { id: "situation", label: "Situation", emoji: "🎭" },
];

const DIFFICULTY_STYLES: Record<PrepQuestion["difficulty"], string> = {
  facile: "bg-green-100 text-green-700",
  moyen: "bg-orange-100 text-orange-700",
  difficile: "bg-red-100 text-red-700",
};

/* ─── Page ─── */
export default function InterviewPrepPage() {
  const { status } = useSession();
  const { openAuthModal } = useAuthModal();
  // Step 1 form state
  const [sector, setSector] = useState<CvSectorKey>("generique");
  const [position, setPosition] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("junior");

  // Step 2 results state
  const [result, setResult] = useState<PrepResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryTab>("comportemental");

  const handleGenerate = async () => {
    if (!position.trim()) {
      toast.error("Indique le poste visé");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector, position, companyName: companyName || undefined, experienceLevel }),
      });
      const data = await res.json() as PrepResult & { error?: string };
      if (res.status === 403) {
        toast.error("Plus assez de tokens. Achètes-en sur la page tokens.");
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la génération");
        return;
      }
      setResult(data);
      setActiveTab("comportemental");
    } catch {
      toast.error("Erreur réseau, réessaie");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPosition("");
    setCompanyName("");
    setSector("generique");
    setExperienceLevel("junior");
  };

  const filteredQuestions = result?.questions.filter((q) => q.category === activeTab) ?? [];

  /* ─── Step 1: Form ─── */
  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 lg:bg-transparent">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-md">
                🎯
              </div>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                  Prépare ton entretien
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  8 questions personnalisées + conseils STAR
                </p>
              </div>
              <Link href="/interview-prep/history" className="text-sm text-indigo-500 hover:underline flex items-center gap-1 shrink-0">
                <Clock className="w-3.5 h-3.5" /> Voir mon historique
              </Link>
            </div>
          </div>

          {/* Form card */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-5">
            {/* Sector */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 block">
                Secteur *
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as CvSectorKey)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-shadow"
              >
                {CV_SECTOR_LIST.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Position */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 block">
                Poste visé *
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="ex : Analyste M&A, Développeur Full-stack, Chef de projet..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-shadow placeholder:text-gray-300"
              />
            </div>

            {/* Company */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 block">
                Nom de l'entreprise{" "}
                <span className="text-gray-300 font-normal normal-case">(optionnel)</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ex : BNP Paribas, Datadog, McKinsey..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-shadow placeholder:text-gray-300"
              />
            </div>

            {/* Experience level */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 block">
                Niveau d'expérience *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "junior", label: "Junior", sub: "0-3 ans" },
                    { id: "senior", label: "Senior", sub: "3-8 ans" },
                    { id: "executive", label: "Executive", sub: "8+ ans" },
                  ] as { id: ExperienceLevel; label: string; sub: string }[]
                ).map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => setExperienceLevel(lvl.id)}
                    className={`rounded-xl border-2 px-3 py-3 text-left transition-all ${
                      experienceLevel === lvl.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <p className={`text-sm font-bold ${experienceLevel === lvl.id ? "text-indigo-700" : "text-gray-800"}`}>
                      {lvl.label}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{lvl.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => { if (status !== "authenticated") { openAuthModal(() => handleGenerate()); return; } handleGenerate(); }}
              disabled={loading || !position.trim()}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-40 transition-all active:scale-[0.98] hover:shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Préparation en cours...
                </>
              ) : (
                <>
                  🎯 Générer mes questions
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-gray-400">
              Gratuit · 8 questions personnalisées · Méthode STAR
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Step 2: Results ─── */
  return (
    <div className="min-h-screen bg-gray-50 lg:bg-transparent">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Ton plan d'entretien</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {position}{companyName ? ` · ${companyName}` : ""}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Recommencer
          </button>
        </div>

        {/* Global tips */}
        {result.globalTips?.length > 0 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-4">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
              ✨ Conseils clés pour cet entretien
            </p>
            <ul className="space-y-1.5">
              {result.globalTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Red flags */}
        {result.redFlags?.length > 0 && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 mb-5">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">
              🚩 Erreurs à éviter absolument
            </p>
            <ul className="space-y-1.5">
              {result.redFlags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-1.5 mb-4 rounded-2xl bg-gray-100/80 p-1">
          {CATEGORY_TABS.map((tab) => {
            const count = result.questions.filter((q) => q.category === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="hidden sm:inline">{tab.emoji}</span>
                <span className="truncate">{tab.label}</span>
                <span className={`rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black ${
                  activeTab === tab.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-200/80 text-gray-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Question cards */}
        <div className="space-y-3">
          {filteredQuestions.map((q, i) => (
            <QuestionCard key={i} question={q} index={i + 1} />
          ))}
          {filteredQuestions.length === 0 && (
            <div className="rounded-2xl bg-white border border-gray-100 py-10 text-center">
              <p className="text-sm text-gray-400">Aucune question dans cette catégorie</p>
            </div>
          )}
        </div>

        {/* Bottom reset */}
        <div className="mt-8 text-center">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Recommencer avec un autre poste
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Question card ─── */
function QuestionCard({ question: q, index }: { question: PrepQuestion; index: number }) {
  const [tipOpen, setTipOpen] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* Main question */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600">
            {index}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-[15px] leading-snug">{q.question}</p>
            <div className="mt-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  DIFFICULTY_STYLES[q.difficulty]
                }`}
              >
                {q.difficulty}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tip collapsible */}
      <div className="border-t border-gray-50">
        <button
          onClick={() => setTipOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-left hover:bg-gray-50/60 transition-colors"
        >
          <span className="text-xs font-bold text-gray-600">💡 Conseil</span>
          {tipOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-gray-300" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-300" />
          )}
        </button>
        {tipOpen && (
          <div className="px-4 sm:px-5 pb-4">
            <p className="text-sm text-gray-600 leading-relaxed">{q.tip}</p>
          </div>
        )}
      </div>

      {/* Sample answer collapsible */}
      <div className="border-t border-gray-50">
        <button
          onClick={() => setAnswerOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-left hover:bg-gray-50/60 transition-colors"
        >
          <span className="text-xs font-bold text-indigo-600">✨ Exemple de réponse STAR</span>
          {answerOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-gray-300" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-300" />
          )}
        </button>
        {answerOpen && (
          <div className="px-4 sm:px-5 pb-4">
            <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3.5">
              <p className="text-sm text-indigo-900/80 leading-relaxed">{q.sampleAnswer}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
