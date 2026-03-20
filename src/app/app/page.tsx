"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { ScoreRing } from "@/components/charts/score-ring";
import { RadarChart } from "@/components/charts/radar-chart";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Lock,
  ChevronDown,
  LogOut,
  Coins,
  Zap,
  FileText,
  Briefcase,
  Building2,
  X,
  ArrowRight,
  Copy,
  Check,
  TrendingUp,
  BarChart3,
  Target,
} from "lucide-react";

/* ───────── Types ───────── */
interface Analysis {
  id: string;
  score: number;
  scoreBreakdown: Record<string, number>;
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

interface Correction {
  section: string;
  // API may return either naming convention
  before?: string; after?: string; explanation?: string;
  original?: string; suggestion?: string; reason?: string;
  priority?: string;
}

interface Corrections {
  corrections: Correction[];
  correctedCV: string;
  tips?: string[];
}

interface CoverLetterResult {
  coverLetter: string;
  tips: string[];
  companyInsights: string[];
}

interface JobMatchResult {
  matchScore: number;
  adaptedCV: string;
  suggestions: string[];
  missingKeywords: string[];
  presentKeywords: string[];
  globalAdvice: string;
}

/* ───────── Main Page ───────── */
export default function Home() {
  const { data: session } = useSession();

  // Core state
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tokens, setTokens] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");

