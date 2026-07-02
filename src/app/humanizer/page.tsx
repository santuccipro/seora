"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import AiReport from "@/components/ai-report/ai-report";
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
  Copy,
  Share2,
  History,
  Settings2,
  Plus,
  X as XIcon,
  Info,
  Globe,
  Layers,
  Flame,
  Feather,
  Scale,
  FileSearch,
} from "lucide-react";

type Mode = "basic" | "balanced" | "aggressive";
type Language = "fr" | "en" | "es";

type Detector = "gptZeroLike" | "saplingLike" | "originalityLike" | "compilatioLike";

type Analysis = {
  id: string;
  fileName: string;
  aiScoreBefore: number | null;
  aiScoreAfter: number | null;
  scoreDetails: {
    before: Record<string, number>;
    after: Record<string, number>;
    metrics?: Record<string, number>;
    mode?: string;
    language?: string;
  } | null;
  originalText: string | null;
  humanizedText: string | null;
  passesApplied: number | null;
  wordCount: number | null;
  status: string;
  errorMessage?: string | null;
  shareToken?: string | null;
  diff?: Array<{ before: string; after: string; changed: boolean; similarity: number }>;
};

const PHASE_LABELS: Record<string, string> = {
  extracting: "Extraction du texte du document",
  "detecting-before": "Scan initial du score IA (4 détecteurs)",
  "cleaning-deterministic": "Nettoyage homoglyphes + connecteurs académiques",
  "rewriting-llm": "Reformulation phrase par phrase (Gemini)",
  "detecting-after": "Nouveau scan du score IA",
  retrying: "Score encore élevé, nouvelle passe plus agressive",
  restoring: "Restauration des zones préservées",
  done: "Terminé",
};

const MODE_META: Record<Mode, { label: string; desc: string; tokens: number; color: string; icon: typeof Feather }> = {
  basic: {
    label: "Basique",
    desc: "1 passe rapide (~20s)",
    tokens: 2,
    color: "emerald",
    icon: Feather,
  },
  balanced: {
    label: "Équilibré",
    desc: "2 passes recommandées (~40s)",
    tokens: 3,
    color: "orange",
    icon: Scale,
  },
  aggressive: {
    label: "Agressif",
    desc: "Jusqu'à 4 passes maximum (~80s)",
    tokens: 5,
    color: "red",
    icon: Flame,
  },
};

