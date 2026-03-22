"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { ScoreRing } from "@/components/charts/score-ring";
import { RadarChart } from "@/components/charts/radar-chart";
import { toast } from "sonner";
import Link from "next/link";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Lock,
  LogOut,
  Coins,
  Zap,
  FileText,
  Briefcase,
  X,
  ArrowRight,
  Copy,
  Check,
  BarChart3,
  Target,
  PenTool,
  Palette,
  Gift,
  Plus,
  Camera,
  ChevronRight,
  History,
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

interface DashboardData {
  user: {
    name: string | null;
    email: string;
    tokens: number;
    createdAt: string;
    referralCode: string | null;
    totalReferrals: number;
  };
  stats: {
    totalAnalyses: number;
    totalCoverLetters: number;
    totalJobMatches: number;
    avgScore: number;
    bestScore: number;
    totalTokensSpent: number;
  };
  recentActivity: {
    id: string;
    type: "cv" | "cover-letter" | "job-match";
    title: string;
    score: number | null;
    date: string;
  }[];
  recentPurchases: {
    id: string;
    amount: number;
    price: number;
    createdAt: string;
  }[];
}


/* ───────── Main Page ───────── */
export default function Home() {
  const { data: session } = useSession();

  // Dashboard data
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

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
  const [theatricalStep, setTheatricalStep] = useState(-1);
  const [activeSection, setActiveSection] = useState<"dashboard" | "analysis">("dashboard");

  // Cover letter form
  const [clCompany, setClCompany] = useState("");
  const [clUrl, setClUrl] = useState("");
  const [clJob, setClJob] = useState("");

  // Job match form
  const [jmTitle, setJmTitle] = useState("");
  const [jmDescription, setJmDescription] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while uploading
  useEffect(() => {
    if (theatricalStep >= 0 && uploading) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
    document.body.style.overflow = "";
  }, [theatricalStep, uploading]);

  // Fetch dashboard data
  useEffect(() => {
    if (session) {
      Promise.all([
        fetch("/api/dashboard").then(r => r.json()),
        fetch("/api/tokens").then(r => r.json()),
      ]).then(([dashData, tokData]) => {
        if (dashData && !dashData.error) setDashboard(dashData);
        if (tokData) setTokens(tokData.tokens);
      }).catch(() => {}).finally(() => setLoadingDashboard(false));
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
      setActiveSection("analysis");
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
        setActiveSection("dashboard");
      }

      setUploading(false);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    },
    [session]
  );

  // Auto-process file from landing page
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
      if (!res.ok) { toast.error(data.error || "Erreur"); return; }
      setCorrections(data);
      setTokens((t) => (t !== null ? t - 2 : null));
      setActiveTab("corrections");
    } catch { toast.error("Erreur réseau"); }
    finally { setLoadingCorrections(false); }
  };

  /* ─── Cover Letter ─── */
  const handleCoverLetter = async () => {
    if (!analysis) { toast.error("Analysez d'abord votre CV"); return; }
    if (!clCompany || !clJob) { toast.error("Remplissez le nom de l'entreprise et la description du poste"); return; }
    setLoadingCoverLetter(true);
    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvAnalysisId: analysis?.id, companyName: clCompany, companyUrl: clUrl, jobDescription: clJob }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur"); return; }
      setCoverLetter(data);
      setTokens((t) => (t !== null ? t - 3 : null));
    } catch { toast.error("Erreur réseau"); }
    finally { setLoadingCoverLetter(false); }
  };

  /* ─── Job Match ─── */
  const handleJobMatch = async () => {
    if (!analysis || !jmDescription) { toast.error("Uploadez un CV et remplissez la description du poste"); return; }
    setLoadingJobMatch(true);
    try {
      const res = await fetch("/api/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvAnalysisId: analysis.id, jobTitle: jmTitle, jobDescription: jmDescription }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur"); return; }
      setJobMatch(data);
      setTokens((t) => (t !== null ? t - 2 : null));
    } catch { toast.error("Erreur réseau"); }
    finally { setLoadingJobMatch(false); }
  };

  /* ─── Buy Tokens ─── */
  const buyTokens = async (packId: string) => {
    try {
      const res = await fetch("/api/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packId }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { toast.error("Erreur lors de l'achat"); }
  };

  const theatricalSteps = [
    "Extraction du contenu du CV",
    "Analyse de la structure et mise en page",
    "Évaluation des compétences clés",
    "Vérification de la cohérence globale",
    "Calcul du score final",
  ];

  const firstName = session?.user?.name?.split(" ")[0] || session?.user?.email?.split("@")[0] || "toi";

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case "cv": return <BarChart3 className="h-3.5 w-3.5" />;
      case "cover-letter": return <PenTool className="h-3.5 w-3.5" />;
      case "job-match": return <Target className="h-3.5 w-3.5" />;
      default: return <FileText className="h-3.5 w-3.5" />;
    }
  };

  const activityColor = (type: string) => {
    switch (type) {
      case "cv": return "bg-indigo-100 text-indigo-600";
      case "cover-letter": return "bg-blue-100 text-blue-600";
      case "job-match": return "bg-emerald-100 text-emerald-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const activityLabel = (type: string) => {
    switch (type) {
      case "cv": return "Analyse CV";
      case "cover-letter": return "Lettre";
      case "job-match": return "Job Match";
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-mesh">
      {/* ═══════ NAV ═══════ */}
      <nav className="sticky top-0 z-50 border-b border-gray-200/40 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">Seora</span>
          </a>

          <div className="flex items-center gap-2">
            {session && (
              <>
                {tokens !== null && (
                  <button
                    onClick={() => setShowTokens(true)}
                    className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-all"
                  >
                    <Coins className="h-3 w-3" />
                    {tokens} tokens
                  </button>
                )}
                <div className="relative group">
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                    {(session.user?.name || session.user?.email || "U")[0].toUpperCase()}
                  </button>
                  <div className="absolute right-0 top-full pt-2 hidden group-hover:block">
                    <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-xl min-w-[160px]">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-900 truncate">{session.user?.email}</p>
                      </div>
                      <button onClick={() => signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 mt-1">
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

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">

        {/* ═══════ DASHBOARD VIEW ═══════ */}
        {activeSection === "dashboard" && (
          <div className="animate-fade-up pt-6 sm:pt-8">

            {/* ─── Welcome row ─── */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                  Salut {firstName}
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {(dashboard?.stats.totalAnalyses ?? 0) === 0
                    ? "Prêt à optimiser ta candidature ?"
                    : `${dashboard?.stats.totalAnalyses} analyse${(dashboard?.stats.totalAnalyses ?? 0) > 1 ? "s" : ""} — score moyen de ${dashboard?.stats.avgScore || "—"}/100`}
                </p>
              </div>
              <button
                onClick={() => setShowTokens(true)}
                className="flex items-center gap-2.5 glass-strong rounded-2xl px-4 py-2.5 border border-gray-200/60 hover:shadow-md transition-all group"
              >
                <div className="h-8 w-8 rounded-lg brand-gradient flex items-center justify-center">
                  <Coins className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-extrabold text-gray-900 leading-none">{tokens ?? "..."}</p>
                  <p className="text-[10px] text-gray-400 font-medium">tokens</p>
                </div>
              </button>
            </div>

            {/* ─── Bento grid — 4 tools ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5" style={{ gridTemplateRows: "1fr 1fr" }}>

              {/* Analyser — tall, spans 2 rows */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group cursor-pointer row-span-2 rounded-2xl sm:rounded-3xl p-5 sm:p-6 transition-all relative overflow-hidden ${
                  dragOver
                    ? "brand-gradient shadow-2xl shadow-indigo-500/30 scale-[1.02]"
                    : "brand-gradient shadow-lg shadow-indigo-500/15 hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-[1.01]"
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,image/*" onChange={onFileChange} className="hidden" />
                <div className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-white/[0.07]" />
                <div className="absolute top-16 -right-4 h-20 w-20 rounded-full bg-white/[0.05]" />
                <div className="absolute top-3.5 right-3.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white/80">1 token</div>

                <div className="relative flex flex-col h-full">
                  <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center mb-auto group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                  <div className="mt-6">
                    <p className="text-lg sm:text-xl font-extrabold text-white leading-tight">Analyser<br/>mon CV</p>
                    <p className="text-[11px] text-white/50 mt-2">Glisse ton fichier ou clique</p>
                    <p className="text-[10px] text-white/30 mt-0.5">PDF, DOCX, Photo</p>
                  </div>
                </div>
              </div>

              {/* Créer mon CV */}
              <Link
                href="/cv-editor"
                className="group rounded-2xl sm:rounded-3xl glass-strong border border-gray-200/60 p-4 sm:p-5 hover:shadow-lg hover:border-indigo-200/60 hover:scale-[1.02] transition-all relative overflow-hidden"
              >
                <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-indigo-500/[0.04]" />
                <div className="absolute top-3 right-3 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-500">2 tokens</div>
                <div className="relative">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="h-4 w-4 text-indigo-600" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">Créer mon CV</p>
                  <p className="text-[10px] text-gray-400 mt-1">6 templates pro</p>
                </div>
              </Link>

              {/* Lettre de motivation */}
              <Link
                href="/cover-letter"
                className="group rounded-2xl sm:rounded-3xl glass-strong border border-gray-200/60 p-4 sm:p-5 hover:shadow-lg hover:border-indigo-200/60 hover:scale-[1.02] transition-all relative overflow-hidden"
              >
                <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-purple-500/[0.04]" />
                <div className="absolute top-3 right-3 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-500">3 tokens</div>
                <div className="relative">
                  <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <PenTool className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">Lettre de motivation</p>
                  <p className="text-[10px] text-gray-400 mt-1">IA sur-mesure</p>
                </div>
              </Link>

              {/* Photo Pro — wide, col-span-2 */}
              <div className="rounded-2xl sm:rounded-3xl glass-strong border border-gray-200/60 p-4 sm:p-5 relative overflow-hidden opacity-60 col-span-2 sm:col-span-2 cursor-default">
                <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-gray-500/[0.04]" />
                <div className="absolute top-3 right-3 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">Bientôt</div>
                <div className="relative flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Camera className="h-4 w-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-tight">Photo Pro IA</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Selfie → photo professionnelle pour ton CV</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Activity feed ─── */}
            <div className="mt-7">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900">Historique</h2>
                {dashboard?.recentActivity && dashboard.recentActivity.length > 0 && (
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{dashboard.recentActivity.length} résultat{dashboard.recentActivity.length > 1 ? "s" : ""}</span>
                )}
              </div>

              {loadingDashboard ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                </div>
              ) : dashboard?.recentActivity && dashboard.recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.recentActivity.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={item.type === "cv" ? `/analyse/${item.id}` : "#"}
                      className="group flex items-center gap-3.5 rounded-2xl glass-strong border border-gray-200/60 px-4 py-3.5 hover:shadow-md hover:border-indigo-200/60 transition-all"
                    >
                      <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        {activityIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{activityLabel(item.type)} · {formatDate(item.date)}</p>
                      </div>
                      {item.score !== null && item.score !== undefined && (
                        <div className="text-right">
                          <p className={`text-base font-extrabold ${item.score >= 80 ? "text-indigo-600" : item.score >= 60 ? "text-indigo-400" : "text-gray-400"}`}>
                            {item.score}
                          </p>
                          <p className="text-[9px] text-gray-300 font-medium">/100</p>
                        </div>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl glass-strong border border-gray-200/60 py-14 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                    <History className="h-5 w-5 text-indigo-300" />
                  </div>
                  <p className="text-sm font-bold text-gray-500">Aucune activité</p>
                  <p className="text-xs text-gray-400 mt-1">Analyse ton premier CV pour commencer</p>
                </div>
              )}
            </div>

            {/* ─── Referral strip ─── */}
            {dashboard?.user.referralCode && (
              <div className="mt-4 mb-6 rounded-2xl glass-strong border border-gray-200/60 p-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-lg brand-gradient flex items-center justify-center shrink-0">
                  <Gift className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">Parrainage · <span className="text-indigo-500">+2 tokens</span></p>
                  <p className="text-[10px] text-gray-400">{dashboard.user.totalReferrals} invité{dashboard.user.totalReferrals !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <code className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-600">{dashboard.user.referralCode}</code>
                  <CopyButton text={dashboard.user.referralCode} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════ ANALYSIS VIEW (when uploading/viewing results) ═══════ */}
        {activeSection === "analysis" && (
          <div className="animate-fade-up">
            {/* Back button */}
            <button
              onClick={() => { setActiveSection("dashboard"); setAnalysis(null); setTheatricalStep(-1); }}
              className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Retour au dashboard
            </button>

            {/* Theatrical loading */}
            {uploading && theatricalStep >= 0 && (
              <div className="mt-4 animate-fade-up">
                <div className="rounded-2xl bg-white border border-gray-200/60 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-indigo-400/20 animate-ping" />
                      <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Analyse en cours...</p>
                      <p className="text-xs text-gray-400">{fileName}</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {theatricalSteps.map((step, i) => (
                      <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${theatricalStep > i ? "opacity-100" : theatricalStep === i ? "opacity-80" : "opacity-20"}`}>
                        {theatricalStep > i ? (
                          <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          </div>
                        ) : theatricalStep === i ? (
                          <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                            <Loader2 className="h-3 w-3 animate-spin text-white" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-gray-200 shrink-0" />
                        )}
                        <span className={`text-sm ${theatricalStep > i ? "text-gray-900 font-medium" : theatricalStep === i ? "text-indigo-700 font-medium" : "text-gray-300"}`}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${Math.min(((theatricalStep + 1) / 6) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {analysis && (
              <div ref={resultsRef} className="animate-fade-up pt-4">
                {/* Tab Navigation */}
                <div className="mb-6 flex items-center gap-1 rounded-2xl bg-gray-100/80 p-1">
                  {[
                    { id: "results" as const, label: "Résultats", icon: Zap },
                    { id: "corrections" as const, label: "Corrections", icon: Sparkles, cost: 2 },
                    { id: "cover-letter" as const, label: "Lettre", icon: FileText, cost: 3 },
                    { id: "job-match" as const, label: "Matcher", icon: Target, cost: 2 },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all ${
                        activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.cost && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${activeTab === tab.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-200/80 text-gray-400"}`}>
                          {tab.cost}t
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* ── Tab: Results ── */}
                {activeTab === "results" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
                        <ScoreRing score={analysis.score} size={160} />
                        <p className="mt-3 text-sm font-medium text-gray-600">
                          {analysis.score >= 80 ? "Excellent CV !" : analysis.score >= 60 ? "Bon CV, quelques améliorations" : "Des améliorations à faire"}
                        </p>
                      </div>
                      {analysis.scoreBreakdown && (
                        <div className="flex items-center justify-center rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                          <RadarChart data={analysis.scoreBreakdown} size={240} />
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                        <BarChart3 className="h-4 w-4 text-indigo-500" />
                        Résumé
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{analysis.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100 p-5">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Points forts
                        </h3>
                        <ul className="space-y-2">
                          {analysis.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl bg-amber-50/60 border border-amber-100 p-5">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          À améliorer
                        </h3>
                        <ul className="space-y-2">
                          {analysis.weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {!corrections && (
                        <button
                          onClick={handleCorrections}
                          disabled={loadingCorrections}
                          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-[0.98]"
                        >
                          {loadingCorrections ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          Corrections détaillées
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">2t</span>
                        </button>
                      )}
                      <button
                        onClick={() => window.location.href = `/cv-editor?id=${analysis.id}`}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                      >
                        <Palette className="h-4 w-4" />
                        Éditeur de CV
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">2t</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Tab: Corrections ── */}
                {activeTab === "corrections" && (
                  <div className="animate-fade-in">
                    {corrections ? (
                      <div className="space-y-4">
                        {corrections.corrections.map((c, i) => (
                          <div key={i} className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-3">
                              {c.section}
                            </span>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="rounded-xl bg-red-50 border border-red-100 p-3.5">
                                <p className="text-[10px] font-bold text-red-500 mb-1 uppercase">Avant</p>
                                <p className="text-sm text-red-900/80 leading-relaxed">{c.before || c.original || "—"}</p>
                              </div>
                              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
                                <p className="text-[10px] font-bold text-emerald-500 mb-1 uppercase">Après</p>
                                <p className="text-sm text-emerald-900/80 leading-relaxed">{c.after || c.suggestion || "—"}</p>
                              </div>
                            </div>
                            <p className="mt-2.5 text-xs text-gray-500">{c.explanation || c.reason || ""}</p>
                            {c.priority && (
                              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                c.priority === "haute" ? "bg-red-100 text-red-600" : c.priority === "moyenne" ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"
                              }`}>Priorité {c.priority}</span>
                            )}
                          </div>
                        ))}

                        {corrections.tips && corrections.tips.length > 0 && (
                          <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                              <Sparkles className="h-4 w-4 text-indigo-500" />
                              Conseils
                            </h4>
                            <ul className="space-y-2">
                              {corrections.tips.map((t, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />{t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-center shadow-lg">
                          <h4 className="text-base font-bold text-white mb-1.5">Recrée ton CV optimisé</h4>
                          <p className="text-xs text-indigo-100 mb-4">Design pro, texte amélioré, export PDF</p>
                          <button
                            onClick={() => window.location.href = `/cv-editor?id=${analysis.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-600 shadow-lg hover:scale-[1.02] transition-all"
                          >
                            <Palette className="h-4 w-4" />
                            Éditeur de CV
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold">2t</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <LockedFeature title="Corrections détaillées" description="Corrections section par section avec avant/après." cost={2} loading={loadingCorrections} onUnlock={handleCorrections} tokens={tokens} />
                    )}
                  </div>
                )}

                {/* ── Tab: Cover Letter ── */}
                {activeTab === "cover-letter" && (
                  <div className="animate-fade-in">
                    {coverLetter ? (
                      <div className="space-y-4">
                        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                              <FileText className="h-4 w-4 text-indigo-500" />
                              Ta lettre
                            </h3>
                            <CopyButton text={coverLetter.coverLetter} />
                          </div>
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100">
                            {coverLetter.coverLetter}
                          </div>
                        </div>
                        <button onClick={() => setCoverLetter(null)} className="text-sm text-gray-500 hover:text-indigo-600 font-medium">← Nouvelle lettre</button>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">Lettre de motivation IA</h3>
                            <p className="text-xs text-gray-400">Scraping entreprise + lettre personnalisée</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="text-xs font-semibold text-gray-700 mb-1 block">Entreprise *</label>
                              <input type="text" value={clCompany} onChange={(e) => setClCompany(e.target.value)} placeholder="ex: Google"
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-700 mb-1 block">Site web</label>
                              <input type="url" value={clUrl} onChange={(e) => setClUrl(e.target.value)} placeholder="https://..."
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-700 mb-1 block">Description du poste *</label>
                            <textarea value={clJob} onChange={(e) => setClJob(e.target.value)} placeholder="Collez la description..." rows={4}
                              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base resize-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" />
                          </div>
                        </div>
                        <button onClick={handleCoverLetter} disabled={loadingCoverLetter || !clCompany || !clJob}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-40 transition-all active:scale-[0.98]">
                          {loadingCoverLetter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          {loadingCoverLetter ? "Génération..." : "Générer la lettre"}
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">3t</span>
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
                        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                          <div className="flex items-center gap-4 mb-4">
                            <ScoreRing score={jobMatch.matchScore} size={90} label="Match" />
                            <div>
                              <h3 className="text-sm font-bold text-gray-900">Score de compatibilité</h3>
                              <p className="text-xs text-gray-500 mt-1">{jobMatch.globalAdvice}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                              <p className="text-[10px] font-bold text-emerald-600 mb-1.5 uppercase">Présents</p>
                              <div className="flex flex-wrap gap-1">
                                {jobMatch.presentKeywords.map((k, i) => (
                                  <span key={i} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">{k}</span>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                              <p className="text-[10px] font-bold text-red-600 mb-1.5 uppercase">Manquants</p>
                              <div className="flex flex-wrap gap-1">
                                {jobMatch.missingKeywords.map((k, i) => (
                                  <span key={i} className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700">{k}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-gray-900">CV adapté</h4>
                            <CopyButton text={jobMatch.adaptedCV} />
                          </div>
                          <pre className="whitespace-pre-wrap text-xs text-gray-700 font-[system-ui] bg-gray-50 rounded-xl p-4 border border-gray-100">{jobMatch.adaptedCV}</pre>
                        </div>
                        <button onClick={() => setJobMatch(null)} className="text-sm text-gray-500 hover:text-indigo-600 font-medium">← Nouveau matching</button>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Target className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">Matcher une offre</h3>
                            <p className="text-xs text-gray-400">L&apos;IA adapte ton CV à l&apos;offre</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-700 mb-1 block">Titre du poste</label>
                            <input type="text" value={jmTitle} onChange={(e) => setJmTitle(e.target.value)} placeholder="ex: Chef de projet"
                              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-700 mb-1 block">Description *</label>
                            <textarea value={jmDescription} onChange={(e) => setJmDescription(e.target.value)} placeholder="Collez l'offre..." rows={5}
                              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base resize-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" />
                          </div>
                        </div>
                        <button onClick={handleJobMatch} disabled={loadingJobMatch || !jmDescription || !analysis}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-40 transition-all active:scale-[0.98]">
                          {loadingJobMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
                          {loadingJobMatch ? "Analyse..." : "Analyser"}
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">2t</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════ TOKENS MODAL ═══════ */}
      {showTokens && (
        <Modal onClose={() => setShowTokens(false)}>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Coins className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Acheter des tokens</h2>
                <p className="text-xs text-gray-500">Solde : <span className="font-semibold text-indigo-600">{tokens}</span></p>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { id: "pack-5", tokens: 5, price: "4,99€", perToken: "1,00€" },
                { id: "pack-15", tokens: 15, price: "9,99€", perToken: "0,67€", popular: true },
                { id: "pack-50", tokens: 50, price: "24,99€", perToken: "0,50€" },
              ].map((pack) => (
                <button key={pack.id} onClick={() => buyTokens(pack.id)}
                  className={`flex w-full items-center justify-between rounded-xl border-2 p-3.5 text-left transition-all hover:shadow-md ${
                    pack.popular ? "border-indigo-300 bg-indigo-50/50" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {pack.tokens} tokens
                      {pack.popular && <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">Populaire</span>}
                    </p>
                    <p className="text-xs text-gray-400">{pack.perToken}/token</p>
                  </div>
                  <p className="text-lg font-extrabold text-gray-900">{pack.price}</p>
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-[10px] text-gray-400">Paiement sécurisé Stripe • Tokens sans expiration</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════ COMPONENTS ═══════ */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md animate-scale-in rounded-2xl bg-white shadow-2xl border border-gray-200">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function LockedFeature({ title, description, cost, loading, onUnlock, tokens }: {
  title: string; description: string; cost: number; loading: boolean; onUnlock: () => void; tokens: number | null;
}) {
  const hasEnough = tokens !== null && tokens >= cost;
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200">
        <Lock className="h-5 w-5 text-gray-400" />
      </div>
      <h3 className="mt-3 text-base font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <button onClick={onUnlock} disabled={loading || !hasEnough}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-40 transition-all active:scale-[0.98]">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Débloquer ({cost} tokens)
      </button>
      {!hasEnough && <p className="mt-2 text-xs text-red-500 font-medium">Pas assez de tokens ({tokens ?? 0}/{cost})</p>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-all">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copié !" : "Copier"}
    </button>
  );
}