  // Feature states
  const [corrections, setCorrections] = useState<Corrections | null>(null);
  const [loadingCorrections, setLoadingCorrections] = useState(false);
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(null);
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false);
  const [jobMatch, setJobMatch] = useState<JobMatchResult | null>(null);
  const [loadingJobMatch, setLoadingJobMatch] = useState(false);

  // UI state
  const [showTokens, setShowTokens] = useState(false);
  const [activeTab, setActiveTab] = useState<"results" | "corrections" | "cover-letter" | "job-match">("results");

  // Theatrical loading
  const [theatricalStep, setTheatricalStep] = useState(-1);

  // Cover letter form
  const [clCompany, setClCompany] = useState("");
  const [clUrl, setClUrl] = useState("");
  const [clJob, setClJob] = useState("");

  // Job match form
  const [jmTitle, setJmTitle] = useState("");
  const [jmDescription, setJmDescription] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fetch tokens when logged in
  useEffect(() => {
    if (session) {
      fetch("/api/tokens")
        .then((r) => r.json())
        .then((d) => setTokens(d.tokens))
        .catch(() => {});
    }
  }, [session]);

  /* ─── Upload CV ─── */
  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) return;

      setFileName(file.name);
      setUploading(true);
      setAnalysis(null);
      setCorrections(null);
      setCoverLetter(null);
      setJobMatch(null);
      setActiveTab("results");
      setTheatricalStep(0);

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      const animate = async () => {
        const delays = [2500, 3000, 3500, 2500, 2000];
        for (let i = 0; i < delays.length; i++) {
          await sleep(delays[i]);
          setTheatricalStep(i + 1);
        }
      };

      const callApi = async (): Promise<Analysis | null> => {
        if (!session) return null;
        const formData = new FormData();
        formData.append("cv", file);
        const res = await fetch("/api/analyze", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur lors de l'analyse");
        return data;
      };

      try {
        const [, apiResult] = await Promise.all([animate(), callApi()]);
        if (apiResult) {
          setAnalysis(apiResult);
          setTokens((t) => (t !== null ? t - 1 : null));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur réseau";
        toast.error(message);
        setTheatricalStep(-1);
      }

      setUploading(false);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    },
    [session]
  );

  // Auto-process file from landing page sessionStorage
  const hasAutoProcessed = useRef(false);
  useEffect(() => {
    if (hasAutoProcessed.current) return;
    const dataUrl = sessionStorage.getItem("seora_cv_file");
    const name = sessionStorage.getItem("seora_cv_filename");
    if (dataUrl && name) {
      hasAutoProcessed.current = true;
      sessionStorage.removeItem("seora_cv_file");
      sessionStorage.removeItem("seora_cv_filename");
      fetch(dataUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const file = new File([blob], name, { type: blob.type || "application/pdf" });
          handleUpload(file);
        });
    }
  }, [handleUpload]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  /* ─── Get Corrections ─── */
  const handleCorrections = async () => {
    if (!analysis) return;
    setLoadingCorrections(true);
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: analysis.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      setCorrections(data);
      setTokens((t) => (t !== null ? t - 2 : null));
      setActiveTab("corrections");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoadingCorrections(false);
    }
  };

  /* ─── Generate Cover Letter ─── */
  const handleCoverLetter = async () => {
    if (!clCompany || !clJob) {
      toast.error("Remplissez le nom de l'entreprise et la description du poste");
      return;
    }
    setLoadingCoverLetter(true);
    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvAnalysisId: analysis?.id,
          companyName: clCompany,
          companyUrl: clUrl,
          jobDescription: clJob,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      setCoverLetter(data);
      setTokens((t) => (t !== null ? t - 3 : null));
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoadingCoverLetter(false);
    }
  };

  /* ─── Job Match ─── */
  const handleJobMatch = async () => {
    if (!analysis || !jmDescription) {
      toast.error("Uploadez un CV et remplissez la description du poste");
      return;
    }
    setLoadingJobMatch(true);
    try {
      const res = await fetch("/api/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvAnalysisId: analysis.id,
          jobTitle: jmTitle,
          jobDescription: jmDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      setJobMatch(data);
      setTokens((t) => (t !== null ? t - 2 : null));
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoadingJobMatch(false);
    }
  };

  /* ─── Buy Tokens ─── */
  const buyTokens = async (packId: string) => {
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error("Erreur lors de l'achat");
    }
  };

  const theatricalSteps = [
    "Extraction du contenu du CV",
    "Analyse de la structure et mise en page",
    "Évaluation des compétences clés",
    "Vérification de la cohérence globale",
    "Calcul du score final",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
      {/* ═══════ NAV ═══════ */}
      <nav className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20">
              <BarChart3 className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Seora</span>
          </a>

          <div className="flex items-center gap-3">
            {session && (
              <>
                {tokens !== null && (
                  <button
                    onClick={() => setShowTokens(true)}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/60 px-4 py-2 text-xs font-semibold text-indigo-700 hover:shadow-md transition-all"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    {tokens} token{tokens !== 1 ? "s" : ""}
                  </button>
                )}
                {/* TEMPORARY BYPASS - DELETE BEFORE PRODUCTION */}
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/bypass-tokens", { method: "POST" });
                      const data = await res.json();
                      if (res.ok) {
                        setTokens(data.tokens);
                        toast.success(data.message);
                      } else {
                        toast.error(data.error || "Erreur");
                      }
                    } catch {
                      toast.error("Erreur réseau");
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-2 text-[10px] font-bold text-white shadow-sm hover:shadow-md transition-all"
                >
                  <Zap className="h-3 w-3" />
                  +5 tokens
                </button>
                <div className="relative group">
                  <button className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {(session.user?.name || session.user?.email || "U")[0].toUpperCase()}
                    </div>
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                  </button>
                  <div className="absolute right-0 top-full pt-2 hidden group-hover:block">
                    <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-xl shadow-gray-200/50 min-w-[160px]">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-900 truncate">{session.user?.email}</p>
                      </div>
                      <button
                        onClick={() => signOut()}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 mt-1"
                      >
                        <LogOut className="h-3 w-3" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5">
        {/* ═══════ HERO + UPLOAD ═══════ */}
        <div className="pt-12 pb-4">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100/60 px-4 py-1.5 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-600">Analyse IA en temps réel</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              Analyse ton CV
            </h1>
            <p className="mt-3 text-base text-gray-500">
              Upload ton CV et obtiens un score détaillé, des corrections et une lettre de motivation personnalisée.
            </p>
          </div>

          {/* Upload Zone */}
          <div className="mx-auto max-w-xl">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`
                group relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300
                ${dragOver
                  ? "border-indigo-500 bg-indigo-50/60 scale-[1.02]"
                  : "border-gray-200 bg-white/60 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-lg hover:shadow-indigo-100/50"
                }
                ${uploading ? "pointer-events-none" : ""}
                px-6 py-10 text-center backdrop-blur-sm
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,image/*"
                onChange={onFileChange}
                className="hidden"
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-indigo-400/20 animate-ping" />
                    <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Analyse en cours...</p>
                    <p className="mt-0.5 text-xs text-gray-400">{fileName}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 group-hover:scale-110 transition-transform">
                    <Upload className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Glisse ton CV ici ou <span className="text-indigo-600 font-semibold">parcourir</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-400">PDF, DOCX, TXT ou Photo • 10 MB max</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════ THEATRICAL LOADING ═══════ */}
        {uploading && theatricalStep >= 0 && (
          <div className="mx-auto max-w-xl mt-6 animate-fade-up">
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-xl shadow-gray-200/30">
              <div className="space-y-3">
                {theatricalSteps.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 transition-all duration-500 ${
                      theatricalStep > i ? "opacity-100" : theatricalStep === i ? "opacity-80" : "opacity-20"
                    }`}
                  >
                    {theatricalStep > i ? (
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    ) : theatricalStep === i ? (
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0 shadow-sm">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full border-2 border-gray-200 shrink-0" />
                    )}
                    <span className={`text-sm ${
                      theatricalStep > i ? "text-gray-900 font-medium" : theatricalStep === i ? "text-indigo-700 font-medium" : "text-gray-300"
                    }`}>
                      {step}
                    </span>
                    {theatricalStep > i && (
                      <span className="ml-auto text-[10px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Terminé
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(((theatricalStep + 1) / 6) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ RESULTS ═══════ */}
        {analysis && (
          <div ref={resultsRef} className="mx-auto max-w-5xl animate-fade-up pt-8 pb-20">
            {/* Tab Navigation */}
            <div className="mb-8 flex items-center gap-1.5 rounded-2xl bg-gray-100/80 p-1.5 backdrop-blur-sm">
              {[
                { id: "results" as const, label: "Résultats", icon: Zap },
                { id: "corrections" as const, label: "Corrections", icon: Sparkles, cost: 2 },
                { id: "cover-letter" as const, label: "Lettre", icon: FileText, cost: 3 },
                { id: "job-match" as const, label: "Matcher", icon: Target, cost: 2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-xs font-semibold transition-all
                    ${activeTab === tab.id
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200/50"
                      : "text-gray-500 hover:text-gray-700"
                    }
                  `}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.cost && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                      activeTab === tab.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-200/80 text-gray-400"
                    }`}>
                      {tab.cost}t
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab: Results ── */}
            {activeTab === "results" && (
              <div className="space-y-6 animate-fade-in">
                {/* Score + Radar */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-8 shadow-sm">
                    <ScoreRing score={analysis.score} size={180} />
                    <p className="mt-4 text-sm font-medium text-gray-600">
                      {analysis.score >= 80
                        ? "Excellent CV !"
                        : analysis.score >= 60
                        ? "Bon CV, quelques améliorations possibles"
                        : "Des améliorations importantes à faire"}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="text-xs text-indigo-600 font-medium">Seora peut booster ton score à 90+</span>
                    </div>
                  </div>

                  {analysis.scoreBreakdown && (
                    <div className="flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm">
                      <RadarChart data={analysis.scoreBreakdown} size={260} />
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    Résumé de l&apos;analyse
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">{analysis.summary}</p>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-200/40 p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
                      <div className="h-6 w-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      Points forts
                    </h3>
                    <ul className="space-y-2.5">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-amber-50/80 to-white border border-amber-200/40 p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
                      <div className="h-6 w-6 rounded-lg bg-amber-100 flex items-center justify-center">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      À améliorer
                    </h3>
                    <ul className="space-y-2.5">
                      {analysis.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA: Get corrections */}
                {!corrections && (
                  <button
                    onClick={handleCorrections}
                    disabled={loadingCorrections}
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:opacity-95 disabled:opacity-50 transition-all"
                  >
                    {loadingCorrections ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {loadingCorrections ? "Génération des corrections..." : "Obtenir les corrections détaillées"}
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">2 tokens</span>
                  </button>
                )}
              </div>
            )}

            {/* ── Tab: Corrections ── */}
            {activeTab === "corrections" && (
              <div className="animate-fade-in">
                {corrections ? (
                  <div className="space-y-4">
                    {corrections.corrections.map((c, i) => (
                      <div key={i} className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm">
                        <h4 className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-4">
                          {c.section}
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="rounded-xl bg-red-50/80 border border-red-100/60 p-4">
                            <p className="text-[10px] font-bold text-red-500 mb-1.5 uppercase tracking-wider">Avant</p>
                            <p className="text-sm text-red-900/80 leading-relaxed">{c.before || c.original || "—"}</p>
                          </div>
                          <div className="rounded-xl bg-emerald-50/80 border border-emerald-100/60 p-4">
                            <p className="text-[10px] font-bold text-emerald-500 mb-1.5 uppercase tracking-wider">Après</p>
                            <p className="text-sm text-emerald-900/80 leading-relaxed">{c.after || c.suggestion || "—"}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500 leading-relaxed">{c.explanation || c.reason || ""}</p>
                        {c.priority && (
                          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            c.priority === "haute" ? "bg-red-100 text-red-600" :
                            c.priority === "moyenne" ? "bg-amber-100 text-amber-600" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            Priorité {c.priority}
                          </span>
                        )}
                      </div>
                    ))}

                    {corrections.tips && corrections.tips.length > 0 && (
                      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                          <Sparkles className="h-4 w-4 text-indigo-500" />
                          Conseils supplémentaires
                        </h4>
                        <ul className="space-y-2">
                          {corrections.tips.map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* CTA: Open CV Editor */}
                    {analysis && (
                      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-center shadow-lg">
                        <h4 className="text-lg font-bold text-white mb-2">Recrée ton CV optimisé</h4>
                        <p className="text-sm text-indigo-100 mb-4">
                          L&apos;IA reconstruit ton CV avec un design professionnel. Tu pourras modifier le texte, ajouter ta photo et exporter en PDF.
                        </p>
                        <button
                          onClick={() => window.location.href = `/cv-editor?id=${analysis.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-600 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                        >
                          <FileText className="h-4 w-4" />
                          Ouvrir l&apos;Éditeur de CV
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">2 tokens</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <LockedFeature
                    title="Corrections détaillées"
                    description="Obtenez des corrections section par section avec avant/après pour chaque amélioration."
                    cost={2}
                    loading={loadingCorrections}
                    onUnlock={handleCorrections}
                    tokens={tokens}
                  />
                )}
              </div>
            )}

            {/* ── Tab: Cover Letter ── */}
            {activeTab === "cover-letter" && (
              <div className="animate-fade-in">
                {coverLetter ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                          <FileText className="h-4 w-4 text-indigo-500" />
                          Ta lettre de motivation
                        </h3>
                        <CopyButton text={coverLetter.coverLetter} />
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 font-[system-ui] bg-gray-50/50 rounded-xl p-5 border border-gray-100">
                        {coverLetter.coverLetter}
                      </div>
                    </div>

                    {coverLetter.companyInsights.length > 0 && (
                      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                          <Building2 className="h-4 w-4 text-indigo-500" />
                          Insights entreprise utilisés
                        </h4>
                        <ul className="space-y-2">
                          {coverLetter.companyInsights.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={() => setCoverLetter(null)}
                      className="text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium"
                    >
                      ← Générer une nouvelle lettre
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Lettre de motivation IA</h3>
                        <p className="text-xs text-gray-500">
                          L&apos;IA scrape le site de l&apos;entreprise et génère une lettre personnalisée.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Entreprise *</label>
                          <input
                            type="text"
                            value={clCompany}
                            onChange={(e) => setClCompany(e.target.value)}
                            placeholder="ex: Google"
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Site web (optionnel)</label>
                          <input
                            type="url"
                            value={clUrl}
                            onChange={(e) => setClUrl(e.target.value)}
                            placeholder="https://google.com"
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Description du poste *</label>
                        <textarea
                          value={clJob}
                          onChange={(e) => setClJob(e.target.value)}
                          placeholder="Collez ici la description du poste..."
                          rows={5}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm resize-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCoverLetter}
                      disabled={loadingCoverLetter || !clCompany || !clJob}
                      className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 disabled:opacity-40 transition-all"
                    >
                      {loadingCoverLetter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {loadingCoverLetter ? "Recherche + génération..." : "Générer la lettre"}
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">3 tokens</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Job Match ── */}
            {activeTab === "job-match" && (
              <div className="animate-fade-in">
                {jobMatch ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm">
                      <div className="flex items-center gap-5 mb-5">
                        <ScoreRing score={jobMatch.matchScore} size={100} label="Compatibilité" />
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Score de matching</h3>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{jobMatch.globalAdvice}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-emerald-50/80 border border-emerald-100/60 p-4">
                          <p className="text-[10px] font-bold text-emerald-600 mb-2 uppercase tracking-wider">Mots-clés présents</p>
                          <div className="flex flex-wrap gap-1.5">
                            {jobMatch.presentKeywords.map((k, i) => (
                              <span key={i} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">{k}</span>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl bg-red-50/80 border border-red-100/60 p-4">
                          <p className="text-[10px] font-bold text-red-600 mb-2 uppercase tracking-wider">Mots-clés manquants</p>
                          <div className="flex flex-wrap gap-1.5">
                            {jobMatch.missingKeywords.map((k, i) => (
                              <span key={i} className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">{k}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        Suggestions
                      </h4>
                      <ul className="space-y-2">
                        {jobMatch.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-gray-900">CV adapté</h4>
                        <CopyButton text={jobMatch.adaptedCV} />
                      </div>
                      <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 font-[system-ui] bg-gray-50/50 rounded-xl p-5 border border-gray-100">
                        {jobMatch.adaptedCV}
                      </pre>
                    </div>

                    <button onClick={() => setJobMatch(null)} className="text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium">
                      ← Nouveau matching
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 flex items-center justify-center">
                        <Target className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Matcher ton CV à une offre</h3>
                        <p className="text-xs text-gray-500">Colle une offre d&apos;emploi et l&apos;IA adapte ton CV.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Titre du poste</label>
                        <input
                          type="text"
                          value={jmTitle}
                          onChange={(e) => setJmTitle(e.target.value)}
                          placeholder="ex: Développeur Full Stack"
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Description du poste *</label>
                        <textarea
                          value={jmDescription}
                          onChange={(e) => setJmDescription(e.target.value)}
                          placeholder="Collez ici l'offre d'emploi..."
                          rows={6}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm resize-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleJobMatch}
                      disabled={loadingJobMatch || !jmDescription || !analysis}
                      className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 disabled:opacity-40 transition-all"
                    >
                      {loadingJobMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
                      {loadingJobMatch ? "Analyse en cours..." : "Analyser la compatibilité"}
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">2 tokens</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Pre-analysis: empty state ─── */}
        {!analysis && !uploading && theatricalStep < 0 && (
          <div className="mx-auto max-w-3xl pb-20 pt-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: Zap, title: "Score détaillé", desc: "Analyse sur 6 critères avec radar chart", color: "from-amber-400 to-orange-500" },
                { icon: Sparkles, title: "Corrections IA", desc: "Avant/après pour chaque section du CV", color: "from-indigo-400 to-purple-500" },
                { icon: Building2, title: "Lettre perso", desc: "Scraping + IA ciblant l'entreprise", color: "from-emerald-400 to-teal-500" },
              ].map((f, i) => (
                <div key={i} className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-lg`}>
                    <f.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════ TOKENS MODAL ═══════ */}
      {showTokens && (
        <Modal onClose={() => setShowTokens(false)}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Coins className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Acheter des tokens</h2>
                <p className="text-xs text-gray-500">Solde actuel : <span className="font-semibold text-indigo-600">{tokens} token{tokens !== 1 ? "s" : ""}</span></p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { id: "pack-5", tokens: 5, price: "4,99€", perToken: "1,00€" },
                { id: "pack-15", tokens: 15, price: "9,99€", perToken: "0,67€", popular: true },
                { id: "pack-50", tokens: 50, price: "24,99€", perToken: "0,50€" },
              ].map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => buyTokens(pack.id)}
                  className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                    pack.popular ? "border-indigo-300 bg-gradient-to-r from-indigo-50/50 to-purple-50/50" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {pack.tokens} tokens
                      {pack.popular && (
                        <span className="ml-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          Populaire
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{pack.perToken}/token</p>
                  </div>
                  <p className="text-xl font-extrabold text-gray-900">{pack.price}</p>
                </button>
              ))}
            </div>
            <p className="mt-5 text-center text-[10px] text-gray-400">
              Paiement sécurisé par Stripe • Tokens sans expiration
            </p>
          </div>
        </Modal>
      )}

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-gray-200/60 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <p className="text-xs text-gray-400">© 2026 Seora CV</p>
          <div className="flex gap-5">
            <a href="/cgu" className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">CGU</a>
            <a href="/confidentialite" className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">Confidentialité</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════ COMPONENTS ═══════ */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md animate-scale-in rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-white/20">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function LockedFeature({
  title,
  description,
  cost,
  loading,
  onUnlock,
  tokens,
}: {
  title: string;
  description: string;
  cost: number;
  loading: boolean;
  onUnlock: () => void;
  tokens: number | null;
}) {
  const hasEnough = tokens !== null && tokens >= cost;

  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200/60">
        <Lock className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="mt-4 text-base font-bold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm text-gray-500">{description}</p>
      <button
        onClick={onUnlock}
        disabled={loading || !hasEnough}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 disabled:opacity-40 transition-all"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Débloquer ({cost} tokens)
      </button>
      {!hasEnough && (
        <p className="mt-3 text-xs text-red-500 font-medium">
          Pas assez de tokens ({tokens ?? 0}/{cost})
        </p>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copié !" : "Copier"}
    </button>
  );
}
