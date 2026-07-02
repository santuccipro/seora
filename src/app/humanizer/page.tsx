"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bot,
  Upload,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Loader2,
  Zap,
  Shield,
  TrendingDown,
  Download,
  RotateCcw,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  "Extraction du texte du document",
  "Nettoyage des caractères cachés (homoglyphes)",
  "Scan des patterns IA (GPT, Claude, Gemini)",
  "Analyse de la perplexité et de la burstiness",
  "Détection des structures académiques parallèles",
  "Reformulation phrase par phrase (LLM)",
  "Injection de marqueurs d'énonciation personnels",
  "Diversification du vocabulaire",
  "Cassage des phrases longues",
  "Vérification finale du score IA",
];

type Analysis = {
  id: string;
  fileName: string;
  aiScoreBefore: number | null;
  aiScoreAfter: number | null;
  scoreDetails: {
    before: Record<string, number>;
    after: Record<string, number>;
  } | null;
  originalText: string | null;
  humanizedText: string | null;
  passesApplied: number | null;
  wordCount: number | null;
  status: string;
  errorMessage?: string | null;
};

export default function HumanizerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingId = searchParams.get("id");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState<{ name: string; file: File } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<Analysis | null>(null);
  const [showFullText, setShowFullText] = useState<"before" | "after" | null>(null);

  // Redirect to sign-in if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/humanizer");
    }
  }, [status, router]);

  // Auto-load if id in URL
  useEffect(() => {
    if (!existingId) return;
    (async () => {
      try {
        const res = await fetch(`/api/humanize?id=${existingId}`);
        if (res.ok) {
          const data = await res.json();
          setResult(data);
        }
      } catch {
        // ignore
      }
    })();
  }, [existingId]);

  // Auto-fill from sessionStorage upload from landing/dashboard
  useEffect(() => {
    const savedData = sessionStorage.getItem("seora_memoire_file");
    const savedName = sessionStorage.getItem("seora_memoire_filename");
    if (savedData && savedName && !uploaded) {
      // Reconstruct a File from the base64
      try {
        const [meta, base64] = savedData.split(",");
        const mimeMatch = meta.match(/data:([^;]+)/);
        const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const file = new File([bytes], savedName, { type: mime });
        setUploaded({ name: savedName, file });
      } catch (e) {
        console.error("Failed to reconstruct file from sessionStorage", e);
      }
      sessionStorage.removeItem("seora_memoire_file");
      sessionStorage.removeItem("seora_memoire_filename");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate step progression while analyzing (~4s per step * 10 = 40s cap; the
  // real API call may finish earlier which will jump to done).
  useEffect(() => {
    if (!analyzing) return;
    let i = 0;
    const int = setInterval(() => {
      i++;
      if (i >= STEPS.length - 1) {
        clearInterval(int);
        setCurrentStep(STEPS.length - 1);
        return;
      }
      setCurrentStep(i);
    }, 4000);
    return () => clearInterval(int);
  }, [analyzing]);

  const handleFile = useCallback((file: File) => {
    const validExts = [".pdf", ".docx", ".doc", ".txt"];
    if (!validExts.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      toast.error("Format non supporté (PDF, DOCX, DOC, TXT uniquement)");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Fichier trop lourd (max 15 Mo)");
      return;
    }
    setUploaded({ name: file.name, file });
    setResult(null);
  }, []);

  const startAnalysis = useCallback(async () => {
    if (!uploaded) return;
    setAnalyzing(true);
    setCurrentStep(0);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", uploaded.file);
      const res = await fetch("/api/humanize", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // Fetch full analysis
      const full = await fetch(`/api/humanize?id=${data.id}`);
      const fullData = await full.json();
      setResult(fullData);
      setCurrentStep(STEPS.length - 1);
      setTimeout(() => setAnalyzing(false), 400);
      toast.success(
        `Analyse terminée · Score IA passé de ${fullData.aiScoreBefore}% à ${fullData.aiScoreAfter}%`
      );
    } catch (err) {
      setAnalyzing(false);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'analyse");
    }
  }, [uploaded]);

  const resetAll = () => {
    setUploaded(null);
    setResult(null);
    setAnalyzing(false);
    setCurrentStep(0);
    setShowFullText(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const download = async (format: "docx" | "pdf" | "txt") => {
    if (!result?.id) return;
    try {
      const res = await fetch(`/api/humanize/${result.id}/export?format=${format}`);
      if (!res.ok) throw new Error("Erreur téléchargement");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.fileName.replace(/\.[^.]+$/, "")}-humanise.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Téléchargement échoué");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25 mb-4">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Analyse mon mémoire / DPP
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Score IA (Compilatio, GPTZero) + humanisation automatique pour passer sous les 15%.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="flex items-center gap-1.5 rounded-full bg-white shadow-sm border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-700">
            <Zap className="h-3.5 w-3.5 text-orange-500" />
            Résultat en ~40s
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white shadow-sm border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-700">
            <TrendingDown className="h-3.5 w-3.5 text-orange-500" />
            Score IA sous 15%
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white shadow-sm border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-700">
            <Shield className="h-3.5 w-3.5 text-orange-500" />
            100% confidentiel
          </div>
        </div>

        {/* Analyzing state */}
        {analyzing && (
          <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-8 mb-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <Bot className="h-9 w-9 text-white" />
                </div>
                <div
                  className="absolute -inset-3 rounded-3xl border-2 border-orange-300/40 animate-spin"
                  style={{ borderStyle: "dashed", animationDuration: "3s" }}
                />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                <p className="text-sm font-semibold text-gray-700">
                  {STEPS[currentStep]}...
                </p>
              </div>
              <div className="w-full max-w-sm">
                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-600 transition-all duration-500"
                    style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  {Math.round(((currentStep + 1) / STEPS.length) * 100)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Result state */}
        {!analyzing && result && result.humanizedText && (
          <div className="space-y-5">
            {/* Score comparison */}
            <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Before */}
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                    Score IA avant
                  </p>
                  <ScoreRing value={result.aiScoreBefore ?? 0} kind="before" />
                  <p className="mt-3 text-sm font-medium text-gray-600">
                    Probabilité de détection IA
                  </p>
                </div>
                {/* After */}
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                    Score IA après
                  </p>
                  <ScoreRing value={result.aiScoreAfter ?? 0} kind="after" />
                  <p className="mt-3 text-sm font-medium text-gray-600">
                    {(result.aiScoreAfter ?? 100) <= 15
                      ? "✓ Passe les détecteurs"
                      : "En zone de risque"}
                  </p>
                </div>
              </div>

              {result.scoreDetails && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">
                    Détails de l&apos;analyse
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(result.scoreDetails.after)
                      .filter(([k]) => k !== "overall")
                      .map(([key, value]) => (
                        <div key={key} className="bg-orange-50/50 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                            {LABELS[key] ?? key}
                          </p>
                          <p className="text-xl font-extrabold text-gray-900 mt-1">
                            {value}%
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Text comparison */}
            <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Texte humanisé</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {result.wordCount ?? 0} mots · {result.passesApplied ?? 0} passes
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFullText(showFullText === "before" ? null : "before")}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Voir original
                  </button>
                  <button
                    onClick={() => setShowFullText(showFullText === "after" ? null : "after")}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-all"
                  >
                    Voir humanisé
                  </button>
                </div>
              </div>

              {showFullText && (
                <div className="mt-4 max-h-96 overflow-y-auto bg-gray-50 rounded-2xl p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {showFullText === "before" ? result.originalText : result.humanizedText}
                </div>
              )}
              {!showFullText && (
                <div className="mt-4 bg-orange-50/40 rounded-2xl p-4 text-sm text-gray-700 leading-relaxed line-clamp-6">
                  {(result.humanizedText ?? "").slice(0, 500)}...
                </div>
              )}
            </div>

            {/* Downloads */}
            <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Télécharger</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Format prêt à rendre à ton établissement
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => download("docx")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:shadow-lg transition-all"
                >
                  <Download className="h-4 w-4" />
                  DOCX (Word)
                </button>
                <button
                  onClick={() => download("pdf")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3.5 text-sm font-bold text-white hover:bg-gray-800 transition-all"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </button>
                <button
                  onClick={() => download("txt")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-gray-200 px-5 py-3.5 text-sm font-bold text-gray-700 hover:border-gray-300 transition-all"
                >
                  <Download className="h-4 w-4" />
                  TXT
                </button>
              </div>

              <button
                onClick={resetAll}
                className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 py-2 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Analyser un autre document
              </button>
            </div>
          </div>
        )}

        {/* Upload state */}
        {!analyzing && !result && (
          <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-6 sm:p-8">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            {uploaded ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-2xl bg-orange-50 border border-orange-200 p-4">
                  <div className="h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{uploaded.name}</p>
                    <p className="text-xs text-gray-500">
                      {(uploaded.file.size / 1024).toFixed(1)} Ko · Prêt à analyser
                    </p>
                  </div>
                  <button
                    onClick={() => setUploaded(null)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Changer
                  </button>
                </div>

                <button
                  onClick={startAnalysis}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  Lancer l&apos;analyse
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="text-center text-[11px] text-gray-400">
                  3 tokens · Résultat en ~40 secondes
                </p>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl py-14 sm:py-20 px-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-orange-500 bg-orange-50/60 scale-[1.005]"
                    : "border-orange-200 hover:border-orange-400 hover:bg-orange-50/40"
                }`}
              >
                <div className="h-14 w-14 rounded-2xl bg-orange-100 flex items-center justify-center mb-4">
                  <Upload className="h-6 w-6 text-orange-600" />
                </div>
                <p className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                  {dragOver ? "Lâchez votre fichier ici" : "Glissez votre mémoire ou DPP ici"}
                </p>
                <p className="text-xs text-gray-500 mb-5">
                  PDF, DOCX, DOC ou TXT · Max 15 Mo
                </p>
                <div className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 hover:shadow-lg transition-all">
                  Parcourir mes fichiers
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <CheckCircle2 className="h-4 w-4 text-orange-500 mb-2" />
            <p className="text-xs font-bold text-gray-900">Anti-Compilatio</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Nettoyage homoglyphes + reformulation cohérente
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <CheckCircle2 className="h-4 w-4 text-orange-500 mb-2" />
            <p className="text-xs font-bold text-gray-900">Sens préservé</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Le fond académique reste intact, seul le style change
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <CheckCircle2 className="h-4 w-4 text-orange-500 mb-2" />
            <p className="text-xs font-bold text-gray-900">Export DOCX + PDF</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Structure préservée · Prêt à rendre
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  perplexity: "Perplexité",
  burstiness: "Burstiness",
  homoglyphs: "Homoglyphes",
  connectors: "Connecteurs",
  formality: "Formalité",
  parallelism: "Parallélisme",
};

function ScoreRing({ value, kind }: { value: number; kind: "before" | "after" }) {
  const clamped = Math.max(0, Math.min(100, value));
  const good = kind === "after" && clamped <= 15;
  const bad = clamped >= 40;
  const strokeColor = good ? "#10b981" : bad ? "#ef4444" : "#f59e0b";
  const textClass = good ? "text-emerald-600" : bad ? "text-red-500" : "text-amber-500";

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={130} height={130} className="-rotate-90">
        <circle
          cx={65}
          cy={65}
          r={radius}
          stroke="#f3f4f6"
          strokeWidth={10}
          fill="none"
        />
        <circle
          cx={65}
          cy={65}
          r={radius}
          stroke={strokeColor}
          strokeWidth={10}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className={`text-3xl font-extrabold ${textClass}`}>{clamped}%</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
          IA
        </span>
      </div>
    </div>
  );
}
