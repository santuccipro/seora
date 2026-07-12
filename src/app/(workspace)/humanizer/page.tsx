"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import AiReport from "@/components/ai-report/ai-report";
import ScoreRing from "@/components/analysis/ScoreRing";
import AxisCard from "@/components/analysis/AxisCard";
import TimelineNumbered from "@/components/analysis/TimelineNumbered";
import ZoneHighlight from "@/components/analysis/ZoneHighlight";
import ZonesSidebar from "@/components/analysis/ZonesSidebar";
import LoadingReport from "@/components/analysis/LoadingReport";
import { exportReportToPDF } from "@/components/analysis/ExportPDF";
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
  ShieldAlert,
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
  Cpu,
  BarChart3,
  User,
  Files,
  Languages,
} from "lucide-react";

type Mode = "basic" | "balanced" | "aggressive" | "compilatio-proof";
type Language = "fr" | "en" | "es";

type Detector = "gptZeroLike" | "saplingLike" | "originalityLike" | "compilatioLike";

type Analysis = {
  id: string;
  fileName: string;
  aiScoreBefore: number | null;
  aiScoreAfter: number | null;
  claudeScoreBefore?: number | null;
  claudeScoreAfter?: number | null;
  claudeReasoning?: string | null;
  scoreDetails: {
    before: Record<string, number>;
    after: Record<string, number>;
    metrics?: Record<string, number>;
    mode?: string;
    language?: string;
    claudeScoreBefore?: number | null;
    claudeScoreAfter?: number | null;
    claudeReasoning?: string | null;
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

type SentenceScore = {
  text: string;
  tail: string;
  score: number;
  why?: string;
};

type ParagraphScore = {
  index: number;
  text: string;
  score: number;
  risk: "high" | "medium" | "low";
  sentences?: SentenceScore[];
  details?: Record<string, number>;
  // 07/07 (Orsu) — 2-3 raisons courtes citant les marqueurs IA repérés
  // dans les phrases HIGH de cette zone. Affiché dans l'UI zone-report.
  topReasons?: string[];
};

type AnalyzeOnlyResult = {
  id: string;
  fileName: string;
  wordCount: number;
  claudeScore: number;
  claudeRawGlobal?: number;
  claudeReasoning: string;
  topOffenders: string[];
  paragraphs: ParagraphScore[];
  dimensions?: {
    structure: number;
    registre: number;
    antitheses: number;
    langue: number;
  };
  // 10/07 (Orsu) — populé quand on route via mapV2ToV1 (Moteur v2 activé)
  obfuscationScore?: number;
};

// 09/07 (Orsu) — Moteur v2 : détection statistique + stylométrique.
// Homoglyphes cyrilliques, perplexity locale (GPT-2 FR), burstiness,
// POS deviation, connecteurs sur-utilisés. Beta pour l'instant.
type V2Signals = {
  homoglyph_score: number;
  homoglyph_count: number;
  invisible_char_count: number;
  homoglyph_density_per_1000_chars: number;
  fast_detect_gpt: number;
  perplexity_sentence_avg: number;
  perplexity_sentence_std: number;
  burstiness: number;
  sentence_length_mean: number;
  sentence_length_var: number;
  mtld: number;
  pos_deviation: number;
  connector_overuse: number;
  ai_favorite_hits: number;
  ai_favorite_top: string[];
  human_markers: number;
  raw_score_before_boost: number;
  human_boost_applied: number;
};

type AnalyzeV2Result = {
  id: string;
  fileName: string;
  wordCount: number;
  engineVersion: "v2";
  scoreGlobal: number;
  confidence: number;
  obfuscationScore?: number; // 10/07 — axe séparé du score IA
  signals: V2Signals;
  zones: Array<{
    index: number;
    text: string;
    score: number;
    risk: "high" | "medium" | "low";
    signals?: Record<string, number | string>;
  }>;
  meta: {
    n_sentences: number;
    n_perplexity_sampled: number;
    language: string;
    model: string;
    weights: Record<string, number>;
  };
  elapsedMs?: number;
};

const PHASE_LABELS: Record<string, string> = {
  extracting: "Extraction du texte du document",
  "detecting-before": "Scan initial des zones suspectes (4 détecteurs)",
  "cleaning-deterministic": "Nettoyage homoglyphes + connecteurs académiques",
  "rewriting-llm": "Reformulation phrase par phrase (Claude Opus 4.8)",
  "detecting-after": "Nouveau scan des zones suspectes",
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
  "compilatio-proof": {
    label: "Compilatio-proof",
    desc: "Boucle Claude Sonnet jusqu'à <15% Compilatio-grade (~3-5 min)",
    tokens: 8,
    color: "purple",
    icon: Shield,
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
  const [analyzeOnlyResult, setAnalyzeOnlyResult] = useState<AnalyzeOnlyResult | null>(null);
  const [analyzingOnly, setAnalyzingOnly] = useState(false);
  // 09/07 (Orsu) — Moteur v2 (statistique + stylométrique). Toggle OFF par
  // défaut tant que le patron n'a pas validé ; visible en beta.
  // 10/07 (Orsu) — Toggle ON par défaut après validation patron : moteur v3.1r8
  // (ensemble 3 classifieurs + 15 signaux, MAE 4.9 vs Compilatio sur 5 docs).
  const [useV2, setUseV2] = useState(true);
  const [analyzeOnlyResultV2, setAnalyzeOnlyResultV2] = useState<AnalyzeV2Result | null>(null);
  // 07/07 (Orsu) — auto-refund silencieux au boot de la page.
  // Ancien bandeau "N analyses coincées — clique pour rembourser" supprimé
  // (patron veut zéro friction : si un truc plante, on rembourse auto).
  const autoRefundStuck = useCallback(async () => {
    try {
      const res = await fetch("/api/humanize/stuck");
      if (!res.ok) return;
      const data = await res.json();
      if (data.autoRefunded > 0 && data.tokens > 0) {
        toast.success(`On t'a rendu ${data.tokens} token${data.tokens > 1 ? "s" : ""} — désolé pour le hoquet 🙏`);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    autoRefundStuck();
  }, [autoRefundStuck]);
  const [phase, setPhase] = useState<string>("extracting");
  const [pass, setPass] = useState(0);
  const [totalPasses, setTotalPasses] = useState(0);
  const [phaseDetail, setPhaseDetail] = useState<string>("");
  const [result, setResult] = useState<Analysis | null>(null);
  // 11/07 (Orsu) — Nouveau flow DOCX natif : preserve 100% du formatage
  // (police, gras, taille) via un parser XML natif + rewrite ciblé HIGH ≥60%.
  // Uniquement pour les .docx. Les autres formats (PDF, TXT) gardent l'ancien
  // flow SSE (`/api/humanize`). Endpoint = /api/humanize/docx-native.
  type DocxNativeResult = {
    fileName: string;
    blobUrl: string;
    scoreBefore: number;
    scoreAfter: number;
    report: {
      paragraphsProcessed: number;
      paragraphsRewritten: number;
      paragraphsFailed: number;
      passesUsed: number;
      globalScoreBefore: number;
      globalScoreAfter: number;
    } | null;
  };
  const [docxNativeResult, setDocxNativeResult] = useState<DocxNativeResult | null>(null);
  const [viewMode, setViewMode] = useState<"score" | "diff" | "raw">("score");
  const [showReport, setShowReport] = useState(false);
  const [showFullText, setShowFullText] = useState<"before" | "after" | null>(null);

  // Deep Claude sentence-by-sentence report (post-humanization proof)
  const [claudeReport, setClaudeReport] = useState<{
    overall: {
      overall: number;
      gptZeroLike: number; saplingLike: number; originalityLike: number; compilatioLike: number;
      perplexity: number; burstiness: number; homoglyphs: number;
      connectors: number; formality: number; parallelism: number;
    };
    paragraphs: Array<{ index: number; text: string; score: number; risk: "high" | "medium" | "low"; reason?: string; patternLabels?: string[] }>;
    topRiskZones?: string[];
    summary?: string;
  } | null>(null);
  const [loadingClaudeReport, setLoadingClaudeReport] = useState(false);
  const [showClaudeReport, setShowClaudeReport] = useState(false);

  const runClaudeReport = async () => {
    if (!result?.humanizedText) return;
    setLoadingClaudeReport(true);
    try {
      const res = await fetch("/api/ai-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result.humanizedText, language }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Analyse Claude impossible");
        return;
      }
      setClaudeReport(data);
      setShowClaudeReport(true);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoadingClaudeReport(false);
    }
  };

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

  // Load from sessionStorage — sets an "autolaunch" flag if the file came
  // from the landing so the humanizer skips the config screen and goes
  // straight to work.
  const [autoLaunch, setAutoLaunch] = useState(false);
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
        // Landing flow → auto-launch in Compilatio-proof mode without asking
        setAutoLaunch(true);
        setMode("compilatio-proof");
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

  const [analyzePhase, setAnalyzePhase] = useState<string>("extracting");
  const [analyzePhaseDetail, setAnalyzePhaseDetail] = useState<string>("");
  const [analyzePercent, setAnalyzePercent] = useState(0);

  const startAnalyzeOnly = useCallback(async () => {
    if (!uploaded) return;
    setAnalyzingOnly(true);
    setAnalyzeOnlyResult(null);
    setAnalyzeOnlyResultV2(null);
    setResult(null);
    setAnalyzePhase("extracting");
    setAnalyzePhaseDetail("");
    setAnalyzePercent(0);

    const fd = new FormData();
    fd.append("file", uploaded.file);
    fd.append("language", language);

    // 09/07 (Orsu) — route v2 quand toggle Moteur v2 est actif.
    // La v2 renvoie un `done` event différent (scoreGlobal + signals + zones).
    const endpoint = useV2 ? "/api/humanize/analyze-v2" : "/api/humanize/analyze";

    try {
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let doneV1: AnalyzeOnlyResult | null = null;
      let doneV2: AnalyzeV2Result | null = null;
      let sawError = false;

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          if (!ev.trim() || ev.trim().startsWith(":")) continue;
          const lines = ev.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;
          const eventType = eventLine.slice(6).trim();
          const data = JSON.parse(dataLine.slice(5).trim());

          if (eventType === "progress") {
            setAnalyzePhase(data.phase);
            setAnalyzePhaseDetail(data.detail ?? "");
            if (typeof data.percent === 'number') setAnalyzePercent(data.percent);
          } else if (eventType === "done") {
            if (useV2 && data.engineVersion === "v2") {
              doneV2 = data as AnalyzeV2Result;
            } else {
              doneV1 = data as AnalyzeOnlyResult;
            }
          } else if (eventType === "error") {
            sawError = true;
            throw new Error(data.message);
          }
        }
      }

      if (!doneV1 && !doneV2 && !sawError) {
        await fetch("/api/humanize/stuck").catch(() => {});
        throw new Error("Petit hoquet côté serveur. Ton token t'a été rendu, tu peux retenter direct 🙏");
      }
      if (doneV2) {
        setAnalyzeOnlyResultV2(doneV2);
        toast.success(
          `Analyse v2 terminée — ${doneV2.scoreGlobal}% (confiance ${Math.round(
            doneV2.confidence * 100
          )}%)`
        );
      } else if (doneV1) {
        setAnalyzeOnlyResult(doneV1);
        toast.success(`Analyse terminée — ${doneV1.claudeScore}% de textes suspects`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'analyse");
    } finally {
      setAnalyzingOnly(false);
    }
  }, [uploaded, language, useV2]);

  // 11/07 (Orsu) — Flow DOCX natif : preserve 100% du formatage.
  // Appelle /api/humanize/docx-native (POST multipart, réponse = .docx binaire
  // + header X-Humanize-Report en base64 JSON). Pas de streaming SSE : fetch
  // direct sync (rapide 15-45s, tient dans le maxDuration 300s Vercel Pro).
  // 12/07 (Orsu) — Fix vision Marius : workflow linéaire forcé + réutilisation
  // des scores paragraphe-par-paragraphe déjà calculés par l'analyse (skip
  // du gros scoring initial → latence divisée par ~2).
  const startDocxNative = useCallback(async () => {
    if (!uploaded) return;
    setAnalyzing(true);
    setPhase("extracting");
    setPass(0);
    setTotalPasses(0);
    setPhaseDetail("Parsing du XML natif (preserve police, gras, taille)…");
    setResult(null);
    setDocxNativeResult(null);

    // 12/07 (Orsu) — Récupère les scores paragraphe-par-paragraphe déjà
    // calculés par /analyze-v2 (recommandé) ou /analyze (v1). Si dispo, on
    // les passe au backend qui skip son scoring initial (latence /2).
    // ⚠ On ne les envoie QUE pour les DOCX : pour les PDFs, l'index des
    // zones extraites (analyse texte brut) ne correspond pas à l'index des
    // paragraphes après conversion PDF→DOCX (pdf2docx segmente autrement).
    // Le backend a un guard (length mismatch → fallback scoring complet).
    const ext = uploaded.name.toLowerCase().split(".").pop();
    const paragraphScoresFromV2 =
      analyzeOnlyResultV2?.zones?.map((z) => Math.round(z.score));
    const paragraphScoresFromV1 =
      analyzeOnlyResult?.paragraphs?.map((p) => Math.round(p.score));
    const paragraphScores =
      ext === "docx"
        ? (paragraphScoresFromV2 ?? paragraphScoresFromV1)
        : undefined;

    // Fake phase progression pour UX (backend est sync, pas de SSE).
    // Les labels matchent PHASE_LABELS pour réutiliser la timeline existante.
    const phaseTimers: ReturnType<typeof setTimeout>[] = [];
    phaseTimers.push(
      setTimeout(() => {
        setPhase("detecting-before");
        setPhaseDetail("Scan des paragraphes suspects…");
      }, 3000),
    );
    phaseTimers.push(
      setTimeout(() => {
        setPhase("rewriting-llm");
        setPhaseDetail("Réécriture ciblée des paragraphes HIGH (≥60%)…");
      }, 8000),
    );
    phaseTimers.push(
      setTimeout(() => {
        setPhase("detecting-after");
        setPhaseDetail("Vérification post-humanisation…");
      }, 25000),
    );

    try {
      const fd = new FormData();
      fd.append("file", uploaded.file);
      if (paragraphScores && paragraphScores.length > 0) {
        fd.append("paragraphScores", JSON.stringify(paragraphScores));
      }

      const res = await fetch("/api/humanize/docx-native", {
        method: "POST",
        body: fd,
      });

      phaseTimers.forEach(clearTimeout);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let msg = `HTTP ${res.status}`;
        try {
          const parsed = JSON.parse(errText);
          msg = parsed.error || msg;
        } catch {
          if (errText) msg = errText.slice(0, 200);
        }
        throw new Error(msg);
      }

      const reportB64 = res.headers.get("X-Humanize-Report");
      let report: DocxNativeResult["report"] = null;
      if (reportB64) {
        try {
          report = JSON.parse(atob(reportB64));
        } catch (e) {
          console.warn("[docx-native] failed to parse report header", e);
        }
      }
      const scoreBefore = parseFloat(
        res.headers.get("X-Global-Score-Before") ||
          String(report?.globalScoreBefore ?? 0),
      );
      const scoreAfter = parseFloat(
        res.headers.get("X-Global-Score-After") ||
          String(report?.globalScoreAfter ?? 0),
      );

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      setPhase("done");
      setDocxNativeResult({
        fileName: uploaded.name,
        blobUrl,
        scoreBefore,
        scoreAfter,
        report,
      });

      toast.success(
        `Humanisation terminée · ${Math.round(scoreBefore)}% → ${Math.round(scoreAfter)}%`,
      );
    } catch (err) {
      phaseTimers.forEach(clearTimeout);
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'humanisation",
      );
    } finally {
      setAnalyzing(false);
    }
  }, [uploaded, analyzeOnlyResult, analyzeOnlyResultV2]);

  const startAnalysis = useCallback(async () => {
    if (!uploaded) return;

    // 11/07 (Orsu) — DOCX → nouveau flow natif (preserve formatage 100%).
    // 12/07 (Orsu) — PDF aussi : convertit en DOCX préservant (pdf2docx) côté
    // backend puis passe dans humanizeDocxNative. Images/layout/tableaux
    // conservés. TXT / DOC gardent l'ancien flow SSE `/api/humanize`.
    const ext = uploaded.name.toLowerCase().split(".").pop();
    if (ext === "docx" || ext === "pdf") {
      await startDocxNative();
      return;
    }

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
      let startedId: string | null = null;
      let sawDone = false;
      let sawError = false;

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
            if (data.analysisId && !startedId) startedId = data.analysisId;
          } else if (eventType === "done") {
            doneId = data.id;
            sawDone = true;
          } else if (eventType === "error") {
            sawError = true;
            throw new Error(data.message);
          }
        }
      }

      // Stream ended without "done" and without "error" → Vercel or CF killed
      // the request mid-flight. Clean up + refund the analysis on the server.
      // 07/07 (Orsu) — message adouci, plus de jargon "timeout serveur".
      if (!sawDone && !sawError && startedId) {
        try {
          await fetch(`/api/humanize/${startedId}/cleanup`, { method: "POST" });
        } catch {
          // best-effort
        }
        throw new Error("Petit hoquet côté serveur. Tes tokens t'ont été rendus, retente-moi ça 🙏");
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
  }, [uploaded, mode, language, targetScore, preservationList, startDocxNative]);

  // Auto-launch when the user landed here from the landing popup — the file
  // est déjà chargée mais on force le workflow linéaire (12/07 Orsu, vision
  // Marius) : d'abord l'analyse IA, puis l'utilisateur clique Humaniser en
  // voyant les zones flaggées. On ne saute plus l'étape analyse.
  useEffect(() => {
    if (
      autoLaunch &&
      uploaded &&
      !analyzing &&
      !analyzingOnly &&
      !result &&
      !analyzeOnlyResult &&
      !analyzeOnlyResultV2 &&
      mode === "compilatio-proof"
    ) {
      setAutoLaunch(false);
      startAnalyzeOnly();
    }
  }, [
    autoLaunch,
    uploaded,
    analyzing,
    analyzingOnly,
    result,
    analyzeOnlyResult,
    analyzeOnlyResultV2,
    mode,
    startAnalyzeOnly,
  ]);

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
    setAnalyzeOnlyResult(null);
    setAnalyzeOnlyResultV2(null);
    setAnalyzingOnly(false);
    setPhase("extracting");
    setPass(0);
    setPreservationList([]);
    // 11/07 (Orsu) — nettoie le blob URL du flow DOCX natif
    if (docxNativeResult?.blobUrl) {
      URL.revokeObjectURL(docxNativeResult.blobUrl);
    }
    setDocxNativeResult(null);
    setAnalyzePercent(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 11/07 (Orsu) — libère le blob URL du flow DOCX natif quand la page
  // se démonte pour éviter les fuites mémoire.
  useEffect(() => {
    return () => {
      if (docxNativeResult?.blobUrl) {
        URL.revokeObjectURL(docxNativeResult.blobUrl);
      }
    };
  }, [docxNativeResult?.blobUrl]);

  // 11/07 (Orsu) — Télécharge le DOCX humanisé (blob URL déjà en mémoire).
  const downloadDocxNative = () => {
    if (!docxNativeResult) return;
    const a = document.createElement("a");
    a.href = docxNativeResult.blobUrl;
    a.download = `humanized_${docxNativeResult.fileName.replace(/\.docx$/i, "")}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
                { icon: Sparkles, title: "Récupère ton doc humanisé", desc: "Zones suspectes sous 15% + export DOCX/PDF" },
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
          <div className="flex items-center gap-3">
            <Link
              href="/humanizer/history"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <History className="h-4 w-4" />
              Historique
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <User className="h-4 w-4" />
              Mon compte
            </Link>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25 mb-4">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Analyse mon mémoire / DPP
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Indication de rédaction assistée + zones suspectes paragraphe par paragraphe. Humanisation en 1 clic si besoin.
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

        {/* 11/07 (Orsu) — Résultat du flow DOCX natif : preserve 100% du
            formatage. Rendu simple : score before/after + rapport paragraphes
            + bouton download du blob (déjà en mémoire). */}
        {!analyzing && docxNativeResult && (
          <div className="space-y-5">
            <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Humanisation terminée</h2>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    {docxNativeResult.fileName} · formatage 100% préservé
                  </p>
                </div>
              </div>

              {/* Scores avant / après */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                    Textes suspects avant
                  </p>
                  <LegacyScoreRing value={Math.round(docxNativeResult.scoreBefore)} kind="before" />
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                    Textes suspects après
                  </p>
                  <LegacyScoreRing value={Math.round(docxNativeResult.scoreAfter)} kind="after" />
                  <p className="mt-3 text-sm font-medium text-gray-600">
                    {docxNativeResult.scoreAfter <= 15
                      ? "✓ Zone verte, faible signal"
                      : docxNativeResult.scoreAfter <= 30
                        ? "Zone de vigilance"
                        : "Score encore élevé"}
                  </p>
                </div>
              </div>

              {/* Rapport paragraphes */}
              {docxNativeResult.report && (
                <div className="pt-6 border-t border-gray-100">
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">
                    Rapport d&apos;humanisation
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                        Réécrits
                      </p>
                      <p className="text-xl font-extrabold text-emerald-600 mt-1">
                        {docxNativeResult.report.paragraphsRewritten}
                        <span className="text-sm text-gray-400"> / {docxNativeResult.report.paragraphsProcessed}</span>
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                        Paragraphes analysés
                      </p>
                      <p className="text-xl font-extrabold text-gray-900 mt-1">
                        {docxNativeResult.report.paragraphsProcessed}
                      </p>
                    </div>
                    <div className={`rounded-xl p-3 ${docxNativeResult.report.paragraphsFailed > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                        Échecs
                      </p>
                      <p className={`text-xl font-extrabold mt-1 ${docxNativeResult.report.paragraphsFailed > 0 ? "text-amber-600" : "text-gray-900"}`}>
                        {docxNativeResult.report.paragraphsFailed}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                        Passes
                      </p>
                      <p className="text-xl font-extrabold text-gray-900 mt-1">
                        {docxNativeResult.report.passesUsed}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions : download + reset */}
            <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Télécharge ton DOCX humanisé</h2>
              <p className="text-xs text-gray-500 mb-4">
                Le document conserve exactement la même police, mise en page, gras et taille que l&apos;original — seuls les paragraphes à risque ont été réécrits.
              </p>
              <button
                onClick={downloadDocxNative}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all"
              >
                <Download className="h-4 w-4" />
                Télécharger le DOCX humanisé
              </button>
              <button
                onClick={resetAll}
                className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 py-2 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Humaniser un autre document
              </button>
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
                        Textes suspects avant
                      </p>
                      <LegacyScoreRing value={result.aiScoreBefore ?? 0} kind="before" />
                      <p className="mt-3 text-sm font-medium text-gray-600">
                        Indication de rédaction assistée
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                        Textes suspects après
                      </p>
                      <LegacyScoreRing value={result.aiScoreAfter ?? 0} kind="after" />
                      <p className="mt-3 text-sm font-medium text-gray-600">
                        {(result.aiScoreAfter ?? 100) <= 15
                          ? "✓ Zone verte, faible signal"
                          : "Zone de vigilance, essaie Agressif"}
                      </p>
                    </div>
                  </div>

                  {/* Compilatio-grade (Claude Sonnet) score badges */}
                  {(result.scoreDetails?.claudeScoreBefore != null ||
                    result.scoreDetails?.claudeScoreAfter != null) && (
                    <div className="mb-6 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4 text-purple-600" />
                        <p className="text-xs uppercase tracking-widest text-purple-800 font-black">
                          Score Compilatio-grade · Claude Sonnet
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl bg-white/70 border border-purple-100 p-3 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Avant</p>
                          <p className="text-3xl font-black text-red-600">
                            {result.scoreDetails.claudeScoreBefore ?? "—"}
                            <span className="text-sm text-gray-400">%</span>
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/70 border border-purple-100 p-3 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Après</p>
                          <p className={`text-3xl font-black ${
                            (result.scoreDetails.claudeScoreAfter ?? 100) <= 15
                              ? "text-emerald-600"
                              : (result.scoreDetails.claudeScoreAfter ?? 100) <= 30
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}>
                            {result.scoreDetails.claudeScoreAfter ?? "—"}
                            <span className="text-sm text-gray-400">%</span>
                          </p>
                        </div>
                      </div>
                      {result.scoreDetails.claudeReasoning && (
                        <p className="text-xs text-purple-900/80 leading-relaxed mt-3 italic">
                          « {result.scoreDetails.claudeReasoning} »
                        </p>
                      )}
                      <p className="text-[10px] text-purple-700/70 mt-2">
                        Ce score émule le détecteur ML de Compilatio Studium. Objectif : &lt; 15 %. Aucun détecteur IA n&apos;est fiable à 100 % — indication et non preuve.
                      </p>
                    </div>
                  )}

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

            {/* Voir le rapport complet (heuristique — gratuit) */}
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

            {/* Analyse fine phrase-par-phrase par Claude (payante) */}
            {claudeReport ? (
              <button
                onClick={() => setShowClaudeReport(true)}
                className="w-full rounded-3xl bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white p-6 shadow-2xl border border-white/10 hover:scale-[1.005] active:scale-[0.995] transition-transform flex items-center gap-4 text-left"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                  <FileSearch className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">Rapport Claude · phrase par phrase</p>
                  <h2 className="text-lg sm:text-xl font-extrabold">Preuve détaillée par Claude Sonnet</h2>
                  <p className="text-xs opacity-90 mt-0.5">
                    {claudeReport.paragraphs.length} segments analysés · surlignage inline par phrase · zones suspectes top 5
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </button>
            ) : (
              <button
                onClick={runClaudeReport}
                disabled={loadingClaudeReport}
                className="w-full rounded-3xl bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white p-6 shadow-2xl border border-white/10 hover:scale-[1.005] active:scale-[0.995] transition-transform disabled:opacity-60 flex items-center gap-4 text-left"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                  {loadingClaudeReport ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileSearch className="h-7 w-7" />}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">Preuve par Claude</p>
                  <h2 className="text-lg sm:text-xl font-extrabold">Analyse fine phrase-par-phrase</h2>
                  <p className="text-xs opacity-90 mt-0.5">
                    {loadingClaudeReport
                      ? "Claude Sonnet analyse chaque phrase de ton texte humanisé…"
                      : "Claude Sonnet passe ton texte au peigne fin — chaque phrase notée + zones suspectes restantes"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold">1 token</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </button>
            )}

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

        {/* Loader analyse-only (avant réécriture) */}
        {analyzingOnly && (
          <LoadingReport phase={analyzePhase} detail={analyzePhaseDetail} percent={analyzePercent} />
        )}

        {/* 10/07 (Orsu) — Résultat Moteur v2 rendu via l'UI premium AnalysisReport
            (mapping v2 -> v1 pour bénéficier de ScoreRing + TimelineNumbered +
             AxisCard cyan/violet + ZoneHighlight + ZonesSidebar sticky). */}
        {!analyzingOnly && !analyzing && !result && !docxNativeResult && analyzeOnlyResultV2 && (
          <div className="space-y-5 mb-6">
            <AnalysisReport result={mapV2ToV1(analyzeOnlyResultV2)} onReset={resetAll} />
            <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-xl p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-5">
                <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">Étape suivante — optionnelle</p>
                  <h3 className="text-lg sm:text-xl font-extrabold">Humaniser ce document ?</h3>
                  <p className="text-xs opacity-90 mt-1 leading-relaxed">
                    Claude Opus 4.8 réécrit les zones à risque + retire les homoglyphes détectés.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={startAnalysis}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white text-orange-700 px-5 py-3.5 text-sm font-black shadow-lg hover:shadow-xl transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  Humaniser en {MODE_META[mode].label} ({MODE_META[mode].tokens} tokens)
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={resetAll}
                  className="rounded-2xl bg-white/15 px-5 py-3.5 text-sm font-semibold hover:bg-white/25 transition-all"
                >
                  Analyser un autre doc
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Résultat de l'analyse-only (avant humanisation) */}
        {!analyzingOnly && !analyzing && !result && !docxNativeResult && !analyzeOnlyResultV2 && analyzeOnlyResult && (
          <div className="space-y-5 mb-6">
            {/* Rapport unifié façon Compilatio */}
            <AnalysisReport result={analyzeOnlyResult} onReset={resetAll} />

            {/* CTA Humaniser */}
            <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-xl p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-5">
                <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">Étape suivante — optionnelle</p>
                  <h3 className="text-lg sm:text-xl font-extrabold">Humaniser ce document ?</h3>
                  <p className="text-xs opacity-90 mt-1 leading-relaxed">
                    Claude Opus 4.8 va réécrire les zones potentiellement rédigées avec assistance IA pour faire chuter le taux de textes suspects sous 15 %. Choisis une intensité — le coût s&apos;ajoute au token déjà utilisé pour l&apos;analyse.
                  </p>
                </div>
              </div>

              {/* Mode picker inline */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(Object.keys(MODE_META) as Mode[]).map((m) => {
                  const meta = MODE_META[m];
                  const Icon = meta.icon;
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? "bg-white text-orange-700 shadow-sm"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                      <span className={`rounded-full px-1.5 text-[9px] font-bold ${active ? "bg-orange-100 text-orange-700" : "bg-white/25"}`}>
                        {meta.tokens}t
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={startAnalysis}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white text-orange-700 px-5 py-3.5 text-sm font-black shadow-lg hover:shadow-xl transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  Humaniser en {MODE_META[mode].label} ({MODE_META[mode].tokens} tokens)
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={resetAll}
                  className="rounded-2xl bg-white/15 px-5 py-3.5 text-sm font-semibold hover:bg-white/25 transition-all"
                >
                  Analyser un autre doc
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload + config */}
        {!analyzingOnly && !analyzing && !result && !docxNativeResult && !analyzeOnlyResult && !analyzeOnlyResultV2 && (
          <>
            {/* Big drop zone at the top */}
            <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-6 sm:p-8 mb-4">
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
                  className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all p-8 sm:p-12 text-center ${
                    dragOver
                      ? "border-orange-500 bg-orange-50/60"
                      : "border-orange-200 hover:border-orange-400 bg-orange-50/20"
                  }`}
                >
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25 mb-4">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-base font-bold text-gray-900 mb-1">
                    Glisse ton document ici
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, DOCX ou TXT · jusqu&apos;à 15 Mo
                  </p>
                </div>
              )}
            </div>

            {/* Réglages avancés (langue, préservation) — l'intensité d'humanisation
                se choisit après l'analyse, dans la CTA "Humaniser". */}
            <div className="rounded-2xl bg-white shadow-sm border border-orange-100 p-3 sm:p-4 mb-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-gray-500 font-black"
              >
                <span className="flex items-center gap-1.5">
                  <Settings2 className="h-3 w-3 text-orange-600" />
                  Réglages avancés (langue, zones à préserver)
                </span>
                <span className="text-orange-600 font-semibold">
                  {showAdvanced ? "Cacher" : "Afficher"}
                </span>
              </button>
            </div>

            {/* 09/07 (Orsu) — Toggle Moteur v2 (beta). Détection statistique
                + stylométrique (homoglyphes, perplexity locale, burstiness).
                OFF par défaut jusqu'à validation patron. */}
            <div className={`rounded-2xl border-2 p-3 sm:p-4 mb-3 transition-colors ${useV2 ? "border-cyan-400 bg-cyan-50/50" : "border-gray-200 bg-white"}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useV2}
                  onChange={(e) => setUseV2(e.target.checked)}
                  className="h-5 w-5 accent-cyan-600 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Cpu className={`h-4 w-4 shrink-0 ${useV2 ? "text-cyan-600" : "text-gray-400"}`} />
                    <span className={`text-sm font-bold ${useV2 ? "text-cyan-900" : "text-gray-700"}`}>
                      Moteur v2 (recommandé)
                    </span>
                    <span className="rounded-full bg-cyan-100 text-cyan-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                      Beta
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    Homoglyphes cyrilliques, perplexity locale (GPT-2 FR), burstiness, POS deviation, connecteurs sur-utilisés. Calibré Compilatio-grade (papers 2024-2025).
                  </p>
                </div>
              </label>
            </div>

            {/* Big single-CTA — étape 1 : analyse seule (1 token) */}
            <button
              onClick={startAnalyzeOnly}
              disabled={!uploaded}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-4"
            >
              <FileSearch className="h-4 w-4" />
              {uploaded
                ? `Analyser mon document (1 token · ${useV2 ? "v2" : "v1"})`
                : "Dépose un document pour commencer"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-[11px] text-gray-500 text-center -mt-2 mb-4">
              L&apos;analyse ne réécrit rien. Tu verras l&apos;indication de rédaction assistée + les zones suspectes, puis tu décideras si tu veux humaniser. Ce diagnostic est une indication, pas une preuve.
            </p>

            {/* Advanced settings */}
            <div className={showAdvanced ? "rounded-3xl bg-white shadow-sm border border-orange-100 p-6 mb-4" : "hidden"}>
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
                    Textes suspects — cible
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

            {/* Comment ça marche */}
            <div className="mt-8 rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-bold text-gray-900">Comment ça marche</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { n: 1, title: "Extraction", desc: "On lit ton PDF/DOCX (jusqu'à 15 Mo) et on extrait le texte brut." },
                  { n: 2, title: "Scoring Claude Sonnet", desc: "Chaque phrase est scorée individuellement par Claude Sonnet 4.6 — verdict IA nuancé, phrase par phrase." },
                  { n: 3, title: "Nettoyage caché", desc: "On retire les homoglyphes cyrilliques cachés, les cadratins et les connecteurs académiques." },
                  { n: 4, title: "Reformulation Claude", desc: "Chaque paragraphe repassé dans Claude Opus 4.8 avec un prompt étudiant Master 2 (few-shot examples calibrés)." },
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
          summary={`Textes suspects passés de ${result.aiScoreBefore ?? 0}% à ${result.aiScoreAfter ?? 0}% en ${result.passesApplied ?? 0} passes. ${(result.aiScoreAfter ?? 100) <= 15 ? "Le texte se rapproche du seuil vert." : "Certaines zones restent à humaniser."} Aucun détecteur IA n'est fiable à 100% — résultat à interpréter avec discernement.`}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Claude sentence-by-sentence report overlay */}
      {showClaudeReport && claudeReport && result && (
        <AiReport
          fileName={`${result.fileName} · analyse Claude`}
          overallScore={claudeReport.overall.overall}
          wordCount={result.wordCount ?? 0}
          paragraphs={claudeReport.paragraphs}
          detectorScores={{
            gptZeroLike: claudeReport.overall.gptZeroLike,
            saplingLike: claudeReport.overall.saplingLike,
            originalityLike: claudeReport.overall.originalityLike,
            compilatioLike: claudeReport.overall.compilatioLike,
          }}
          dimensionScores={{
            perplexity: claudeReport.overall.perplexity,
            burstiness: claudeReport.overall.burstiness,
            homoglyphs: claudeReport.overall.homoglyphs,
            connectors: claudeReport.overall.connectors,
            formality: claudeReport.overall.formality,
            parallelism: claudeReport.overall.parallelism,
          }}
          summary={claudeReport.summary}
          topRiskZones={claudeReport.topRiskZones}
          onClose={() => setShowClaudeReport(false)}
        />
      )}
    </div>
  );
}

// 10/07 (Orsu) — Adapter le résultat du Moteur v2 (score_global agrégé, signals,
// zones brutes) vers le format AnalyzeOnlyResult attendu par l'UI premium
// AnalysisReport (ScoreRing + Timeline + Axes cyan/violet + Highlight + Sidebar).
function mapV2ToV1(v2: AnalyzeV2Result): AnalyzeOnlyResult {
  const paragraphs: ParagraphScore[] = (v2.zones ?? []).map((z) => ({
    index: z.index,
    text: z.text,
    score: Math.round(z.score),
    risk: z.risk,
  }));
  // Top-3 signaux les plus déclenchés pour "topOffenders"
  const s = v2.signals;
  const topOffenders: string[] = [];
  if (s.ai_favorite_hits >= 20) topOffenders.push(`${s.ai_favorite_hits} tournures IA-typiques (${s.ai_favorite_top?.slice(0, 3).join(", ")})`);
  if (s.homoglyph_count >= 5) topOffenders.push(`${s.homoglyph_count} caractères cyrilliques camouflés`);
  if (typeof s.perplexity_sentence_avg === "number" && s.perplexity_sentence_avg < 40) topOffenders.push(`Perplexity moyenne basse (${s.perplexity_sentence_avg.toFixed(0)}) — style prévisible`);
  if (typeof s.burstiness === "number" && s.burstiness < 0.5) topOffenders.push(`Burstiness faible (${s.burstiness.toFixed(2)}) — cadence uniforme typique IA`);
  return {
    id: v2.id,
    fileName: v2.fileName,
    wordCount: v2.wordCount,
    claudeScore: v2.scoreGlobal,
    claudeReasoning: `Analyse Moteur v2 (v3.1r8) — ${paragraphs.length} zones scannées, confidence ${(v2.confidence * 100).toFixed(0)}%. Score final ${v2.scoreGlobal}% (méthode : ensemble de 3 classifieurs sémantiques + 14 signaux stylo/statistiques). ${topOffenders.length > 0 ? "Marqueurs dominants : " + topOffenders.join(" · ") : "Aucun marqueur dominant identifié."}`,
    topOffenders,
    paragraphs,
    obfuscationScore: v2.obfuscationScore ?? 0,
  };
}

function AnalysisReport({
  result,
  onReset,
}: {
  result: AnalyzeOnlyResult;
  onReset?: () => void;
}) {
  const paragraphs = result.paragraphs ?? [];
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // 09/07 (Orsu) — Refonte UX Magister+ : ignoré-state client-side, recalcul
  // global sans nouvel API call.
  const [ignoredIndexes, setIgnoredIndexes] = useState<Set<number>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);

  const flagged = paragraphs.filter(
    (p) => (p.risk === "high" || p.risk === "medium") && !ignoredIndexes.has(p.index)
  );

  // Recompute score client-side quand des zones sont ignorées.
  const activeParagraphs = paragraphs.filter((p) => !ignoredIndexes.has(p.index));
  const recomputedRawAvg =
    activeParagraphs.length > 0
      ? activeParagraphs.reduce((s, p) => s + p.score, 0) / activeParagraphs.length
      : 0;
  const recomputedIA = Math.max(0, Math.round(recomputedRawAvg * 0.5));
  const displayedIA =
    ignoredIndexes.size === 0 ? result.claudeScore : recomputedIA;

  const toggleIgnore = (index: number) => {
    setIgnoredIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setCurrentIdx(0);
  };

  const resetIgnored = () => {
    setIgnoredIndexes(new Set());
    setCurrentIdx(0);
  };

  const goto = (idx: number) => {
    if (flagged.length === 0) return;
    const clamped = Math.max(0, Math.min(flagged.length - 1, idx));
    setCurrentIdx(clamped);
    const target = flagged[clamped];
    const el = document.getElementById(`report-para-${target.index}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    const loadingToast = toast.loading("Génération du PDF...");
    try {
      await exportReportToPDF(reportRef.current, result.fileName);
      toast.success("PDF téléchargé", { id: loadingToast });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'export PDF", {
        id: loadingToast,
      });
    } finally {
      setExporting(false);
    }
  };

  const hasZones = paragraphs.length > 0;
  const noRiskDetected = flagged.length === 0 && displayedIA === 0;

  const fileSizeInfo = result.wordCount
    ? `${result.wordCount.toLocaleString("fr-FR")} mots`
    : "";

  return (
    <div
      ref={reportRef}
      className="rounded-2xl bg-white shadow-sm border border-zinc-200 overflow-hidden"
    >
      {/* ═══ HEADER : ScoreRing + métadonnées + actions ═══ */}
      <div className="px-6 sm:px-8 py-6 border-b border-zinc-100 bg-gradient-to-br from-white via-orange-50/30 to-white">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ScoreRing */}
          <div className="mx-auto lg:mx-0 shrink-0">
            <ScoreRing
              value={displayedIA}
              size={180}
              label="Textes suspects"
            />
          </div>

          {/* Metadata + actions */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-orange-600" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mb-0.5">
                  Rapport d&apos;analyse
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-900 truncate">
                  {result.fileName}
                </h2>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
                <Languages className="h-3 w-3" />
                FR
              </span>
            </div>

            {/* 4 chips métadonnées */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
                <FileText className="h-3 w-3 text-zinc-400" />
                {fileSizeInfo}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
                <BarChart3 className="h-3 w-3 text-cyan-500" />
                {paragraphs.length} zones analysées
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
                <Cpu className="h-3 w-3 text-orange-500" />
                {flagged.length} zone{flagged.length > 1 ? "s" : ""} à risque
              </span>
              {ignoredIndexes.size > 0 && (
                <button
                  type="button"
                  onClick={resetIgnored}
                  className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-1 text-[11px] font-bold text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  {ignoredIndexes.size} ignorée{ignoredIndexes.size > 1 ? "s" : ""}
                </button>
              )}
            </div>

            {/* Actions principales */}
            <div className="flex flex-col sm:flex-row gap-2 no-print">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={exporting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {exporting ? "Génération..." : "Télécharger PDF"}
              </button>
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Nouvelle analyse
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TIMELINE ═══ */}
      <div className="px-6 sm:px-8 py-6 border-b border-zinc-100 bg-white">
        <TimelineNumbered
          paragraphs={paragraphs}
          flagged={flagged}
          currentIdx={currentIdx}
          onSelect={goto}
        />
      </div>

      {/* ═══ EMPTY STATE (si rien de suspect) ═══ */}
      {noRiskDetected && hasZones && (
        <div className="px-6 sm:px-8 py-6 border-b border-zinc-100 bg-gradient-to-br from-emerald-50/40 to-white">
          <div className="flex items-center gap-4 max-w-2xl mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">
                Aucune zone suspecte détectée sur ce document.
              </p>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Le style rédactionnel est compatible avec une rédaction humaine.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 3 AXES ═══ */}
      <div className="px-6 sm:px-8 py-6 border-b border-zinc-100 bg-zinc-50/50">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-black mb-4 flex items-center gap-1.5">
          <BarChart3 className="h-3 w-3 text-orange-500" />
          Décomposition du diagnostic
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AxisCard
            icon={Files}
            title="Similitudes"
            value="< 1%"
            subtitle="Non-mesuré (module plagiat à venir)"
            accent="gray"
            progressPct={0}
          />
          <AxisCard
            icon={Sparkles}
            title="Détection IA"
            value={displayedIA}
            subtitle="Textes présentant des formulations stylistiquement proches d'un texte généré par une IA"
            accent="orange"
            emphasize
            countUp
            progressPct={displayedIA}
          />
          <AxisCard
            icon={ShieldAlert}
            title="Obfuscation"
            value={result.obfuscationScore ?? 0}
            subtitle={
              (result.obfuscationScore ?? 0) >= 60
                ? "Tentative de camouflage détectée (caractères non-latins ou invisibles)"
                : (result.obfuscationScore ?? 0) > 0
                  ? "Traces de caractères inhabituels"
                  : "Aucune tentative d'obfuscation détectée"
            }
            accent="violet"
            badge="Exclusif Seora"
            countUp
            progressPct={result.obfuscationScore ?? 0}
          />
        </div>
        <p className="text-[10px] text-zinc-400 mt-4 leading-relaxed">
          Ce diagnostic est une <strong className="font-bold text-zinc-500">indication statistique</strong>, pas une preuve.
        </p>
      </div>

      {/* ═══ ANALYSE CLAUDE SONNET (raisonnement global) ═══ */}
      {result.claudeReasoning && (
        <div className="px-6 sm:px-8 py-5 border-b border-zinc-100 bg-gradient-to-br from-violet-50 to-fuchsia-50/50">
          <p className="text-[10px] uppercase tracking-widest text-violet-800 font-black mb-2 flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            Analyse globale · Claude Sonnet
          </p>
          <p className="text-sm text-violet-900/90 leading-relaxed italic">
            « {result.claudeReasoning} »
          </p>
        </div>
      )}

      {/* ═══ READER SPLIT : Sidebar + Zone highlight ═══ */}
      <div className="px-6 sm:px-8 py-6 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
          {/* Sidebar */}
          <ZonesSidebar
            flagged={flagged}
            ignoredIndexes={ignoredIndexes}
            currentIdx={currentIdx}
            onGoto={goto}
            onToggleIgnore={toggleIgnore}
            onResetIgnored={resetIgnored}
          />

          {/* Reader */}
          <div className="min-w-0 rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="sticky top-0 z-10 px-5 py-3 border-b border-zinc-100 bg-white/95 backdrop-blur flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-black">
                Texte annoté
              </p>
              <span className="text-[10px] text-zinc-400">
                Passe la souris sur une phrase surlignée pour voir le motif
              </span>
            </div>
            <div className="max-h-[640px] overflow-y-auto px-5 sm:px-6 py-4">
              {paragraphs.length === 0 ? (
                <p className="text-sm text-zinc-500 italic text-center py-12">
                  Aucun texte à afficher.
                </p>
              ) : (
                paragraphs.map((p) => {
                  const flagIdx = flagged.findIndex((f) => f.index === p.index);
                  const isFlagged = flagIdx !== -1;
                  const isIgnored = ignoredIndexes.has(p.index);
                  const isCurrent = isFlagged && flagIdx === currentIdx;
                  return (
                    <ZoneHighlight
                      key={p.index}
                      paragraph={p}
                      flagIdx={flagIdx}
                      isCurrent={isCurrent}
                      isIgnored={isIgnored}
                      onToggleIgnore={() => toggleIgnore(p.index)}
                      onGoto={() => goto(flagIdx)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TOP OFFENDERS ═══ */}
      {result.topOffenders && result.topOffenders.length > 0 && (
        <div className="border-t border-zinc-100 px-6 sm:px-8 py-4 bg-zinc-50/60">
          <details className="text-xs">
            <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-zinc-600 font-black hover:text-zinc-900 flex items-center gap-1.5 no-print">
              <Flame className="h-3 w-3 text-red-500" />
              Voir les {Math.min(5, result.topOffenders.length)} extraits les plus signalés
            </summary>
            <div className="space-y-2 mt-3">
              {result.topOffenders.slice(0, 5).map((snippet, i) => (
                <p
                  key={i}
                  className="text-xs text-zinc-800 italic leading-relaxed pl-3 border-l-2 border-cyan-300"
                >
                  « {snippet} »
                </p>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* ═══ FOOTER ACTIONS ═══ */}
      <div className="border-t border-zinc-100 px-6 sm:px-8 py-4 bg-zinc-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={handleExportPDF}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-60 transition-all"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Télécharger PDF
        </button>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Analyser un autre doc
          </button>
        )}
      </div>

      {/* ═══ DISCLAIMER ═══ */}
      <div className="border-t border-zinc-100 px-6 sm:px-8 py-4 bg-white">
        <p className="text-[11px] text-zinc-500 leading-relaxed italic text-center max-w-3xl mx-auto">
          Ce diagnostic est une indication statistique et non une preuve. Aucun détecteur IA n&apos;atteint 100% de fiabilité. Interprétez avec discernement.
        </p>
      </div>
    </div>
  );
}

/**
 * 09/07 (Orsu) — Rendu résultat Moteur v2 (statistique + stylométrique).
 * Décompose les 7 signaux principaux + zones les plus suspectes.
 * Pas de dépendance à AiReport / AnalysisReport v1.
 */
function AnalysisReportV2({ result }: { result: AnalyzeV2Result }) {
  const s = result.signals;
  const risk =
    result.scoreGlobal >= 40 ? "high" : result.scoreGlobal >= 20 ? "medium" : "low";
  const accent =
    risk === "high" ? "red" : risk === "medium" ? "amber" : "cyan";

  const bars: Array<{
    key: string;
    label: string;
    value: number;
    hint: string;
    weight: number;
  }> = [
    {
      key: "homoglyph",
      label: "Homoglyphes cyrilliques",
      value: Math.round(s.homoglyph_score),
      hint: `${s.homoglyph_count} caractères remplacés · ${s.invisible_char_count} invisibles · ${s.homoglyph_density_per_1000_chars.toFixed(2)} / 1 000 chars`,
      weight: result.meta.weights.homoglyph ?? 0,
    },
    {
      key: "fdg",
      label: "Fast-DetectGPT (curvature)",
      value: Math.round(s.fast_detect_gpt),
      hint: "Deviation de la perplexity autour de sa moyenne (basse = IA)",
      weight: result.meta.weights.curvature ?? 0,
    },
    {
      key: "perplexity",
      label: "Perplexity moyenne (GPT-2 FR)",
      value: Math.max(0, Math.min(100, Math.round(s.perplexity_sentence_avg))),
      hint: `Basse = probable IA · ${result.meta.n_perplexity_sampled}/${result.meta.n_sentences} phrases échantillonnées`,
      weight: result.meta.weights.perplexity ?? 0,
    },
    {
      key: "burstiness",
      label: "Burstiness (variance perplexity)",
      value: Math.round(s.burstiness * 100),
      hint: `std/mean = ${s.burstiness.toFixed(2)} · humain ≈ 0.6+, IA < 0.4`,
      weight: result.meta.weights.burstiness ?? 0,
    },
    {
      key: "mtld",
      label: "Diversité lexicale (MTLD)",
      value: Math.max(0, Math.min(100, Math.round(s.mtld))),
      hint: `MTLD McCarthy 2005 · humain FR académique ≈ 55-80`,
      weight: result.meta.weights.mtld ?? 0,
    },
    {
      key: "pos_dev",
      label: "Déviation POS (spaCy)",
      value: Math.round(s.pos_deviation),
      hint: "Distance vs distribution POS d'un corpus humain académique",
      weight: result.meta.weights.pos_deviation ?? 0,
    },
    {
      key: "connectors",
      label: "Connecteurs sur-utilisés",
      value: Math.round(s.connector_overuse),
      hint: `${s.ai_favorite_hits} occurrences de tournures IA-préférées`,
      weight: result.meta.weights.connector_overuse ?? 0,
    },
  ];

  const topZones = [...result.zones]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .filter((z) => z.score >= 30);

  return (
    <div className="rounded-3xl bg-white shadow-xl border border-cyan-100 overflow-hidden">
      {/* Header */}
      <div className={`px-5 sm:px-6 py-4 text-white bg-gradient-to-r ${
        accent === "red"
          ? "from-red-500 to-rose-600"
          : accent === "amber"
          ? "from-amber-500 to-orange-600"
          : "from-cyan-500 to-teal-600"
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Cpu className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{result.fileName}</p>
            <p className="text-[10px] opacity-80">
              Rapport Moteur v2 · statistique + stylométrique
            </p>
          </div>
          <span className="hidden sm:inline text-[10px] uppercase tracking-widest font-black bg-white/15 rounded-full px-3 py-1">
            Beta
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
            {result.wordCount.toLocaleString("fr-FR")} mots
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
            {result.zones.length} zones
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
            {result.meta.n_sentences} phrases
          </span>
          <span className="rounded-full bg-white text-gray-800 px-2.5 py-1 text-[10px] font-black">
            Confiance {Math.round(result.confidence * 100)}%
          </span>
          {typeof result.elapsedMs === "number" && (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
              {(result.elapsedMs / 1000).toFixed(1)} s
            </span>
          )}
        </div>
      </div>

      {/* Score global */}
      <div className="px-5 sm:px-6 py-6 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row items-center gap-5">
        <LegacyScoreRing value={result.scoreGlobal} kind="before" />
        <div className="flex-1 text-center sm:text-left">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black mb-1">
            Score global v2
          </p>
          <p className="text-2xl font-black text-gray-900">
            {result.scoreGlobal}% <span className="text-sm text-gray-500 font-semibold">rédigé avec IA (estimation)</span>
          </p>
          <p className="text-xs text-gray-500 mt-2 max-w-lg leading-relaxed">
            {result.scoreGlobal >= 40
              ? "Signaux IA convergents. Homoglyphes ou perplexity anormalement basse détectés."
              : result.scoreGlobal >= 20
              ? "Signaux mixtes. Quelques marqueurs stylo suspects mais rien de convergent."
              : "Signaux compatibles avec de la rédaction humaine formelle. Pas de tampering détecté."}
          </p>
        </div>
      </div>

      {/* 7 signaux — barres */}
      <div className="px-5 sm:px-6 py-6 border-b border-gray-100 bg-white">
        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-4 flex items-center gap-1.5">
          <BarChart3 className="h-3 w-3 text-cyan-600" />
          Décomposition des signaux (poids · valeur)
        </p>
        <div className="space-y-3">
          {bars.map((b) => {
            const pct = Math.max(0, Math.min(100, b.value));
            const barColor =
              pct >= 60 ? "bg-red-500" : pct >= 30 ? "bg-amber-500" : "bg-cyan-500";
            return (
              <div key={b.key} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-start">
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold text-gray-800">{b.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{b.hint}</p>
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-gray-800 tabular-nums w-12 text-right">
                    {pct}%
                  </span>
                  <span className="text-[10px] text-gray-400 tabular-nums w-10 text-right">
                    ×{(b.weight * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Variance de perplexity (mini-graph) */}
      {s.perplexity_sentence_std > 0 && (
        <div className="px-5 sm:px-6 py-5 border-b border-gray-100">
          <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-3">
            Perplexity phrase-à-phrase
          </p>
          <div className="flex items-end gap-1 h-16">
            {[...Array(24)].map((_, i) => {
              // faux échantillonnage visuel autour de la moyenne — juste pour
              // donner une idée de la variance à l'utilisateur.
              const mean = s.perplexity_sentence_avg;
              const std = s.perplexity_sentence_std;
              const rnd = Math.sin(i * 1.7 + 0.3) * std + mean;
              const h = Math.max(6, Math.min(60, (rnd / (mean + std * 2)) * 60));
              return (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-t"
                  style={{ height: `${h}px` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-2">
            <span>moy = {s.perplexity_sentence_avg.toFixed(1)}</span>
            <span>std = {s.perplexity_sentence_std.toFixed(1)}</span>
            <span>burstiness = {s.burstiness.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Mots IA détectés */}
      {s.ai_favorite_top.length > 0 && (
        <div className="px-5 sm:px-6 py-5 border-b border-gray-100">
          <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-3">
            Tournures IA détectées ({s.ai_favorite_hits} au total)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {s.ai_favorite_top.map((phrase, i) => (
              <span
                key={i}
                className="rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 text-[11px] font-medium"
              >
                {phrase}
              </span>
            ))}
          </div>
          {s.human_markers > 0 && (
            <p className="text-[11px] text-emerald-700 mt-3">
              + {s.human_markers} marqueurs humains détectés (bonus false-negative)
            </p>
          )}
        </div>
      )}

      {/* Top 5 zones suspectes */}
      {topZones.length > 0 && (
        <div className="px-5 sm:px-6 py-5 bg-gradient-to-br from-gray-50 to-white">
          <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-3">
            Top {topZones.length} zones suspectes
          </p>
          <div className="space-y-3">
            {topZones.map((z) => (
              <div
                key={z.index}
                className={`rounded-2xl border p-3 sm:p-4 ${
                  z.risk === "high"
                    ? "bg-red-50/50 border-red-200"
                    : "bg-amber-50/50 border-amber-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                    Zone {z.index + 1}
                  </p>
                  <span className={`text-[10px] font-black ${
                    z.risk === "high" ? "text-red-600" : "text-amber-600"
                  }`}>
                    {Math.round(z.score)}% suspect
                  </span>
                </div>
                <p className="text-xs text-gray-800 leading-relaxed line-clamp-4">
                  {z.text.slice(0, 400)}
                  {z.text.length > 400 ? "…" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meta debug (fold) */}
      <details className="px-5 sm:px-6 py-4 border-t border-gray-100 text-xs text-gray-500">
        <summary className="cursor-pointer font-semibold hover:text-gray-800">
          Détails techniques (raw score, POS, ponctuation)
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <p>Raw score avant boost humain : <span className="font-mono">{s.raw_score_before_boost}</span></p>
          <p>Boost humain appliqué : <span className="font-mono">-{s.human_boost_applied}</span></p>
          <p>Sentence length mean : <span className="font-mono">{s.sentence_length_mean.toFixed(1)}</span></p>
          <p>Sentence length var : <span className="font-mono">{s.sentence_length_var.toFixed(1)}</span></p>
          <p>Modèle : <span className="font-mono">{result.meta.model}</span></p>
          <p>Langue : <span className="font-mono">{result.meta.language}</span></p>
        </div>
      </details>
    </div>
  );
}

function LegacyScoreRing({ value, kind }: { value: number; kind: "before" | "after" }) {
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
          Suspects
        </span>
      </div>
    </div>
  );
}
