"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, EyeOff, FileText, X } from "lucide-react";

/**
 * Compilatio-style AI report component.
 *
 * Displays:
 *   1. Header with document name + big overall score
 *   2. Global zone timeline (each paragraph = a tick, colored by risk)
 *   3. Full text with inline highlights (paragraph background colored by risk)
 *   4. Zone navigator (previous/next + counter)
 *   5. Live stats (word count of current zone, of all zones, global %)
 *   6. Ignore-zone toggle (marks a paragraph as false positive)
 *
 * Reused by /ai-detector and /humanizer/[id] via a "Voir le rapport complet" button.
 */

export interface ReportParagraph {
  index: number;
  text: string;
  score: number;                  // 0-100
  risk: "high" | "medium" | "low";
  reason?: string;
}

export interface AiReportProps {
  fileName: string;
  overallScore: number;
  wordCount: number;
  paragraphs: ReportParagraph[];
  detectorScores?: {
    gptZeroLike: number;
    saplingLike: number;
    originalityLike: number;
    compilatioLike: number;
  };
  dimensionScores?: {
    perplexity: number;
    burstiness: number;
    homoglyphs: number;
    connectors: number;
    formality: number;
    parallelism: number;
  };
  summary?: string;
  topRiskZones?: string[];
  onClose?: () => void;
}

type NavFilter = "all" | "ai" | "high";

