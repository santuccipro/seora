"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard/layout";
import { ScoreRing } from "@/components/charts/score-ring";
import {
  Target,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

interface Analysis {
  id: string;
  fileName: string;
  score: number | null;
}

interface MatchResult {
  matchScore: number;
  adaptedCV: string;
  suggestions: string[];
  missingKeywords: string[];
  presentKeywords: string[];
  globalAdvice: string;
}

export default function JobMatchPage() {
  const { status } = useSession();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedCV, setSelectedCV] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [showAdaptedCV, setShowAdaptedCV] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") {
      fetch("/api/analyses")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setAnalyses(d);
        });
    }
  }, [status, router]);

  async function handleMatch() {
    if (!selectedCV || !jobDescription.trim()) {
      toast.error("Sélectionnez un CV et collez l'offre d'emploi");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvAnalysisId: selectedCV,
          jobTitle,
          jobDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        if (res.status === 403) router.push("/tokens");
        return;
      }
      setResult(data);
      toast.success("Matching terminé !");
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Target className="h-7 w-7 text-indigo-500" />
            Adapter mon CV à une offre
          </h1>
          <p className="mt-1 text-gray-600">
            Collez une offre d&apos;emploi et l&apos;IA adapte votre CV spécifiquement pour ce poste
          </p>
        </div>

        {!result ? (
          <div className="space-y-6">
            {/* CV Selection */}
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                1. Sélectionnez votre CV
              </label>
              {analyses.length === 0 ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                  Vous devez d&apos;abord analyser un CV depuis le Dashboard avant de pouvoir le matcher.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {analyses.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedCV(a.id)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                        selectedCV === a.id
                          ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-500/20"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <FileText className={`h-5 w-5 ${selectedCV === a.id ? "text-indigo-600" : "text-gray-400"}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.fileName}</p>
                        {a.score && (
                          <p className="text-xs text-gray-500">Score: {a.score}/100</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                2. Collez l&apos;offre d&apos;emploi
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Titre du poste (ex: Développeur React Senior)"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm mb-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Collez ici le texte complet de l'offre d'emploi..."
                rows={10}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
              />
            </div>

            <button
              onClick={handleMatch}
              disabled={loading || !selectedCV || !jobDescription.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-4 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyse en cours... (30s environ)
                </>
              ) : (
                <>
                  <Target className="h-5 w-5" />
                  Adapter mon CV (2 tokens)
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Match Score */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
                <ScoreRing score={result.matchScore} label="Score de compatibilité" />
              </div>
              <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Conseil global
                </h3>
                <p className="text-gray-600 leading-relaxed">{result.globalAdvice}</p>
              </div>
            </div>

            {/* Keywords */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Mots-clés présents
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.presentKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Mots-clés manquants
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.missingKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Suggestions d&apos;amélioration
              </h3>
              <ul className="space-y-3">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-indigo-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Adapted CV */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowAdaptedCV(!showAdaptedCV)}
                className="flex w-full items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <span className="text-lg font-semibold text-gray-900">
                    CV adapté pour ce poste
                  </span>
                </div>
                {showAdaptedCV ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {showAdaptedCV && (
                <div className="border-t border-gray-100 p-6">
                  <div className="flex justify-end mb-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(result.adaptedCV);
                        toast.success("Copié !");
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copier
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans rounded-xl bg-gray-50 p-6">
                    {result.adaptedCV}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => { setResult(null); setJobDescription(""); setJobTitle(""); }}
              className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Nouveau matching
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
