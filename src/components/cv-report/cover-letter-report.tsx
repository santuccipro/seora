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
  Zap,
  Target,
  X,
} from "lucide-react";
import type { ClDeepReport } from "@/lib/cover-letter-deep-analysis";

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
  report: ClDeepReport;
  onClose: () => void;
  onUpsell?: (key: string) => void;
}

export function CoverLetterReport({ report, onClose, onUpsell }: Props) {
  const [openSection, setOpenSection] = useState<number | null>(0);
  const score = report.globalScore ?? 0;
  const scoreColor = useMemo(() => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-sky-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  }, [score]);
  const scoreGradient = useMemo(() => {
    if (score >= 85) return "from-blue-500 to-indigo-500";
    if (score >= 70) return "from-sky-500 to-blue-500";
    if (score >= 50) return "from-amber-500 to-orange-500";
    return "from-red-500 to-rose-500";
  }, [score]);

  const dimensions = report.dimensions ?? [];
  const sections = report.sections ?? [];
  const redFlags = report.redFlags ?? [];
  const quickWins = report.quickWins ?? [];
  const upsell = report.upsell ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="sticky top-0 z-40 backdrop-blur-sm bg-white/95 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Score</p>
              <p className={`text-2xl font-black leading-none ${scoreColor}`}>{score}<span className="text-sm text-gray-400">/100</span></p>
            </div>
            <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${scoreGradient} flex items-center justify-center text-white font-black text-xs shadow-lg`}>
              LM
            </div>
            <button onClick={onClose} className="ml-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 sm:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className={`rounded-3xl bg-gradient-to-br ${scoreGradient} text-white p-6 sm:p-8 shadow-2xl mb-8`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold mb-2">Rapport Lettre de motivation</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">{report.scoreLabel ?? "Analyse en cours…"}</h1>
              <p className="text-sm sm:text-base text-white/90 mt-2 leading-relaxed">{report.headline}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-6xl font-black leading-none">{score}</p>
              <p className="text-xs text-white/70 mt-1">/ 100</p>
            </div>
          </div>
          <p className="text-sm text-white/95 leading-relaxed mt-3 border-t border-white/20 pt-4">{report.verdict}</p>
          <div className="flex flex-wrap items-center gap-4 mt-5 text-xs text-white/80">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              ~{report.timeToImproveMinutes} min pour améliorer
            </div>
            {report.companyName && (
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                {report.companyName}
              </div>
            )}
          </div>
        </div>

        {/* Tone match */}
        {report.toneMatch && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-8">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-xs uppercase tracking-widest font-black text-gray-500">Adéquation du ton</h2>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-bold">Détecté :</span> {report.toneMatch.detectedTone} · <span className="font-bold">Attendu :</span> {report.toneMatch.expectedTone}
                </p>
                <p className="text-xs text-gray-500 mt-1">{report.toneMatch.advice}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-gray-900">{report.toneMatch.matchPct}%</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">match</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full ${report.toneMatch.matchPct >= 70 ? "bg-emerald-500" : report.toneMatch.matchPct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${report.toneMatch.matchPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Dimensions */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-3">6 dimensions notées</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dimensions.map((d) => (
              <div key={d.key} className="rounded-2xl border border-gray-200 bg-white p-4">
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

        {/* Section verdicts */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-3">Verdict par section</h2>
          <div className="space-y-2">
            {sections.map((sec, i) => {
              const style = STATUS_COLORS[sec.status] ?? STATUS_COLORS.correct;
              const Icon = style.icon;
              const open = openSection === i;
              return (
                <div key={i} className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden`}>
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

        {/* Red flags */}
        {redFlags.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-3">Signaux critiques</h2>
            <div className="space-y-2">
              {redFlags.map((f, i) => {
                const style = SEVERITY_COLORS[f.severity] ?? SEVERITY_COLORS.info;
                const Icon = style.icon;
                return (
                  <div key={i} className={`rounded-xl ${style.bg} border-l-4 ${f.severity === "critical" ? "border-red-500" : f.severity === "warning" ? "border-amber-500" : "border-sky-500"} p-3.5 flex gap-3`}>
                    <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${style.text}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{f.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{f.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Quick wins */}
        {quickWins.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-3">Quick wins</h2>
            <div className="space-y-3">
              {quickWins.map((w, i) => (
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

        {/* Upsell hooks */}
        {upsell.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-3">Passer à l&apos;action</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {upsell.map((u) => (
                <button
                  key={u.key}
                  onClick={() => onUpsell?.(u.key)}
                  className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 text-left hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Wand2 className="h-4 w-4" />
                    <span className="rounded-full bg-white/20 text-[10px] font-bold px-2 py-0.5">{u.cost} tokens</span>
                  </div>
                  <p className="text-sm font-black mb-1">{u.title}</p>
                  <p className="text-xs text-white/85 leading-relaxed">{u.pitch}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs font-bold">
                    Lancer <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
