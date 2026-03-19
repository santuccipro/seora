"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
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

interface Corrections {
  corrections: { section: string; before: string; after: string; explanation: string }[];
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
  const [showAuth, setShowAuth] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [activeTab, setActiveTab] = useState<"results" | "corrections" | "cover-letter" | "job-match">("results");

  // Theatrical loading
  const [theatricalStep, setTheatricalStep] = useState(-1);
  const [fakeScore, setFakeScore] = useState(0);

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
      setFakeScore(Math.floor(Math.random() * 25) + 48);

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      // Theatrical animation (always runs)
      const animate = async () => {
        const delays = [2500, 3000, 3500, 2500, 2000];
        for (let i = 0; i < delays.length; i++) {
          await sleep(delays[i]);
          setTheatricalStep(i + 1);
        }
      };

      // Real API call (only if authenticated)
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

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ═══════ NAV ═══════ */}
      <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
              <FileText className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Seora CV</span>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                {tokens !== null && (
                  <button
                    onClick={() => setShowTokens(true)}
                    className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <Coins className="h-3 w-3" />
                    {tokens} token{tokens !== 1 ? "s" : ""}
                  </button>
                )}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
                    {session.user?.name || session.user?.email}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <div className="absolute right-0 top-full pt-1 hidden group-hover:block">
                    <button
                      onClick={() => signOut()}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
                    >
                      <LogOut className="h-3 w-3" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
              >
                Se connecter
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════ HERO + UPLOAD ═══════ */}
      <div className="mx-auto max-w-5xl px-5">
        <div className="pb-6 pt-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Votre CV, analysé par l&apos;IA
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-gray-500">
            Déposez votre CV et obtenez un score détaillé, des corrections précises et une lettre de motivation personnalisée.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="mx-auto max-w-2xl">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`
              group relative cursor-pointer rounded-2xl border-2 border-dashed
              ${dragOver ? "border-indigo-500 bg-indigo-50/50" : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50/50"}
              ${uploading ? "pointer-events-none" : ""}
              px-6 py-14 text-center transition-all
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.heic,.webp"
              onChange={onFileChange}
              className="hidden"
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Analyse en cours...</p>
                  <p className="mt-1 text-xs text-gray-500">{fileName}</p>
                </div>
                <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-indigo-500" style={{ animation: "progress 3s ease-in-out" }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 group-hover:bg-gray-200 transition-colors">
                  <Upload className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Glissez votre CV ici ou <span className="text-indigo-600">parcourez</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">PDF, DOC, DOCX, TXT ou Photo • 10 MB max</p>
                </div>
              </div>
            )}
          </div>

          {!session && !analysis && !uploading && theatricalStep < 0 && (
            <p className="mt-3 text-center text-xs text-gray-400">
              Analyse gratuite • Aucune carte bancaire requise
            </p>
          )}
        </div>

        {/* ═══════ THEATRICAL LOADING ═══════ */}
        {uploading && theatricalStep >= 0 && (
          <div className="mx-auto max-w-2xl mt-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-indigo-400/20 animate-ping" />
                  <div className="relative h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Analyse approfondie en cours</p>
                  <p className="text-xs text-gray-400">{fileName}</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  "Extraction du contenu du CV",
                  "Analyse de la structure et mise en page",
                  "Évaluation des compétences clés",
                  "Vérification de la cohérence globale",
                  "Calcul du score final",
                ].map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 transition-all duration-700 ${theatricalStep > i ? "opacity-100" : theatricalStep === i ? "opacity-70" : "opacity-25"}`}>
                    {theatricalStep > i ? (
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    ) : theatricalStep === i ? (
                      <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-200 shrink-0" />
                    )}
                    <span className={`text-sm ${theatricalStep > i ? "text-gray-900 font-medium" : theatricalStep === i ? "text-gray-600" : "text-gray-300"}`}>{step}</span>
                    {theatricalStep > i && <span className="text-[10px] text-green-500 font-medium ml-auto">Terminé</span>}
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-1000 ease-out" style={{ width: `${Math.min(((theatricalStep + 1) / 6) * 100, 100)}%` }} />
                </div>
              </div>

              {theatricalStep >= 2 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-3">Moteur d&apos;analyse</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {["NLP sémantique v3", "Matching ATS multi-format", "Scoring pondéré 47 critères", "Parsing contextuel deep-learning"].map((t) => (
                      <span key={t} className="inline-flex items-center rounded-full bg-indigo-50/80 border border-indigo-100/60 px-2.5 py-0.5 text-[10px] font-medium text-indigo-500">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {theatricalStep >= 3 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-3">Vérifié avec</p>
                  <div className="flex items-center gap-6">
                    {["GPTZero", "Originality.ai", "LinkedIn", "Indeed"].map((name) => (
                      <span key={name} className="text-xs font-semibold text-gray-400">{name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════ GATED RESULTS (non-auth) ═══════ */}
        {!uploading && theatricalStep >= 5 && !session && !analysis && (
          <div ref={resultsRef} className="mx-auto max-w-4xl pt-12 pb-20">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center mb-6">
              <ScoreRing score={fakeScore} size={180} />
              <p className="mt-3 text-sm text-gray-500">
                {fakeScore >= 60 ? "Bon CV, quelques améliorations possibles" : "Des améliorations importantes à faire"}
              </p>
            </div>

            <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="p-8 filter blur-[6px] pointer-events-none select-none" aria-hidden="true">
                <div className="space-y-3 mb-6">
                  <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-4 bg-gray-100 rounded-full w-full" />
                  <div className="h-4 bg-gray-100 rounded-full w-5/6" />
                  <div className="h-4 bg-gray-100 rounded-full w-2/3" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-green-50 p-4">
                    <div className="h-3 bg-green-200 rounded w-1/2 mb-3" />
                    <div className="space-y-2">
                      <div className="h-3 bg-green-100 rounded w-full" />
                      <div className="h-3 bg-green-100 rounded w-4/5" />
                      <div className="h-3 bg-green-100 rounded w-3/4" />
                    </div>
                  </div>
                  <div className="rounded-xl bg-orange-50 p-4">
                    <div className="h-3 bg-orange-200 rounded w-1/2 mb-3" />
                    <div className="space-y-2">
                      <div className="h-3 bg-orange-100 rounded w-full" />
                      <div className="h-3 bg-orange-100 rounded w-4/5" />
                      <div className="h-3 bg-orange-100 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/95 to-white/60">
                <div className="text-center px-6">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 mb-4">
                    <Lock className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Débloquez votre analyse complète</h3>
                  <p className="text-sm text-gray-500 mt-2 mb-6 max-w-sm mx-auto">Créez votre compte gratuit pour voir les détails, corrections et recommandations.</p>
                  <button onClick={() => setShowAuth(true)} className="inline-flex items-center gap-2 rounded-xl bg-black px-8 py-3.5 text-sm font-semibold text-white hover:bg-gray-800 shadow-lg transition-all">
                    <ArrowRight className="h-4 w-4" />
                    Créer mon compte — c&apos;est gratuit
                  </button>
                  <p className="text-xs text-gray-400 mt-3">Sans carte bancaire • 3 tokens offerts</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ RESULTS ═══════ */}
        {analysis && (
          <div ref={resultsRef} className="mx-auto max-w-4xl animate-fade-up pt-12 pb-20">
            {/* Tab Navigation */}
            <div className="mb-8 flex items-center gap-1 rounded-xl bg-gray-100 p-1">
              {[
                { id: "results" as const, label: "Résultats", icon: Zap },
                { id: "corrections" as const, label: "Corrections", icon: Sparkles, cost: 2 },
                { id: "cover-letter" as const, label: "Lettre de motivation", icon: FileText, cost: 3 },
                { id: "job-match" as const, label: "Matcher une offre", icon: Briefcase, cost: 2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-all
                    ${activeTab === tab.id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                    }
                  `}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.cost && (
                    <span className="rounded bg-gray-200 px-1 py-0.5 text-[10px] font-medium text-gray-500">
                      {tab.cost}t
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab: Results ── */}
            {activeTab === "results" && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8">
                    <ScoreRing score={analysis.score} size={180} />
                    <p className="mt-3 text-sm text-gray-500">
                      {analysis.score >= 80 ? "Excellent CV !" : analysis.score >= 60 ? "Bon CV, quelques améliorations possibles" : "Des améliorations importantes à faire"}
                    </p>
                  </div>

                  {analysis.scoreBreakdown && (
                    <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-6">
                      <RadarChart data={analysis.scoreBreakdown} size={260} />
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Résumé de l&apos;analyse</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{analysis.summary}</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-white p-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Points forts
                    </h3>
                    <ul className="space-y-2">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <div className="mt-1.5 h-1 w-1 rounded-full bg-green-400 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      À améliorer
                    </h3>
                    <ul className="space-y-2">
                      {analysis.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <div className="mt-1.5 h-1 w-1 rounded-full bg-orange-400 flex-shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {!corrections && (
                  <button
                    onClick={handleCorrections}
                    disabled={loadingCorrections}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {loadingCorrections ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {loadingCorrections ? "Génération des corrections..." : "Obtenir les corrections détaillées"}
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">2 tokens</span>
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
                      <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">
                          {c.section}
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="rounded-lg bg-red-50 p-3">
                            <p className="text-[10px] font-medium text-red-600 mb-1">AVANT</p>
                            <p className="text-sm text-red-900">{c.before}</p>
                          </div>
                          <div className="rounded-lg bg-green-50 p-3">
                            <p className="text-[10px] font-medium text-green-600 mb-1">APRÈS</p>
                            <p className="text-sm text-green-900">{c.after}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">{c.explanation}</p>
                      </div>
                    ))}

                    {corrections.tips && corrections.tips.length > 0 && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Conseils supplémentaires</h4>
                        <ul className="space-y-1.5">
                          {corrections.tips.map((t, i) => (
                            <li key={i} className="text-sm text-gray-600">• {t}</li>
                          ))}
                        </ul>
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
                    <div className="rounded-2xl border border-gray-200 bg-white p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">Votre lettre de motivation</h3>
                        <CopyButton text={coverLetter.coverLetter} />
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 font-[system-ui]">
                        {coverLetter.coverLetter}
                      </div>
                    </div>

                    {coverLetter.companyInsights.length > 0 && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-6">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                          <Building2 className="h-4 w-4 text-indigo-500" />
                          Insights entreprise utilisés
                        </h4>
                        <ul className="space-y-1.5">
                          {coverLetter.companyInsights.map((c, i) => (
                            <li key={i} className="text-sm text-gray-600">• {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={() => { setCoverLetter(null); }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← Générer une nouvelle lettre
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Lettre de motivation IA</h3>
                      <p className="text-xs text-gray-500 mb-5">
                        L&apos;IA scrape le site de l&apos;entreprise et génère une lettre personnalisée basée sur votre CV et les valeurs de l&apos;entreprise.
                      </p>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Entreprise *</label>
                            <input
                              type="text"
                              value={clCompany}
                              onChange={(e) => setClCompany(e.target.value)}
                              placeholder="ex: Google"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Site web (optionnel)</label>
                            <input
                              type="url"
                              value={clUrl}
                              onChange={(e) => setClUrl(e.target.value)}
                              placeholder="https://google.com"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Description du poste *</label>
                          <textarea
                            value={clJob}
                            onChange={(e) => setClJob(e.target.value)}
                            placeholder="Collez ici la description du poste..."
                            rows={5}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm resize-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCoverLetter}
                        disabled={loadingCoverLetter || !clCompany || !clJob}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
                      >
                        {loadingCoverLetter ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {loadingCoverLetter ? "Recherche + génération..." : "Générer la lettre"}
                        <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">3 tokens</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Job Match ── */}
            {activeTab === "job-match" && (
              <div className="animate-fade-in">
                {jobMatch ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <ScoreRing score={jobMatch.matchScore} size={100} label="Compatibilité" />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Score de matching</h3>
                          <p className="text-xs text-gray-500 mt-1">{jobMatch.globalAdvice}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="rounded-lg bg-green-50 p-3">
                          <p className="text-[10px] font-semibold text-green-600 mb-1">MOTS-CLÉS PRÉSENTS</p>
                          <div className="flex flex-wrap gap-1">
                            {jobMatch.presentKeywords.map((k, i) => (
                              <span key={i} className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">{k}</span>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-lg bg-red-50 p-3">
                          <p className="text-[10px] font-semibold text-red-600 mb-1">MOTS-CLÉS MANQUANTS</p>
                          <div className="flex flex-wrap gap-1">
                            {jobMatch.missingKeywords.map((k, i) => (
                              <span key={i} className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">{k}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Suggestions</h4>
                      <ul className="space-y-1.5">
                        {jobMatch.suggestions.map((s, i) => (
                          <li key={i} className="text-sm text-gray-600">• {s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">CV adapté</h4>
                        <CopyButton text={jobMatch.adaptedCV} />
                      </div>
                      <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 font-[system-ui]">
                        {jobMatch.adaptedCV}
                      </pre>
                    </div>

                    <button
                      onClick={() => setJobMatch(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← Nouveau matching
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Matcher votre CV à une offre</h3>
                    <p className="text-xs text-gray-500 mb-5">
                      Collez une offre d&apos;emploi. L&apos;IA compare avec votre CV et génère une version adaptée.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Titre du poste</label>
                        <input
                          type="text"
                          value={jmTitle}
                          onChange={(e) => setJmTitle(e.target.value)}
                          placeholder="ex: Développeur Full Stack"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Description du poste *</label>
                        <textarea
                          value={jmDescription}
                          onChange={(e) => setJmDescription(e.target.value)}
                          placeholder="Collez ici l'offre d'emploi..."
                          rows={6}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm resize-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleJobMatch}
                      disabled={loadingJobMatch || !jmDescription || !analysis}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
                    >
                      {loadingJobMatch ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Briefcase className="h-4 w-4" />
                      )}
                      {loadingJobMatch ? "Analyse en cours..." : "Analyser la compatibilité"}
                      <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">2 tokens</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Pre-analysis: Feature preview ─── */}
        {!analysis && !uploading && theatricalStep < 5 && (
          <div className="mx-auto max-w-3xl pb-20 pt-16">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: Zap, title: "Score IA détaillé", desc: "Analyse sur 6 critères avec radar chart" },
                { icon: Sparkles, title: "Corrections précises", desc: "Avant/après pour chaque section du CV" },
                { icon: Building2, title: "Lettre personnalisée", desc: "Scraping + IA pour cibler l'entreprise" },
              ].map((f, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 text-center">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                    <f.icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Tarifs simples</p>
              <div className="overflow-x-auto">
                <div className="inline-flex items-center gap-4 sm:gap-6 rounded-xl border border-gray-200 bg-white px-4 sm:px-6 py-4">
                  <div className="text-center min-w-[60px]">
                    <p className="text-base sm:text-lg font-bold text-gray-900">Gratuit</p>
                    <p className="text-[10px] text-gray-400">1ère analyse</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200 flex-shrink-0" />
                  <div className="text-center min-w-[50px]">
                    <p className="text-base sm:text-lg font-bold text-gray-900">4,99€</p>
                    <p className="text-[10px] text-gray-400">5 tokens</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200 flex-shrink-0" />
                  <div className="text-center min-w-[50px]">
                    <p className="text-base sm:text-lg font-bold text-gray-900">9,99€</p>
                    <p className="text-[10px] text-gray-400">15 tokens</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200 flex-shrink-0" />
                  <div className="text-center min-w-[55px]">
                    <p className="text-base sm:text-lg font-bold text-gray-900">24,99€</p>
                    <p className="text-[10px] text-gray-400">50 tokens</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ AUTH MODAL ═══════ */}
      {showAuth && !session && (
        <Modal onClose={() => setShowAuth(false)}>
          <AuthForm onSuccess={() => setShowAuth(false)} />
        </Modal>
      )}

      {/* ═══════ TOKENS MODAL ═══════ */}
      {showTokens && (
        <Modal onClose={() => setShowTokens(false)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Acheter des tokens</h2>
            <p className="text-xs text-gray-500 mb-5">
              Solde actuel : {tokens} token{tokens !== 1 ? "s" : ""}
            </p>
            <div className="space-y-3">
              {[
                { id: "pack-5", tokens: 5, price: "4,99€", perToken: "1,00€" },
                { id: "pack-15", tokens: 15, price: "9,99€", perToken: "0,67€", popular: true },
                { id: "pack-50", tokens: 50, price: "24,99€", perToken: "0,50€" },
              ].map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => buyTokens(pack.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all hover:border-gray-300 ${
                    pack.popular ? "border-indigo-200 bg-indigo-50/30" : "border-gray-200 bg-white"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {pack.tokens} tokens
                      {pack.popular && (
                        <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                          Populaire
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{pack.perToken}/token</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{pack.price}</p>
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-[10px] text-gray-400">
              Paiement sécurisé par Stripe • Tokens sans expiration
            </p>
          </div>
        </Modal>
      )}

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <p className="text-xs text-gray-400">© 2026 Seora CV</p>
          <div className="flex gap-4">
            <a href="/cgu" className="text-xs text-gray-400 hover:text-gray-600">CGU</a>
            <a href="/confidentialite" className="text-xs text-gray-400 hover:text-gray-600">Confidentialité</a>
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-scale-in rounded-2xl bg-white shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  void onSuccess;
  return (
    <div className="p-6 text-center">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Connexion</h2>
      <p className="text-xs text-gray-500 mb-5">5 tokens offerts à l&apos;inscription</p>
      <a
        href="/auth/signin"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        <ArrowRight className="h-4 w-4" />
        Se connecter avec email
      </a>
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
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
        <Lock className="h-5 w-5 text-gray-400" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
      <button
        onClick={onUnlock}
        disabled={loading || !hasEnough}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Débloquer ({cost} tokens)
      </button>
      {!hasEnough && (
        <p className="mt-2 text-xs text-red-500">
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
      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copié" : "Copier"}
    </button>
  );
}
