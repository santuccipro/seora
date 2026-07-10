"use client";

/**
 * 10/07/26 (Orsu) — Skeleton loading state pour l'analyse en cours.
 * Ring skeleton pulsing + 3 étapes qui deviennent vertes progressivement,
 * message rassurant + progress bar globale.
 *
 * Prop `phase` prend une valeur parmi : "extracting" | "detecting" | "scoring".
 * Si la valeur n'est pas reconnue, on considère "extracting" par défaut.
 */

import { motion } from "framer-motion";
import { CheckCircle2, Loader2, FileSearch } from "lucide-react";

export type LoadingReportProps = {
  phase: string;
  detail?: string;
};

const STEPS: Array<{ key: string; label: string }> = [
  { key: "extracting", label: "Extraction du texte" },
  { key: "detecting", label: "Analyse par paragraphe" },
  { key: "scoring", label: "Notation Claude Sonnet" },
];

export default function LoadingReport({ phase, detail }: LoadingReportProps) {
  const order = STEPS.map((s) => s.key);
  const idx = order.indexOf(phase);
  const currentIdx = idx === -1 ? 0 : idx;
  const globalPct = Math.round(((currentIdx + 0.5) / STEPS.length) * 100);

  return (
    <div className="rounded-3xl bg-white shadow-xl border border-zinc-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <FileSearch className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-bold">Analyse en cours</p>
            <p className="text-[11px] opacity-90">Aucune réécriture — juste le diagnostic</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-8 flex flex-col items-center">
        {/* Ring skeleton pulsing */}
        <div className="relative mb-8">
          <svg width={180} height={180} className="-rotate-90">
            <circle cx={90} cy={90} r={78} stroke="#f1f5f9" strokeWidth={12} fill="none" />
            <motion.circle
              cx={90}
              cy={90}
              r={78}
              stroke="#f97316"
              strokeWidth={12}
              fill="none"
              strokeLinecap="round"
              strokeDasharray="490"
              initial={{ strokeDashoffset: 490 }}
              animate={{
                strokeDashoffset: [490, 245, 490],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="text-4xl font-black text-orange-500 tabular-nums"
            >
              {globalPct}
              <span className="text-lg opacity-70">%</span>
            </motion.div>
          </div>
        </div>

        {/* Steps checklist */}
        <div className="w-full max-w-md space-y-3 mb-6">
          {STEPS.map((step, i) => {
            const passed = i < currentIdx;
            const active = i === currentIdx;
            return (
              <motion.div
                key={step.key}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    passed ? "bg-emerald-500" : active ? "bg-orange-500" : "bg-zinc-200"
                  }`}
                >
                  {passed ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={2.6} />
                    </motion.div>
                  ) : active ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" strokeWidth={2.6} />
                  ) : (
                    <span className="text-[10px] text-white font-black">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      passed ? "text-zinc-400 line-through" : active ? "text-zinc-900" : "text-zinc-400"
                    }`}
                  >
                    {step.label}
                    {active && "…"}
                  </p>
                  {active && detail && (
                    <p className="text-[11px] text-zinc-500 italic mt-0.5">{detail}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${globalPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        <p className="text-xs text-zinc-500 text-center max-w-md leading-relaxed">
          Analyse en cours — ~2 min sur un gros document. Reste ouvert, tu recevras une notification.
        </p>
      </div>
    </div>
  );
}