export default function AiReport({
  fileName,
  overallScore,
  wordCount,
  paragraphs,
  detectorScores,
  dimensionScores,
  summary,
  topRiskZones,
  onClose,
}: AiReportProps) {
  const [ignored, setIgnored] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<NavFilter>("ai");
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [showDimensions, setShowDimensions] = useState(false);

  // Filtered paragraph list per current nav filter
  const navigableZones = useMemo(() => {
    return paragraphs.filter((p) => {
      if (ignored.has(p.index)) return false;
      if (filter === "all") return true;
      if (filter === "ai") return p.risk === "high" || p.risk === "medium";
      if (filter === "high") return p.risk === "high";
      return false;
    });
  }, [paragraphs, filter, ignored]);

  const currentZone = navigableZones[activeIdx] ?? navigableZones[0];

  // Overall stats (excluding ignored)
  const stats = useMemo(() => {
    const kept = paragraphs.filter((p) => !ignored.has(p.index));
    const totalWords = kept.reduce((sum, p) => sum + p.text.trim().split(/\s+/).length, 0);
    const aiFlagged = kept.filter((p) => p.risk !== "low");
    const aiWords = aiFlagged.reduce((sum, p) => sum + p.text.trim().split(/\s+/).length, 0);
    const percent = totalWords > 0 ? Math.round((aiWords / totalWords) * 100) : 0;
    return {
      totalWords,
      aiWords,
      percent,
      zoneCount: aiFlagged.length,
    };
  }, [paragraphs, ignored]);

  const currentZoneWords = currentZone?.text.trim().split(/\s+/).length ?? 0;
  const currentZonePercent = stats.totalWords > 0
    ? ((currentZoneWords / stats.totalWords) * 100)
    : 0;

  const goPrev = () => setActiveIdx((i) => (i === 0 ? navigableZones.length - 1 : i - 1));
  const goNext = () => setActiveIdx((i) => (i + 1) % navigableZones.length);
  const toggleIgnore = (idx: number) => {
    setIgnored((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
    // Reset active zone to 0 to avoid pointing at an ignored zone
    setActiveIdx(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Compilatio-style orange header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white sticky top-0 z-40 shadow-lg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center gap-4">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-lg hover:bg-white/15 transition-colors"
              aria-label="Fermer le rapport"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest opacity-80 font-semibold">Rapport d&apos;analyse IA</p>
            <p className="text-lg sm:text-2xl font-bold truncate">{fileName}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest opacity-80 font-semibold">Textes IA</p>
            <p className="text-2xl sm:text-4xl font-extrabold">{stats.percent}%</p>
          </div>
        </div>

        {/* Global zone timeline — ticks positioned by paragraph index */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-4">
          <div className="relative h-6 flex items-center">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
            {paragraphs.map((p) => {
              const left = paragraphs.length > 1 ? (p.index / (paragraphs.length - 1)) * 100 : 50;
              const ignoredHere = ignored.has(p.index);
              const isActive = currentZone?.index === p.index;
              const color =
                ignoredHere ? "bg-white/20" :
                p.risk === "high" ? "bg-white" :
                p.risk === "medium" ? "bg-white/70" :
                "bg-white/25";
              return (
                <button
                  key={p.index}
                  onClick={() => {
                    setFilter("all");
                    const targetIdx = paragraphs.filter(x => !ignored.has(x.index)).findIndex(x => x.index === p.index);
                    setActiveIdx(Math.max(0, targetIdx));
                  }}
                  className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all hover:scale-125 ${color} ${
                    isActive ? "h-4 w-1 shadow-lg" : "h-2.5 w-0.5"
                  }`}
                  style={{ left: `${left}%` }}
                  title={`Phrase ${p.index + 1} · ${p.score}%`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-2 opacity-80">
            <span>{paragraphs.length} phrases analysées</span>
            <span>{stats.zoneCount} zones suspectes</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {/* Filter navigation bar (mimics the Compilatio dropdown) */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest mr-2">Naviguer par</span>
          {[
            { id: "all" as NavFilter, label: `Tous (${paragraphs.length - ignored.size})` },
            { id: "ai" as NavFilter, label: `Générés par IA (${paragraphs.filter(p => !ignored.has(p.index) && p.risk !== "low").length})` },
            { id: "high" as NavFilter, label: `Haut risque (${paragraphs.filter(p => !ignored.has(p.index) && p.risk === "high").length})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setActiveIdx(0); }}
              className={`text-xs font-semibold rounded-full px-3.5 py-1.5 transition-colors ${
                filter === f.id
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Summary card (Claude's verdict) */}
        {summary && (
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-5">
            <p className="text-xs uppercase tracking-widest text-orange-700 font-bold mb-2">Synthèse Claude</p>
            <p className="text-sm text-gray-800 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Grid: main text (left) + sidebar (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main text with inline highlights */}
          <div className="lg:col-span-2 rounded-3xl bg-white shadow-xl border border-gray-200 p-5 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-bold text-gray-900">Texte annoté</h2>
              <span className="text-xs text-gray-400 ml-auto">Overall {overallScore}% · {wordCount.toLocaleString("fr-FR")} mots</span>
            </div>
            <div className="space-y-2.5">
              {paragraphs.map((p) => {
                const isActive = currentZone?.index === p.index;
                const isIgnored = ignored.has(p.index);
                let cls = "border-l-4 rounded-r-2xl p-3.5 transition-all cursor-pointer ";
                if (isIgnored) {
                  cls += "border-gray-300 bg-gray-50 opacity-40";
                } else if (p.risk === "high") {
                  cls += isActive
                    ? "border-red-500 bg-red-100 shadow-md ring-2 ring-red-200"
                    : "border-red-500 bg-red-50/70 hover:bg-red-100";
                } else if (p.risk === "medium") {
                  cls += isActive
                    ? "border-amber-500 bg-amber-100 shadow-md ring-2 ring-amber-200"
                    : "border-amber-500 bg-amber-50/70 hover:bg-amber-100";
                } else {
                  cls += isActive
                    ? "border-emerald-500 bg-emerald-100 shadow-md ring-2 ring-emerald-200"
                    : "border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50";
                }

                return (
                  <div
                    key={p.index}
                    id={`report-para-${p.index}`}
                    onClick={() => {
                      const targetIdx = navigableZones.findIndex(x => x.index === p.index);
                      if (targetIdx >= 0) setActiveIdx(targetIdx);
                    }}
                    className={cls}
                  >
                    <div className="flex items-baseline justify-between mb-1.5">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                        Phrase {p.index + 1}
                        {isIgnored && <span className="ml-2 text-gray-400">(ignoré)</span>}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-extrabold ${
                            p.risk === "high"
                              ? "text-red-600"
                              : p.risk === "medium"
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {p.score}%
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleIgnore(p.index); }}
                          className="text-[10px] font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1 rounded-md px-2 py-0.5 hover:bg-white/70"
                          title={isIgnored ? "Réintégrer cette zone" : "Ignorer cette zone"}
                        >
                          <EyeOff className="h-3 w-3" />
                          {isIgnored ? "Réintégrer" : "Ignorer"}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{p.text}</p>
                    {p.reason && !isIgnored && (
                      <p className="mt-2 text-[11px] text-gray-500 italic">↳ {p.reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-40 lg:h-fit">
            {/* Detector breakdown */}
            {detectorScores && (
              <div className="rounded-3xl bg-white shadow-xl border border-gray-200 p-5">
                <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-3">
                  Score par détecteur
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: "gptZeroLike", label: "GPTZero" },
                    { key: "saplingLike", label: "Sapling" },
                    { key: "originalityLike", label: "Originality" },
                    { key: "compilatioLike", label: "Compilatio" },
                  ].map((d) => {
                    const v = detectorScores[d.key as keyof typeof detectorScores];
                    const good = v <= 15;
                    return (
                      <div key={d.key} className={`rounded-xl p-3 ${
                        good ? "bg-emerald-50" : v >= 40 ? "bg-red-50" : "bg-amber-50"
                      }`}>
                        <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">
                          {d.label}
                        </p>
                        <p className={`text-lg font-extrabold mt-0.5 ${
                          good ? "text-emerald-600" : v >= 40 ? "text-red-500" : "text-amber-600"
                        }`}>
                          {v}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dimensions (collapsible) */}
            {dimensionScores && (
              <div className="rounded-3xl bg-white shadow-xl border border-gray-200 p-5">
                <button
                  onClick={() => setShowDimensions(!showDimensions)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                    6 dimensions détaillées
                  </h3>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${showDimensions ? "rotate-180" : ""}`}
                  />
                </button>
                {showDimensions && (
                  <div className="mt-4 space-y-3">
                    {[
                      { key: "perplexity", label: "Perplexité", hint: "Prévisibilité du vocabulaire" },
                      { key: "burstiness", label: "Burstiness", hint: "Variance de longueur des phrases" },
                      { key: "homoglyphs", label: "Homoglyphes", hint: "Caractères cyrilliques cachés" },
                      { key: "connectors", label: "Connecteurs", hint: "\"Par ailleurs\", \"En effet\"..." },
                      { key: "formality", label: "Formalité", hint: "Vocabulaire soutenu" },
                      { key: "parallelism", label: "Parallélisme", hint: "\"D'un côté... de l'autre\"" },
                    ].map((dim) => {
                      const value = dimensionScores[dim.key as keyof typeof dimensionScores];
                      return (
                        <div key={dim.key}>
                          <div className="flex items-baseline justify-between">
                            <p className="text-xs font-bold text-gray-700">{dim.label}</p>
                            <p className={`text-sm font-extrabold ${
                              value >= 60 ? "text-red-500" : value >= 30 ? "text-amber-500" : "text-emerald-600"
                            }`}>{value}%</p>
                          </div>
                          <p className="text-[10px] text-gray-400">{dim.hint}</p>
                          <div className="mt-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                value >= 60 ? "bg-red-500" : value >= 30 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Top risk zones */}
            {topRiskZones && topRiskZones.length > 0 && (
              <div className="rounded-3xl bg-white shadow-xl border border-red-100 p-5">
                <h3 className="text-xs uppercase tracking-widest text-red-600 font-bold mb-3">
                  Top zones à haut risque
                </h3>
                <ol className="space-y-2.5">
                  {topRiskZones.map((z, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-[11px] text-gray-700 leading-relaxed italic">« {z} »</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky bottom navigator (Compilatio-style) */}
      {navigableZones.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-xl-up z-40">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 truncate">
                <span className="font-semibold text-gray-900">Zone :</span> {currentZoneWords} mots (
                <span className={
                  currentZone && currentZone.risk === "high" ? "text-red-500 font-bold" :
                  currentZone && currentZone.risk === "medium" ? "text-amber-500 font-bold" :
                  "text-emerald-600 font-bold"
                }>
                  {currentZonePercent.toFixed(2).replace(".", ",")}%
                </span>
                )
              </p>
              <p className="text-[11px] text-gray-400">
                Toutes les zones : {stats.aiWords.toLocaleString("fr-FR")} mots (<span className="text-orange-600 font-bold">{stats.percent}%</span>)
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={goPrev}
                className="rounded-full p-2 hover:bg-gray-100 transition-colors"
                aria-label="Phrase précédente"
              >
                <ChevronLeft className="h-5 w-5 text-gray-500" />
              </button>
              <span className="text-xs font-bold text-gray-900 tabular-nums">
                {(activeIdx + 1).toString().padStart(2, "0")} / {navigableZones.length.toString().padStart(2, "0")}
              </span>
              <button
                onClick={goNext}
                className="rounded-full p-2 hover:bg-gray-100 transition-colors"
                aria-label="Phrase suivante"
              >
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="ml-2 rounded-full p-2 hover:bg-gray-100 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
