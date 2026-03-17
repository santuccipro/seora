"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard/layout";
import { signIn } from "next-auth/react";
import {
  PenTool,
  Loader2,
  Building2,
  Globe,
  FileText,
  Copy,
  Sparkles,
  Search,
  CheckCircle2,
  Upload,
  XCircle,
  Lock,
  ArrowRight,
  X,
  Check,
} from "lucide-react";
import { ScoreRing } from "@/components/charts/score-ring";
import { useDropzone } from "react-dropzone";
import { useCallback } from "react";

interface Analysis {
  id: string;
  fileName: string;
}

interface CompanyInfo {
  name: string;
  description: string;
  sector: string;
  values: string[];
  culture: string;
  size: string;
}

type ActiveTab = "generate" | "analyze";

export default function CoverLetterPage() {
  const { status } = useSession();
  const [activeTab, setActiveTab] = useState<ActiveTab>("generate");
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedCV, setSelectedCV] = useState("");

  // Generate state
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [researching, setResearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [companyInsights, setCompanyInsights] = useState<string[]>([]);

  // Theatrical loading
  const [theatricalStep, setTheatricalStep] = useState(-1);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Analyze state
  const [analyzeFile, setAnalyzeFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<{
    score: number;
    scoreBreakdown: Record<string, number>;
    summary: string;
    strengths: string[];
    weaknesses: string[];
  } | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/analyses")
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setAnalyses(d); });
    }
  }, [status]);

  // Auto-process from landing page sessionStorage
  const hasAutoProcessed = useRef(false);
  const [pendingAutoGenerate, setPendingAutoGenerate] = useState(false);
  useEffect(() => {
    if (hasAutoProcessed.current) return;
    const company = sessionStorage.getItem("seora_cl_company");
    const job = sessionStorage.getItem("seora_cl_job");
    if (company && job) {
      hasAutoProcessed.current = true;
      sessionStorage.removeItem("seora_cl_company");
      sessionStorage.removeItem("seora_cl_job");
      setCompanyName(company);
      setJobDescription(job);
      setActiveTab("generate");
      setPendingAutoGenerate(true);
    }
  }, []);

  // Auto-trigger generation after state is set
  useEffect(() => {
    if (pendingAutoGenerate && companyName && jobDescription && !generating) {
      setPendingAutoGenerate(false);
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoGenerate, companyName, jobDescription]);

  // Research company
  async function handleResearch() {
    if (!companyName.trim()) return;
    setResearching(true);
    try {
      const res = await fetch("/api/company-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, companyUrl: companyUrl || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setCompanyInfo(data);
        toast.success(`Recherche sur ${companyName} terminée !`);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setResearching(false);
    }
  }

  // Generate cover letter
  async function handleGenerate() {
    if (!jobDescription.trim() || !companyName.trim()) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }
    setGenerating(true);
    setTheatricalStep(0);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const animate = async () => {
      const delays = [2500, 3500, 4000, 3000, 2000];
      for (let i = 0; i < delays.length; i++) {
        await sleep(delays[i]);
        setTheatricalStep(i + 1);
      }
    };

    const callApi = async () => {
      if (status !== "authenticated") return null;
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvAnalysisId: selectedCV || undefined,
          jobDescription,
          companyName,
          companyUrl: companyUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      return data;
    };

    try {
      const [, apiResult] = await Promise.all([animate(), callApi()]);
      if (apiResult) {
        setGeneratedLetter(apiResult.coverLetter);
        setTips(apiResult.tips || []);
        setCompanyInsights(apiResult.companyInsights || []);
        if (apiResult.companyInfo) setCompanyInfo(apiResult.companyInfo);
        toast.success("Lettre générée !");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur de connexion";
      toast.error(message);
    }

    setGenerating(false);
  }

  // Analyze existing cover letter
  const onDrop = useCallback((files: File[]) => {
    if (files[0]) setAnalyzeFile(files[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1,
  });

  async function handleAnalyze() {
    if (!analyzeFile) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("letter", analyzeFile);
      const res = await fetch("/api/cover-letter/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setAnalyzeResult(data);
      toast.success("Lettre analysée !");
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <PenTool className="h-7 w-7 text-indigo-500" />
            Lettre de motivation
          </h1>
          <p className="mt-1 text-gray-600">
            Générez une lettre personnalisée ou analysez une lettre existante
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setActiveTab("generate")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              activeTab === "generate" ? "bg-white shadow text-indigo-600" : "text-gray-600"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Générer avec IA
          </button>
          <button
            onClick={() => setActiveTab("analyze")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              activeTab === "analyze" ? "bg-white shadow text-indigo-600" : "text-gray-600"
            }`}
          >
            <Search className="h-4 w-4" />
            Analyser une lettre
          </button>
        </div>

        {activeTab === "generate" && !generatedLetter && (
          <div className="space-y-6">
            {/* Company Research */}
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500" />
                1. Entreprise cible
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nom de l'entreprise *"
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    placeholder="Site web (optionnel)"
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <button
                    onClick={handleResearch}
                    disabled={researching || !companyName.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                  >
                    {researching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                    Rechercher
                  </button>
                </div>
              </div>

              {companyInfo && (
                <div className="mt-4 rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                  <p className="text-xs font-semibold text-indigo-600 mb-2">Infos trouvées sur {companyInfo.name}</p>
                  <p className="text-sm text-gray-700 mb-2">{companyInfo.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-white rounded-full px-2.5 py-1 text-indigo-600 border border-indigo-200">
                      {companyInfo.sector}
                    </span>
                    <span className="text-xs bg-white rounded-full px-2.5 py-1 text-indigo-600 border border-indigo-200">
                      {companyInfo.size}
                    </span>
                    {companyInfo.values.slice(0, 3).map((v, i) => (
                      <span key={i} className="text-xs bg-white rounded-full px-2.5 py-1 text-gray-600 border border-gray-200">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Select CV */}
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                2. Votre CV (optionnel, améliore la personnalisation)
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCV("")}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    !selectedCV ? "border-indigo-400 bg-indigo-50 text-indigo-600" : "border-gray-200 text-gray-600"
                  }`}
                >
                  Sans CV
                </button>
                {analyses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedCV(a.id)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      selectedCV === a.id ? "border-indigo-400 bg-indigo-50 text-indigo-600" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {a.fileName}
                  </button>
                ))}
              </div>
            </div>

            {/* Job Description */}
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                3. Offre d&apos;emploi *
              </h3>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Collez ici le texte de l'offre d'emploi..."
                rows={8}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !companyName.trim() || !jobDescription.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-4 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Générer la lettre de motivation
                </>
              )}
            </button>

            {/* Theatrical Loading */}
            {generating && theatricalStep >= 0 && (
              <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-indigo-400/20 animate-ping" />
                    <div className="relative h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Génération de votre lettre</p>
                    <p className="text-xs text-gray-400">Pour {companyName}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    "Recherche d'informations sur l'entreprise",
                    "Analyse du poste et des compétences requises",
                    "Croisement avec votre profil",
                    "Rédaction personnalisée",
                    "Vérification et optimisation finale",
                  ].map((step, i) => (
                    <div key={i} className={`flex items-center gap-3 transition-all duration-700 ${theatricalStep > i ? "opacity-100" : theatricalStep === i ? "opacity-70" : "opacity-25"}`}>
                      {theatricalStep > i ? (
                        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <Check className="h-4 w-4 text-green-500" />
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
                <div className="mt-8 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-1000 ease-out" style={{ width: `${Math.min(((theatricalStep + 1) / 6) * 100, 100)}%` }} />
                </div>
                {theatricalStep >= 2 && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-3">Moteur de rédaction</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {["Extraction NER entreprise", "Cross-matching compétences×offre", "Génération fine-tuned GPT-4o", "Anti-détection IA intégrée"].map((t) => (
                        <span key={t} className="inline-flex items-center rounded-full bg-indigo-50/80 border border-indigo-100/60 px-2.5 py-0.5 text-[10px] font-medium text-indigo-500">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {theatricalStep >= 3 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-3">Sources utilisées</p>
                    <div className="flex items-center gap-5">
                      {["Site entreprise", "LinkedIn", "Glassdoor", "Welcome to the Jungle"].map((n) => (
                        <span key={n} className="text-xs font-semibold text-gray-400">{n}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Gated Results (non-auth) */}
        {activeTab === "generate" && !generating && theatricalStep >= 5 && status !== "authenticated" && !generatedLetter && (
          <div className="space-y-6">
            <div className="relative rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-8 filter blur-[6px] pointer-events-none select-none" aria-hidden="true">
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-5/6" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-4/5" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/95 to-white/60">
                <div className="text-center px-6">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 mb-4">
                    <Lock className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Votre lettre est prête !</h3>
                  <p className="text-sm text-gray-500 mt-2 mb-6 max-w-sm mx-auto">Créez votre compte gratuit pour débloquer votre lettre de motivation personnalisée.</p>
                  <button onClick={() => setShowAuthModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-black px-8 py-3.5 text-sm font-semibold text-white hover:bg-gray-800 shadow-lg transition-all">
                    <ArrowRight className="h-4 w-4" />
                    Créer mon compte — c&apos;est gratuit
                  </button>
                  <p className="text-xs text-gray-400 mt-3">Sans carte bancaire • 3 tokens offerts</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "generate" && generatedLetter && (
          <div className="space-y-6">
            {companyInfo && (
              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-6">
                <h3 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Infos entreprise utilisées
                </h3>
                <div className="flex flex-wrap gap-2">
                  {companyInsights.map((insight, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs bg-white rounded-full px-3 py-1.5 text-indigo-700 border border-indigo-200">
                      <CheckCircle2 className="h-3 w-3" />
                      {insight}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Votre lettre de motivation</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLetter);
                    toast.success("Copié !");
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copier
                </button>
              </div>
              <div className="rounded-xl bg-gray-50 p-6">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                  {generatedLetter}
                </pre>
              </div>
            </div>

            {tips.length > 0 && (
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Conseils pour personnaliser encore plus
                </h3>
                <ul className="space-y-2">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => { setGeneratedLetter(null); setJobDescription(""); setCompanyInfo(null); }}
              className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Générer une nouvelle lettre
            </button>
          </div>
        )}

        {activeTab === "analyze" && !analyzeResult && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
                  isDragActive ? "border-indigo-400 bg-indigo-50" :
                  analyzeFile ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                <input {...getInputProps()} />
                {analyzeFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-green-500" />
                    <p className="font-medium text-gray-900">{analyzeFile.name}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-gray-300" />
                    <p className="text-gray-700 font-medium">Glissez votre lettre de motivation</p>
                    <p className="text-sm text-gray-500">PDF ou TXT</p>
                  </div>
                )}
              </div>
            </div>

            {analyzeFile && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-4 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
              >
                {analyzing ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Analyse en cours...</>
                ) : (
                  <>Analyser ma lettre (1 token)</>
                )}
              </button>
            )}
          </div>
        )}

        {activeTab === "analyze" && analyzeResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
                <ScoreRing score={analyzeResult.score} label="Score lettre" />
              </div>
              <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Résumé</h3>
                <p className="text-gray-600 leading-relaxed">{analyzeResult.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Points forts
                </h3>
                <ul className="space-y-2">
                  {analyzeResult.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                  <XCircle className="h-5 w-5 text-orange-500" />
                  Axes d&apos;amélioration
                </h3>
                <ul className="space-y-2">
                  {analyzeResult.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => { setAnalyzeResult(null); setAnalyzeFile(null); }}
              className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Analyser une autre lettre
            </button>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && status !== "authenticated" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
            <button onClick={() => setShowAuthModal(false)} className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
            <AuthFormCL onSuccess={() => { setShowAuthModal(false); window.location.reload(); }} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function AuthFormCL({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, name, redirect: false });
    if (res?.ok) onSuccess();
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Débloquez votre lettre</h2>
      <p className="text-xs text-gray-500 mb-5">3 tokens offerts à l&apos;inscription</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre prénom" required className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" />
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? "Connexion..." : "Continuer"}
        </button>
      </form>
    </div>
  );
}
