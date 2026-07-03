"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Wand2,
  Clock,
  TrendingUp,
  ShieldAlert,
  Zap,
  Target,
  FileDown,
  X,
} from "lucide-react";
import type { CvDeepReport } from "@/lib/cv-deep-analysis";
import { CV_SECTOR_CRITERIA } from "@/lib/cv-criteria";

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
  excellent: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle2 },
  correct: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", icon: Info },
  insuffisant: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: AlertTriangle },
  manquant: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: AlertCircle },
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; icon: typeof AlertCircle }> = {
  critical: { bg: "bg-red-50", text: "text-red-700", icon: AlertCircle },
  warning: { bg: "bg-amber-50", text: "text-amber-700", icon: AlertTriangle },
  info: { bg: "bg-sky-50", text: "text-sky-700", icon: Info },
};

interface Props {
  report: CvDeepReport;
  onClose: () => void;
  onUpsell?: (key: string) => void;
}

export function CvReport({ report, onClose, onUpsell }: Props) {
  const [filter, setFilter] = useState<"all" | "critical" | "sections" | "wins">("all");
  const [openSection, setOpenSection] = useState<number | null>(0);
  const sectorLabel = CV_SECTOR_CRITERIA[report.sector]?.label ?? "Secteur";

  const scoreColor = useMemo(() => {
    if (report.globalScore >= 85) return "text-emerald-600";
    if (report.globalScore >= 70) return "text-sky-600";
    if (report.globalScore >= 50) return "text-amber-600";
    return "text-red-600";
  }, [report.globalScore]);
  const scoreGradient = useMemo(() => {
    if (report.globalScore >= 85) return "from-emerald-500 to-teal-500";
    if (report.globalScore >= 70) return "from-sky-500 to-indigo-500";
    if (report.globalScore >= 50) return "from-amber-500 to-orange-500";
    return "from-red-500 to-rose-500";
  }, [report.globalScore]);

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Sticky header — Compilatio-style, but Seora-toned */}
      <div className="sticky top-0 z-40 backdrop-blur-sm bg-white/95 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Score global</p>
              <p className={`text-2xl font-black leading-none ${scoreColor}`}>{report.globalScore}<span className="text-sm text-gray-400">/100</span></p>
            </div>
            <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${scoreGradient} flex items-center justify-center text-white font-black text-xs shadow-lg`}>
              {report.scoreLabel.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
            <button
              onClick={onClose}
              className="ml-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors sm:hidden"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* Verdict block */}
        <div className={`rounded-3xl bg-gradient-to-br ${scoreGradient} text-white p-6 sm:p-8 shadow-2xl mb-8`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold mb-2">Rapport {sectorLabel}</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">{report.scoreLabel}</h1>
              <p className="text-sm sm:text-base text-white/90 mt-2 leading-relaxed">{report.headline}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-6xl font-black leading-none">{report.globalScore}</p>
              <p className="text-xs text-white/70 mt-1">/ 100</p>
            </div>
          </div>
          <p className="text-sm text-white/95 leading-relaxed mt-3 border-t border-white/20 pt-4">{report.verdict}</p>
          <div className="flex items-center gap-4 mt-5 text-xs text-white/80">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              ~{report.timeToImproveMinutes} min pour améliorer
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Poste visé : <span className="font-semibold text-white">{report.targetRole || "—"}</span>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-6 sticky top-16 z-30 bg-white/80 backdrop-blur-sm py-2 -mx-4 px-4">
          {[
            { key: "all", label: "Tout le rapport", icon: TrendingUp },
            { key: "sections", label: "Sections", icon: Info },
            { key: "critical", label: `Points critiques (${report.redFlags?.filter((f) => f.severity === "critical").length ?? 0})`, icon: ShieldAlert },
            { key: "wins", label: `Quick wins (${report.quickWins?.length ?? 0})`, icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dimensions */}
        {(filter === "all" || filter === "sections") && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-3">6 dimensions notées</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {report.dimensions.map((d) => (
                <div key={d.key} className="rounded-2xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-700">{d.label}</p>
                    <p className={`text-lg font-black ${d.score >= 75 ? "text-emerald-600" : d.score >= 55 ? "text-sky-600" : d.score >= 35 ? "text-amber-600" : "text-red-600"}`}>
                      {d.score}
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${d.score >= 75 ? "bg-emerald-500" : d.score >= 55 ? "bg-sky-500" : d.score >= 35 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{d.verdict}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sections review */}
        {(filter === "all" || filter === "sections") && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-3">Verdict par section</h2>
            <div className="space-y-2">
              {report.sections.map((sec, i) => {
                const style = STATUS_COLORS[sec.status] ?? STATUS_COLORS.correct;
                const Icon = style.icon;
                const open = openSection === i;
                return (
                  <div key={i} className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden transition-all`}>
                    <button
                      onClick={() => setOpenSection(open ? null : i)}
                      className="w-full flex items-center justify-between gap-3 p-4 text-left"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Icon className={`h-4 w-4 shrink-0 ${style.text}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">{sec.section}</p>
                          <p className={`text-[11px] font-semibold ${style.text} uppercase tracking-wider`}>
                            {sec.status} · {sec.score}/100
                          </p>
                        </div>
                      </div>
                      {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </button>
                    {open && (
                      <div className="px-4 pb-4">
                        <p className="text-xs text-gray-700 leading-relaxed mb-3">{sec.comment}</p>
                        {sec.quickFixes.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Actions concrètes</p>
                            {sec.quickFixes.map((f, k) => (
                              <div key={k} className="flex items-start gap-2 text-xs text-gray-700">
                                <Sparkles className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Red flags */}
        {(filter === "all" || filter === "critical") && report.redFlags?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-3">Signaux critiques</h2>
            <div className="space-y-2">
              {report.redFlags.map((f, i) => {
                const style = SEVERITY_COLORS[f.severity] ?? SEVERITY_COLORS.info;
                const Icon = style.icon;
                return (
                  <div key={i} className={`rounded-xl ${style.bg} border-l-4 ${f.severity === "critical" ? "border-red-500" : f.severity === "warning" ? "border-amber-500" : "border-sky-500"} p-3.5 flex gap-3`}>
                    <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${style.text}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{f.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{f.detail}</p>
                      {f.location && (
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">
                          Section : {f.location}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Quick wins */}
        {(filter === "all" || filter === "wins") && report.quickWins?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-3">Quick wins — impact / effort</h2>
            <div className="space-y-3">
              {report.quickWins.map((w, i) => (
                <div key={i} className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      {w.title}
                    </p>
                    <span className="rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5">
                      +{w.gainPoints} pts
                    </span>
                  </div>
                  {(w.before || w.after) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {w.before && (
                        <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                          <p className="text-[9px] uppercase tracking-widest text-red-500 font-bold mb-1">Avant</p>
                          <p className="text-xs text-red-900/80 leading-relaxed">{w.before}</p>
                        </div>
                      )}
                      {w.after && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                          <p className="text-[9px] uppercase tracking-widest text-emerald-600 font-bold mb-1">Après</p>
                          <p className="text-xs text-emerald-900/80 leading-relaxed">{w.after}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ATS coverage */}
        {filter === "all" && report.atsMatch && (
          <section className="mb-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-xs uppercase tracking-widest font-black text-gray-500">Optimisation ATS</h2>
                  <p className="text-sm text-gray-700 mt-1">{report.atsMatch.advice}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-gray-900">{report.atsMatch.coveragePct}%</p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">couverture</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
                <div
                  className={`h-full ${report.atsMatch.coveragePct >= 70 ? "bg-emerald-500" : report.atsMatch.coveragePct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${report.atsMatch.coveragePct}%` }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold mb-2">Présents ({report.atsMatch.matchedKeywords.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {report.atsMatch.matchedKeywords.map((k, i) => (
                      <span key={i} className="rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-0.5">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-red-600 font-bold mb-2">Manquants ({report.atsMatch.missingKeywords.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {report.atsMatch.missingKeywords.map((k, i) => (
                      <span key={i} className="rounded-full bg-red-100 text-red-700 text-[10px] font-semibold px-2 py-0.5">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Upsell hooks */}
        {filter === "all" && report.upsell?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-3">Passer à l&apos;action</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {report.upsell.map((u) => (
                <button
                  key={u.key}
                  onClick={() => onUpsell?.(u.key)}
                  className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 text-left hover:shadow-xl transition-shadow group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Wand2 className="h-4 w-4" />
                    <span className="rounded-full bg-white/20 text-[10px] font-bold px-2 py-0.5">{u.cost} tokens</span>
                  </div>
                  <p className="text-sm font-black mb-1">{u.title}</p>
                  <p className="text-xs text-white/85 leading-relaxed">{u.pitch}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs font-bold group-hover:gap-2 transition-all">
                    Lancer <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="text-center text-[10px] text-gray-400 mt-12 mb-4">
          Rapport Seora · adapté au secteur {sectorLabel} · généré avec Claude Sonnet
        </div>
      </div>
    </div>
  );
}
