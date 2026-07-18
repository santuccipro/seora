"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import AiReport from "@/components/ai-report/ai-report";
import {
  ArrowLeft,
  Search,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Copy,
  RotateCcw,
  Globe,
  Zap,
  Info,
  FileSearch,
  Wand2,
  ClipboardCopy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Language = "fr" | "en" | "es";

type Detail = {
  perplexity: number;
  burstiness: number;
  homoglyphs: number;
  connectors: number;
  formality: number;
  parallelism: number;
};

type ParagraphScore = {
  index: number;
  text: string;
  score: number;
  risk: "high" | "medium" | "low";
  details: Detail;
  patterns?: string[];
  patternLabels?: string[];
  reason?: string;
};

type Overall = {
  overall: number;
  gptZeroLike: number;
  saplingLike: number;
  originalityLike: number;
  compilatioLike: number;
  perplexity: number;
  burstiness: number;
  homoglyphs: number;
  connectors: number;
  formality: number;
  parallelism: number;
};

type Result = {
  overall: Overall;
  paragraphs: ParagraphScore[];
  wordCount: number;
  charCount: number;
  stats: { totalParagraphs: number; highRisk: number; mediumRisk: number; lowRisk: number };
  topRiskZones: string[];
};

const MAX_CHARS = 10000;

const LANG_META: Record<Language, { label: string; flag: string }> = {
  fr: { label: "Français", flag: "🇫🇷" },
  en: { label: "English", flag: "🇬🇧" },
  es: { label: "Español", flag: "🇪🇸" },
};

type HumanizedZone = {
  text: string;
  loading: boolean;
  expanded: boolean;
};

export default function AiDetectorPage() {
  const { status } = useSession();
  const router = useRouter();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<Language>("fr");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [humanizedZones, setHumanizedZones] = useState<Record<number, HumanizedZone>>({});
  const [humanizingAll, setHumanizingAll] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/ai-detector");
    }
  }, [status, router]);

  useEffect(() => {
    const saved = sessionStorage.getItem("seora_ai_text");
    if (saved && !text) {
      setText(saved.slice(0, MAX_CHARS));
      sessionStorage.removeItem("seora_ai_text");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAnalysis = async () => {
    if (text.trim().length < 100) {
      toast.error("Texte trop court (min. 100 caractères).");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setResult(data);
      toast.success(`Analyse terminée · Score global ${data.overall.overall}%`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAnalyzing(false);
    }
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(text);
    toast.success("Texte copié");
  };

  const resetAll = () => {
    setText("");
    setResult(null);
    setHumanizedZones({});
  };

  const humanizeZone = useCallback(async (paragraphIndex: number, zoneText: string) => {
    setHumanizedZones(prev => ({
      ...prev,
      [paragraphIndex]: { text: "", loading: true, expanded: true },
    }));
    try {
      const res = await fetch("/api/humanize/zone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: zoneText, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setHumanizedZones(prev => ({
        ...prev,
        [paragraphIndex]: { text: data.humanizedText, loading: false, expanded: true },
      }));
      toast.success(`Zone ${paragraphIndex + 1} humanisée (−1 token)`);
    } catch (err) {
      setHumanizedZones(prev => {
        const next = { ...prev };
        delete next[paragraphIndex];
        return next;
      });
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }, [language]);

  const humanizeAll = useCallback(async () => {
    if (!result) return;
    const flagged = result.paragraphs.filter(p => p.risk === "high" || p.risk === "medium");
    if (flagged.length === 0) {
      toast.info("Aucune zone à risque à humaniser.");
      return;
    }
    setHumanizingAll(true);
    toast.info(`Humanisation de ${flagged.length} zones… (−${flagged.length} tokens)`);
    for (const p of flagged) {
      if (humanizedZones[p.index]?.text) continue;
      await humanizeZone(p.index, p.text);
    }
    setHumanizingAll(false);
    toast.success("Toutes les zones humanisées !");
  }, [result, humanizedZones, humanizeZone]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const charCount = text.length;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const passing = result && result.overall.overall <= 15;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/25 mb-4">
            <Search className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Détection IA de texte
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Colle un texte, on te dit s&apos;il est repéré comme généré par IA — avec le détail zone par zone, façon Compilatio.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="flex items-center gap-1.5 rounded-full bg-white shadow-sm border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-700">
            <Zap className="h-3.5 w-3.5 text-violet-500" />
            Résultat en ~5s
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white shadow-sm border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-700">
            <Globe className="h-3.5 w-3.5 text-violet-500" />
            FR · EN · ES
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white shadow-sm border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-700">
            <ShieldAlert className="h-3.5 w-3.5 text-violet-500" />
            Zones à risque surlignées
          </div>
        </div>

        {/* Input phase */}
        {!analyzing && !result && (
          <div className="rounded-3xl bg-white shadow-xl border border-violet-100 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Ton texte</p>
                <p className="text-xs text-gray-500 mt-0.5">Max {MAX_CHARS.toLocaleString("fr-FR")} caractères</p>
              </div>
              <div className="flex gap-1.5">
                {(Object.keys(LANG_META) as Language[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 transition-colors ${
                      language === l ? "bg-violet-100 text-violet-700" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {LANG_META[l].flag} {LANG_META[l].label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Colle ici le texte que tu veux vérifier (mémoire, dissertation, article, email, etc.)..."
              rows={14}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm leading-relaxed text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-y transition-colors"
            />

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span>{wordCount.toLocaleString("fr-FR")} mots</span>
                <span>·</span>
                <span className={charCount > MAX_CHARS * 0.9 ? "text-red-500 font-semibold" : ""}>
                  {charCount.toLocaleString("fr-FR")} / {MAX_CHARS.toLocaleString("fr-FR")} caractères
                </span>
                {text && (
                  <>
                    <span>·</span>
                    <button
                      onClick={copyText}
                      className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Copier
                    </button>
                  </>
                )}
              </div>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <Info className="h-3 w-3" /> 1 token par analyse
              </p>
            </div>

            <button
              onClick={runAnalysis}
              disabled={text.trim().length < 100}
              className="w-full mt-5 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-4 w-4" />
              Analyser le texte
            </button>
          </div>
        )}

        {/* Analyzing */}
        {analyzing && (
          <div className="rounded-3xl bg-white shadow-xl border border-violet-100 p-10">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
                  <Search className="h-9 w-9 text-white" />
                </div>
                <div
                  className="absolute -inset-3 rounded-3xl border-2 border-violet-300/40 animate-spin"
                  style={{ borderStyle: "dashed", animationDuration: "3s" }}
                />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                <p className="text-sm font-semibold text-gray-800">
                  Scan des 4 détecteurs · Analyse paragraphe par paragraphe
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {!analyzing && result && (
          <div className="space-y-5">
            {/* Big score */}
            <div className="rounded-3xl bg-white shadow-xl border border-violet-100 p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                    Probabilité IA globale
                  </p>
                  <ScoreRing value={result.overall.overall} />
                  <p className={`mt-4 text-sm font-semibold ${
                    passing ? "text-emerald-600" : result.overall.overall >= 40 ? "text-red-500" : "text-amber-500"
                  }`}>
                    {passing
                      ? "✓ Ce texte passe les détecteurs"
                      : result.overall.overall >= 40
                      ? "⚠ Texte fortement détecté comme IA"
                      : "Zone de risque · à humaniser"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                    Score par détecteur simulé
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { key: "gptZeroLike", label: "GPTZero" },
                      { key: "saplingLike", label: "Sapling" },
                      { key: "originalityLike", label: "Originality" },
                      { key: "compilatioLike", label: "Compilatio" },
                    ].map(d => {
                      const v = result.overall[d.key as keyof Overall] as number;
                      const good = v <= 15;
                      return (
                        <div key={d.key} className={`rounded-xl p-3 ${
                          good ? "bg-emerald-50" : v >= 40 ? "bg-red-50" : "bg-amber-50"
                        }`}>
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                            {d.label}
                          </p>
                          <p className={`text-xl font-extrabold mt-1 ${
                            good ? "text-emerald-600" : v >= 40 ? "text-red-500" : "text-amber-600"
                          }`}>
                            {v}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Mots</p>
                  <p className="text-lg font-extrabold text-gray-900 mt-1">{result.wordCount.toLocaleString("fr-FR")}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Paragraphes</p>
                  <p className="text-lg font-extrabold text-gray-900 mt-1">{result.stats.totalParagraphs}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest text-red-600 font-semibold">Zones à risque</p>
                  <p className="text-lg font-extrabold text-red-600 mt-1">{result.stats.highRisk}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold">Zones OK</p>
                  <p className="text-lg font-extrabold text-emerald-600 mt-1">{result.stats.lowRisk}</p>
                </div>
              </div>
            </div>

            {/* Dimension breakdown */}
            <div className="rounded-3xl bg-white shadow-xl border border-violet-100 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Analyse par dimension</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: "perplexity", label: "Perplexité", hint: "Prévisibilité du vocabulaire" },
                  { key: "burstiness", label: "Burstiness", hint: "Variance de longueur des phrases" },
                  { key: "homoglyphs", label: "Homoglyphes", hint: "Caractères cyrilliques cachés" },
                  { key: "connectors", label: "Connecteurs", hint: "\"Par ailleurs\", \"En effet\"..." },
                  { key: "formality", label: "Formalité", hint: "Vocabulaire soutenu" },
                  { key: "parallelism", label: "Parallélisme", hint: "\"D'un côté... de l'autre\"" },
                ].map(dim => {
                  const value = result.overall[dim.key as keyof Overall] as number;
                  const color = value >= 60 ? "text-red-500" : value >= 30 ? "text-amber-500" : "text-emerald-600";
                  return (
                    <div key={dim.key} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-baseline justify-between">
                        <p className="text-xs font-bold text-gray-700">{dim.label}</p>
                        <p className={`text-xl font-extrabold ${color}`}>{value}%</p>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{dim.hint}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${value >= 60 ? "bg-red-500" : value >= 30 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Highlighted paragraphs */}
            <div className="rounded-3xl bg-white shadow-xl border border-violet-100 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Texte annoté zone par zone</h2>
                  <div className="flex items-center gap-3 text-[11px] mt-1">
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Risque élevé (≥ 60%)</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Moyen (30-60%)</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Bas (&lt; 30%)</span>
                  </div>
                </div>
                {result.paragraphs.some(p => p.risk === "high" || p.risk === "medium") && (
                  <button
                    onClick={humanizeAll}
                    disabled={humanizingAll}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:shadow-md transition-shadow disabled:opacity-60"
                  >
                    {humanizingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    Humaniser tout
                    <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                      {result.paragraphs.filter(p => p.risk === "high" || p.risk === "medium").length} zones
                    </span>
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {result.paragraphs.map(p => {
                  const hz = humanizedZones[p.index];
                  const canHumanize = p.risk === "high" || p.risk === "medium";
                  return (
                    <div
                      key={p.index}
                      className={`rounded-2xl border-l-4 overflow-hidden ${
                        p.risk === "high"
                          ? "bg-red-50/70 border-red-500"
                          : p.risk === "medium"
                          ? "bg-amber-50/70 border-amber-500"
                          : "bg-emerald-50/50 border-emerald-500"
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                            Paragraphe {p.index + 1}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-extrabold ${
                              p.risk === "high"
                                ? "text-red-600"
                                : p.risk === "medium"
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}>
                              {p.score}%
                            </span>
                            {canHumanize && !hz?.text && (
                              <button
                                onClick={() => humanizeZone(p.index, p.text)}
                                disabled={hz?.loading}
                                className="flex items-center gap-1 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-60"
                              >
                                {hz?.loading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Wand2 className="h-3 w-3" />
                                )}
                                {hz?.loading ? "…" : "Humaniser"}
                                <span className="text-violet-500">−1 token</span>
                              </button>
                            )}
                            {hz?.text && (
                              <button
                                onClick={() => setHumanizedZones(prev => ({
                                  ...prev,
                                  [p.index]: { ...prev[p.index], expanded: !prev[p.index].expanded },
                                }))}
                                className="flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-700 px-2.5 py-1 text-[11px] font-bold"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Humanisé
                                {hz.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {p.text}
                        </p>
                      </div>

                      {/* Humanized result panel */}
                      {hz?.text && hz.expanded && (
                        <div className="border-t border-emerald-200 bg-emerald-50 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              Version humanisée
                            </p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(hz.text);
                                toast.success("Copié !");
                              }}
                              className="flex items-center gap-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2.5 py-1 text-[11px] font-bold transition-colors"
                            >
                              <ClipboardCopy className="h-3 w-3" />
                              Copier
                            </button>
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {hz.text}
                          </p>
                          <button
                            onClick={() => humanizeZone(p.index, p.text)}
                            className="mt-2 text-[11px] text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Régénérer (−1 token)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Recap panel */}
              {Object.values(humanizedZones).some(z => z.text) && (
                <div className="mt-6 rounded-2xl bg-violet-50 border border-violet-200 p-4">
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Récap — {Object.values(humanizedZones).filter(z => z.text).length} zone(s) humanisée(s)
                  </p>
                  <div className="space-y-2">
                    {result.paragraphs
                      .filter(p => humanizedZones[p.index]?.text)
                      .map(p => (
                        <div key={p.index} className="flex items-start justify-between gap-2 rounded-xl bg-white border border-violet-100 p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-widest mb-1">Paragraphe {p.index + 1}</p>
                            <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                              {humanizedZones[p.index].text}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(humanizedZones[p.index].text);
                              toast.success("Copié !");
                            }}
                            className="shrink-0 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 p-1.5 transition-colors"
                          >
                            <ClipboardCopy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                  <button
                    onClick={() => {
                      const all = result.paragraphs
                        .filter(p => humanizedZones[p.index]?.text)
                        .map(p => `[Paragraphe ${p.index + 1}]\n${humanizedZones[p.index].text}`)
                        .join("\n\n");
                      navigator.clipboard.writeText(all);
                      toast.success("Toutes les zones copiées !");
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 text-xs font-bold transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Tout copier
                  </button>
                </div>
              )}
            </div>

            {/* Top risk zones */}
            {result.topRiskZones.length > 0 && (
              <div className="rounded-3xl bg-white shadow-xl border border-red-100 p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h2 className="text-lg font-bold text-gray-900">Top zones à humaniser en priorité</h2>
                </div>
                <ol className="space-y-3">
                  {result.topRiskZones.map((zone, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="h-6 w-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-xs text-gray-700 leading-relaxed italic">« {zone} »</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Voir le rapport complet — style Compilatio */}
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
                  Timeline des zones · texte annoté · navigation par paragraphe · détecteurs & dimensions
                </p>
              </div>
              <ArrowLeft className="h-5 w-5 rotate-180 shrink-0" />
            </button>

            {/* Reassurance / CTA */}
            <div className="rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-6 sm:p-8 text-white shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <div>
                  <h2 className="text-lg font-extrabold">Prochaine étape recommandée</h2>
                  <p className="text-sm opacity-90 mt-0.5">
                    {result.overall.overall > 15
                      ? "Passe ton texte dans l'humanizer pour ramener le score sous 15% en gardant le sens intact."
                      : "Ton texte passe déjà les détecteurs. Rien à faire, tu peux le rendre tel quel."}
                  </p>
                </div>
              </div>
              {result.overall.overall > 15 && (
                <button
                  onClick={() => {
                    sessionStorage.setItem("seora_memoire_text_only", text);
                    router.push("/humanizer");
                  }}
                  className="w-full mt-3 flex items-center justify-center gap-2 rounded-2xl bg-white text-violet-600 px-5 py-3 text-sm font-bold shadow-md hover:shadow-lg transition-shadow"
                >
                  <Sparkles className="h-4 w-4" />
                  Humaniser ce texte maintenant
                </button>
              )}
              <button
                onClick={resetAll}
                className="w-full mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-white/70 hover:text-white py-2 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Analyser un autre texte
              </button>
            </div>

            {/* Report overlay */}
            {showReport && result && (
              <AiReport
                fileName="Texte analysé"
                overallScore={result.overall.overall}
                wordCount={result.wordCount}
                paragraphs={result.paragraphs.map(p => ({
                  index: p.index,
                  text: p.text,
                  score: p.score,
                  risk: p.risk,
                  reason: p.reason,
                  patternLabels: p.patternLabels,
                }))}
                detectorScores={{
                  gptZeroLike: result.overall.gptZeroLike,
                  saplingLike: result.overall.saplingLike,
                  originalityLike: result.overall.originalityLike,
                  compilatioLike: result.overall.compilatioLike,
                }}
                dimensionScores={{
                  perplexity: result.overall.perplexity,
                  burstiness: result.overall.burstiness,
                  homoglyphs: result.overall.homoglyphs,
                  connectors: result.overall.connectors,
                  formality: result.overall.formality,
                  parallelism: result.overall.parallelism,
                }}
                summary={(result as unknown as { summary?: string }).summary}
                topRiskZones={result.topRiskZones}
                onClose={() => setShowReport(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const good = clamped <= 15;
  const bad = clamped >= 40;
  const strokeColor = good ? "#10b981" : bad ? "#ef4444" : "#f59e0b";
  const textClass = good ? "text-emerald-600" : bad ? "text-red-500" : "text-amber-500";
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={150} height={150} className="-rotate-90">
        <circle cx={75} cy={75} r={radius} stroke="#f3f4f6" strokeWidth={12} fill="none" />
        <circle
          cx={75}
          cy={75}
          r={radius}
          stroke={strokeColor}
          strokeWidth={12}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className={`text-4xl font-extrabold ${textClass}`}>{clamped}%</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
          Détection IA
        </span>
      </div>
    </div>
  );
}