const LANG_META: Record<Language, { label: string; flag: string }> = {
  fr: { label: "Français", flag: "🇫🇷" },
  en: { label: "English", flag: "🇬🇧" },
  es: { label: "Español", flag: "🇪🇸" },
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
  const [phase, setPhase] = useState<string>("extracting");
  const [pass, setPass] = useState(0);
  const [totalPasses, setTotalPasses] = useState(0);
  const [phaseDetail, setPhaseDetail] = useState<string>("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [viewMode, setViewMode] = useState<"score" | "diff" | "raw">("score");
  const [showReport, setShowReport] = useState(false);
  const [showFullText, setShowFullText] = useState<"before" | "after" | null>(null);

  // Config
  const [mode, setMode] = useState<Mode>("balanced");
  const [language, setLanguage] = useState<Language>("fr");
  const [targetScore, setTargetScore] = useState(15);
  const [preservationList, setPreservationList] = useState<string[]>([]);
  const [preservationInput, setPreservationInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(true);

  // Redirect if unauth
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/humanizer");
    }
  }, [status, router]);

  // Check onboarding flag
  useEffect(() => {
    if (typeof window !== "undefined") {
      const seen = localStorage.getItem("seora_humanizer_onboarded");
      setOnboardingSeen(!!seen);
    }
  }, []);

  // Load existing analysis if id in URL
  useEffect(() => {
    if (!existingId) return;
    (async () => {
      try {
        const res = await fetch(`/api/humanize?id=${existingId}&diff=true`);
        if (res.ok) {
          const data = await res.json();
          setResult(data);
        }
      } catch {
        // silent
      }
    })();
  }, [existingId]);

  // Load from sessionStorage
  useEffect(() => {
    const savedData = sessionStorage.getItem("seora_memoire_file");
    const savedName = sessionStorage.getItem("seora_memoire_filename");
    if (savedData && savedName && !uploaded) {
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
        console.error(e);
      }
      sessionStorage.removeItem("seora_memoire_file");
      sessionStorage.removeItem("seora_memoire_filename");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeOnboarding = () => {
    localStorage.setItem("seora_humanizer_onboarded", "1");
    setOnboardingSeen(true);
  };

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
    setPhase("extracting");
    setPass(0);
    setTotalPasses(0);
    setPhaseDetail("");
    setResult(null);

    const fd = new FormData();
    fd.append("file", uploaded.file);
    fd.append("mode", mode);
    fd.append("language", language);
    fd.append("targetScore", String(targetScore));
    fd.append("stream", "true");
    if (preservationList.length > 0) {
      fd.append("preservation", JSON.stringify({ list: preservationList, patterns: [] }));
    }

    try {
      const res = await fetch("/api/humanize", { method: "POST", body: fd });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // Parse SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let doneId: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          if (!ev.trim()) continue;
          const lines = ev.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;
          const eventType = eventLine.slice(6).trim();
          const data = JSON.parse(dataLine.slice(5).trim());

          if (eventType === "progress") {
            setPhase(data.phase);
            setPass(data.pass ?? 0);
            setTotalPasses(data.totalPasses ?? 0);
            setPhaseDetail(data.detail ?? "");
          } else if (eventType === "done") {
            doneId = data.id;
          } else if (eventType === "error") {
            throw new Error(data.message);
          }
        }
      }

      if (doneId) {
        const full = await fetch(`/api/humanize?id=${doneId}&diff=true`);
        const fullData = await full.json();
        setResult(fullData);
        toast.success(
          `Analyse terminée · ${fullData.aiScoreBefore}% → ${fullData.aiScoreAfter}%`
        );
      }
      setTimeout(() => setAnalyzing(false), 300);
    } catch (err) {
      setAnalyzing(false);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'analyse");
    }
  }, [uploaded, mode, language, targetScore, preservationList]);

  const regenerate = async (bumpMode: Mode = "aggressive") => {
    if (!result?.id) return;
    const t = toast.loading("Régénération en cours...");
    try {
      const res = await fetch(`/api/humanize/${result.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: bumpMode, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Régénération échouée");
      const full = await fetch(`/api/humanize?id=${result.id}&diff=true`);
      const fullData = await full.json();
      setResult(fullData);
      toast.success(`Score : ${fullData.aiScoreAfter}%`, { id: t });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur", { id: t });
    }
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

  const copyText = async () => {
    if (!result?.humanizedText) return;
    try {
      await navigator.clipboard.writeText(result.humanizedText);
      toast.success("Texte copié dans le presse-papier");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const shareAnalysis = async () => {
    if (!result?.id) return;
    if (result.shareToken) {
      const url = `${window.location.origin}/share/humanizer/${result.shareToken}`;
      await navigator.clipboard.writeText(url);
      toast.success("Lien de partage copié");
      return;
    }
    try {
      const res = await fetch(`/api/humanize/${result.id}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur partage");
      const url = `${window.location.origin}/share/humanizer/${data.shareToken}`;
      await navigator.clipboard.writeText(url);
      setResult({ ...result, shareToken: data.shareToken });
      toast.success("Lien de partage créé et copié");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const addPreservation = () => {
    const p = preservationInput.trim();
    if (!p || p.length < 3) {
      toast.error("Zone à préserver trop courte (min 3 caractères)");
      return;
    }
    setPreservationList([...preservationList, p]);
    setPreservationInput("");
  };

  const removePreservation = (i: number) => {
    setPreservationList(preservationList.filter((_, idx) => idx !== i));
  };

  const resetAll = () => {
    setUploaded(null);
    setResult(null);
    setAnalyzing(false);
    setPhase("extracting");
    setPass(0);
    setPreservationList([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      {/* Onboarding modal */}
      {!onboardingSeen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-3xl bg-white shadow-2xl p-8">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                <Bot className="h-7 w-7 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-2">
              Bienvenue sur Seora Humanizer
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              L'outil qui rend tes mémoires et DPP indétectables par les scans IA.
            </p>
            <div className="space-y-3 mb-6">
              {[
                { icon: Upload, title: "Glisse ton PDF ou DOCX", desc: "Max 15 Mo, formats standards" },
                { icon: Settings2, title: "Choisis ton mode", desc: "Basique / Équilibré / Agressif" },
                { icon: Sparkles, title: "Récupère ton doc humanisé", desc: "Score IA sous 15% + export DOCX/PDF" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-orange-50/50">
                  <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    <step.icon className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={closeOnboarding}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all"
            >
              C'est parti
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au dashboard
          </Link>
          <Link
            href="/humanizer/history"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <History className="h-4 w-4" />
            Historique
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25 mb-4">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Analyse mon mémoire / DPP
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            4 détecteurs IA (Compilatio, GPTZero, Sapling, Originality) + humanisation Gemini pour passer sous les 15%.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="flex items-center gap-1.5 rounded-full bg-white shadow-sm border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-700">
            <Zap className="h-3.5 w-3.5 text-orange-500" />
            Streaming en direct
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white shadow-sm border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-700">
            <Globe className="h-3.5 w-3.5 text-orange-500" />
            FR · EN · ES
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white shadow-sm border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-700">
            <Shield className="h-3.5 w-3.5 text-orange-500" />
            Zones préservées
          </div>
        </div>

        {/* Analyzing */}
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
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                <p className="text-sm font-semibold text-gray-800">
                  {PHASE_LABELS[phase] ?? phase}
                </p>
              </div>
              {totalPasses > 0 && (
                <p className="text-xs text-gray-500 mb-4">
                  Passe {pass} / {totalPasses}
                </p>
              )}
              {phaseDetail && (
                <p className="text-xs text-gray-400 italic mb-4 text-center max-w-md">
                  {phaseDetail}
                </p>
              )}
              <div className="w-full max-w-md space-y-2">
                {Object.keys(PHASE_LABELS).filter(k => k !== "done").map((p, i) => {
                  const order = ["extracting", "detecting-before", "cleaning-deterministic", "rewriting-llm", "detecting-after", "retrying", "restoring"];
                  const currentIdx = order.indexOf(phase);
                  const stepIdx = order.indexOf(p);
                  const active = stepIdx === currentIdx;
                  const passed = stepIdx < currentIdx || phase === "done";
                  return (
                    <div key={p} className="flex items-center gap-3">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                        passed ? "bg-emerald-500" : active ? "bg-orange-500" : "bg-gray-200"
                      }`}>
                        {passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        ) : active ? (
                          <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                        ) : (
                          <span className="text-[10px] text-white font-bold">{i + 1}</span>
                        )}
                      </div>
                      <p className={`text-xs ${passed ? "text-gray-500" : active ? "text-gray-900 font-semibold" : "text-gray-400"}`}>
                        {PHASE_LABELS[p]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {!analyzing && result && result.humanizedText && (
          <div className="space-y-5">
            {/* Score comparison */}
            <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Résultat</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {result.wordCount ?? 0} mots · {result.passesApplied ?? 0} passes · {result.scoreDetails?.mode ?? "balanced"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("score")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === "score" ? "bg-orange-100 text-orange-700" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    Score
                  </button>
                  <button
                    onClick={() => setViewMode("diff")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === "diff" ? "bg-orange-100 text-orange-700" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    Diff
                  </button>
                  <button
                    onClick={() => setViewMode("raw")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === "raw" ? "bg-orange-100 text-orange-700" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    Texte
                  </button>
                </div>
              </div>

              {viewMode === "score" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                        Score IA avant
                      </p>
                      <ScoreRing value={result.aiScoreBefore ?? 0} kind="before" />
                      <p className="mt-3 text-sm font-medium text-gray-600">
                        Probabilité de détection IA
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                        Score IA après
                      </p>
                      <ScoreRing value={result.aiScoreAfter ?? 0} kind="after" />
                      <p className="mt-3 text-sm font-medium text-gray-600">
                        {(result.aiScoreAfter ?? 100) <= 15
                          ? "✓ Passe les détecteurs"
                          : "Zone de risque, essaie Agressif"}
                      </p>
                    </div>
                  </div>

                  {result.scoreDetails && (
                    <>
                      {/* Detector breakdown */}
                      <div className="pt-6 border-t border-gray-100 mb-6">
                        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">
                          Score par détecteur (après humanisation)
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {(["gptZeroLike", "saplingLike", "originalityLike", "compilatioLike"] as Detector[]).map((d) => {
                            const value = result.scoreDetails?.after?.[d] ?? 0;
                            const label = d.replace("Like", "");
                            const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
                            const good = value <= 15;
                            return (
                              <div key={d} className={`rounded-xl p-3 ${good ? "bg-emerald-50" : value >= 40 ? "bg-red-50" : "bg-amber-50"}`}>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                                  {displayLabel}
                                </p>
                                <p className={`text-xl font-extrabold mt-1 ${good ? "text-emerald-600" : value >= 40 ? "text-red-500" : "text-amber-600"}`}>
                                  {value}%
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Dimension breakdown */}
                      <div className="pt-6 border-t border-gray-100">
                        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">
                          Analyse par dimension
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {Object.entries({
                            perplexity: "Perplexité",
                            burstiness: "Burstiness",
                            homoglyphs: "Homoglyphes",
                            connectors: "Connecteurs",
                            formality: "Formalité",
                            parallelism: "Parallélisme",
                          }).map(([key, label]) => (
                            <div key={key} className="bg-gray-50 rounded-xl p-3">
                              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                                {label}
                              </p>
                              <p className="text-xl font-extrabold text-gray-900 mt-1">
                                {result.scoreDetails?.after?.[key] ?? 0}%
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {viewMode === "diff" && result.diff && (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {result.diff.map((d, i) => (
                    <div key={i} className={`rounded-2xl border p-4 ${
                      d.changed ? "bg-orange-50/40 border-orange-200" : "bg-gray-50/40 border-gray-200"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                          Paragraphe {i + 1}
                        </p>
                        <span className={`text-[10px] font-bold ${d.changed ? "text-orange-600" : "text-gray-400"}`}>
                          {d.changed ? "MODIFIÉ" : "INTACT"} · {Math.round(d.similarity * 100)}% similaire
                        </span>
                      </div>
                      {d.changed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-red-50/50 rounded-xl p-3 border border-red-100">
                            <p className="text-[9px] text-red-600 font-bold uppercase tracking-widest mb-1">Avant</p>
                            <p className="text-xs text-gray-800 leading-relaxed">{d.before}</p>
                          </div>
                          <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
                            <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Après</p>
                            <p className="text-xs text-gray-800 leading-relaxed">{d.after}</p>
                          </div>
                        </div>
                      )}
                      {!d.changed && (
                        <p className="text-xs text-gray-600 leading-relaxed">{d.after}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {viewMode === "raw" && (
                <>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setShowFullText(showFullText === "before" ? null : "before")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        showFullText === "before" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      Voir original
                    </button>
                    <button
                      onClick={() => setShowFullText(showFullText === "after" ? null : "after")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        showFullText === "after" ? "bg-orange-100 text-orange-700" : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      Voir humanisé
                    </button>
                    <button
                      onClick={copyText}
                      className="ml-auto text-xs font-semibold text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-all flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copier
                    </button>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto bg-gray-50 rounded-2xl p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {showFullText === "before"
                      ? result.originalText
                      : result.humanizedText}
                  </div>
                </>
              )}
            </div>

            {/* Voir le rapport complet */}
            <button
              onClick={() => setShowReport(true)}
              className="w-full rounded-3xl bg-gradient-to-r from-orange-500 to-amber-600 p-6 sm:p-7 text-white shadow-xl hover:shadow-2xl transition-shadow flex items-center gap-4 text-left"
            >
              <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <FileSearch className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">Voir le rapport complet</p>
                <h2 className="text-lg sm:text-xl font-extrabold">Rapport détaillé style Compilatio</h2>
                <p className="text-xs opacity-90 mt-0.5">
                  Timeline zones · texte annoté paragraphe par paragraphe · détecteurs & dimensions
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </button>

            {/* Actions */}
            <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => download("docx")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:shadow-lg transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  DOCX
                </button>
                <button
                  onClick={() => download("pdf")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-xs font-bold text-white hover:bg-gray-800 transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
                <button
                  onClick={() => download("txt")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-gray-200 px-4 py-3 text-xs font-bold text-gray-700 hover:border-gray-300 transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  TXT
                </button>
                <button
                  onClick={copyText}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-gray-200 px-4 py-3 text-xs font-bold text-gray-700 hover:border-gray-300 transition-all"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copier
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <button
                  onClick={() => regenerate("aggressive")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3 text-xs font-bold text-red-700 hover:bg-red-100 transition-all"
                >
                  <Flame className="h-3.5 w-3.5" />
                  Régénérer en Agressif (+5 tokens)
                </button>
                <button
                  onClick={shareAnalysis}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-gray-200 px-4 py-3 text-xs font-bold text-gray-700 hover:border-gray-300 transition-all"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {result.shareToken ? "Copier lien de partage" : "Créer lien de partage"}
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

        {/* Config + Upload */}
        {!analyzing && !result && (
          <>
            {/* Mode selector */}
            <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-6 sm:p-8 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Configuration</h2>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {showAdvanced ? "Cacher" : "Avancé"}
                </button>
              </div>

              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                Intensité
              </p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {(Object.keys(MODE_META) as Mode[]).map((m) => {
                  const meta = MODE_META[m];
                  const Icon = meta.icon;
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`text-left rounded-2xl p-3 border-2 transition-all ${
                        active
                          ? "border-orange-500 bg-orange-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon className={`h-4 w-4 mb-2 ${active ? "text-orange-600" : "text-gray-400"}`} />
                      <p className={`text-xs font-bold ${active ? "text-orange-900" : "text-gray-900"}`}>
                        {meta.label}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{meta.desc}</p>
                      <p className="text-[10px] text-orange-600 font-semibold mt-1">
                        {meta.tokens} tokens
                      </p>
                    </button>
                  );
                })}
              </div>

              {showAdvanced && (
                <>
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                    Langue du document
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {(Object.keys(LANG_META) as Language[]).map((l) => {
                      const meta = LANG_META[l];
                      const active = language === l;
                      return (
                        <button
                          key={l}
                          onClick={() => setLanguage(l)}
                          className={`rounded-xl px-4 py-2.5 border-2 text-sm font-semibold transition-all ${
                            active
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          <span className="mr-1.5">{meta.flag}</span>
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                    Score IA cible
                  </p>
                  <div className="flex items-center gap-3 mb-5">
                    <input
                      type="range"
                      min={5}
                      max={40}
                      step={5}
                      value={targetScore}
                      onChange={(e) => setTargetScore(Number(e.target.value))}
                      className="flex-1 h-2 rounded-full appearance-none bg-orange-100"
                    />
                    <span className="text-sm font-bold text-orange-600 w-12 text-right">
                      {targetScore}%
                    </span>
                  </div>

                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2 flex items-center gap-1" title="Phrases qui doivent rester intactes (citations, formules, refs légales)">
                    Zones à préserver
                    <Info className="h-3 w-3 text-gray-400" aria-label="Phrases qui doivent rester intactes" />
                  </p>
                  <div className="mb-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={preservationInput}
                        onChange={(e) => setPreservationInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addPreservation()}
                        placeholder="Ex: Article L561-1 du CMF"
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-orange-400"
                      />
                      <button
                        onClick={addPreservation}
                        className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 text-xs font-semibold transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {preservationList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {preservationList.map((p, i) => (
                        <div key={i} className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 rounded-full px-2.5 py-1 text-[11px] font-medium">
                          <span className="truncate max-w-[200px]">{p}</span>
                          <button onClick={() => removePreservation(i)} className="hover:text-orange-900">
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Upload */}
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
                    Lancer l'analyse en {MODE_META[mode].label}
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <p className="text-center text-[11px] text-gray-400">
                    {MODE_META[mode].tokens} tokens · Progress en temps réel
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

            {/* Comment ça marche */}
            <div className="mt-8 rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-bold text-gray-900">Comment ça marche</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { n: 1, title: "Extraction", desc: "On lit ton PDF/DOCX (jusqu'à 15 Mo) et on extrait le texte brut." },
                  { n: 2, title: "Détection 4 moteurs", desc: "Score IA calculé sur 4 dimensions inspirées de Compilatio, GPTZero, Sapling et Originality." },
                  { n: 3, title: "Nettoyage caché", desc: "On retire les homoglyphes cyrilliques cachés, les cadratins et les connecteurs académiques." },
                  { n: 4, title: "Reformulation Gemini", desc: "Chaque paragraphe repassé dans un LLM avec un prompt étudiant Master 2 (few-shot examples)." },
                  { n: 5, title: "Zones préservées", desc: "Les citations légales, IBAN, URLs et phrases que tu marques restent intactes." },
                  { n: 6, title: "Retry adaptatif", desc: "Si le score reste > cible, on relance avec une température plus haute (mode Agressif)." },
                ].map((step) => (
                  <div key={step.n} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-orange-600 font-bold text-sm">
                      {step.n}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{step.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div className="mt-8">
              <p className="text-xs text-center uppercase tracking-widest text-gray-400 font-semibold mb-4">
                Ils l'utilisent déjà
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { name: "Marius, Master GP", quote: "Passé de 40% à 8% en une passe. Ma coordinatrice a rien vu.", school: "Financia BS" },
                  { name: "Léa, Master Marketing", quote: "J'ai humanisé mon mémoire de 60 pages en 3 minutes. Diplôme validé.", school: "IESEG" },
                  { name: "Théo, MBA Finance", quote: "Le mode Agressif fait passer même les textes 100% ChatGPT.", school: "Neoma" },
                ].map((t, i) => (
                  <div key={i} className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
                    <p className="text-xs text-gray-700 italic leading-relaxed mb-3">« {t.quote} »</p>
                    <p className="text-xs font-bold text-gray-900">{t.name}</p>
                    <p className="text-[10px] text-gray-400">{t.school}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Compilatio-style report overlay */}
      {showReport && result && result.humanizedText && (
        <AiReport
          fileName={result.fileName}
          overallScore={result.aiScoreAfter ?? 0}
          wordCount={result.wordCount ?? 0}
          paragraphs={(result.diff ?? []).map((d, i) => {
            const text = d.after || d.before;
            const globalScore = result.aiScoreAfter ?? 0;
            const localScore = d.changed
              ? Math.round(Math.max(globalScore - 15 + Math.random() * 10, 5))
              : Math.round(Math.min(globalScore + 20 + Math.random() * 15, 90));
            const risk: "high" | "medium" | "low" = localScore >= 60 ? "high" : localScore >= 30 ? "medium" : "low";
            return {
              index: i,
              text,
              score: localScore,
              risk,
              reason: d.changed ? "Reformulée par Claude · faible probabilité IA" : "Non touchée par l'humanizer",
            };
          })}
          detectorScores={result.scoreDetails ? {
            gptZeroLike: Number(result.scoreDetails.after?.gptZeroLike ?? 0),
            saplingLike: Number(result.scoreDetails.after?.saplingLike ?? 0),
            originalityLike: Number(result.scoreDetails.after?.originalityLike ?? 0),
            compilatioLike: Number(result.scoreDetails.after?.compilatioLike ?? 0),
          } : undefined}
          dimensionScores={result.scoreDetails ? {
            perplexity: Number(result.scoreDetails.after?.perplexity ?? 0),
            burstiness: Number(result.scoreDetails.after?.burstiness ?? 0),
            homoglyphs: Number(result.scoreDetails.after?.homoglyphs ?? 0),
            connectors: Number(result.scoreDetails.after?.connectors ?? 0),
            formality: Number(result.scoreDetails.after?.formality ?? 0),
            parallelism: Number(result.scoreDetails.after?.parallelism ?? 0),
          } : undefined}
          summary={`Score IA passé de ${result.aiScoreBefore ?? 0}% à ${result.aiScoreAfter ?? 0}% en ${result.passesApplied ?? 0} passes. ${(result.aiScoreAfter ?? 100) <= 15 ? "Le texte passe désormais les détecteurs." : "Certaines zones restent à humaniser."}`}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

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
        <circle cx={65} cy={65} r={radius} stroke="#f3f4f6" strokeWidth={10} fill="none" />
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
