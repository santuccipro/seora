"use client";

/**
 * 10/07/26 (Orsu) — Sidebar sticky des zones à risque.
 * Header + liste scrollable + footer compteur + bouton restore.
 */

import { motion } from "framer-motion";
import { EyeOff, RotateCcw, ArrowUpRight, AlertTriangle, CheckCircle2 } from "lucide-react";

type Paragraph = {
  index: number;
  text: string;
  score: number;
  risk: "high" | "medium" | "low";
};

export type ZonesSidebarProps = {
  flagged: Paragraph[];
  ignoredIndexes: Set<number>;
  currentIdx: number;
  onGoto: (i: number) => void;
  onToggleIgnore: (zoneIndex: number) => void;
  onResetIgnored: () => void;
};

function preview(text: string, wordCount = 30): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  if (words.length <= wordCount) return text.trim();
  return words.slice(0, wordCount).join(" ") + "...";
}

function tierBg(risk: Paragraph["risk"], score: number): string {
  if (risk === "high" || score >= 60) return "bg-red-500";
  if (risk === "medium" || score >= 30) return "bg-orange-500";
  return "bg-cyan-500";
}

export default function ZonesSidebar({
  flagged,
  ignoredIndexes,
  currentIdx,
  onGoto,
  onToggleIgnore,
  onResetIgnored,
}: ZonesSidebarProps) {
  const ignoredCount = ignoredIndexes.size;
  const totalFlagged = flagged.length;

  return (
    <aside className="lg:sticky lg:top-24 self-start rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100 bg-gradient-to-br from-zinc-50 to-white">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-600" strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-900">
              Zones à risque
            </p>
            <p className="text-[10px] text-zinc-500">
              {totalFlagged} détectée{totalFlagged > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[520px] overflow-y-auto">
        {totalFlagged === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-xs text-zinc-600 font-semibold mb-1">
              Aucune zone à risque
            </p>
            <p className="text-[11px] text-zinc-400">
              Le document est propre.
            </p>
            {ignoredCount > 0 && (
              <button
                type="button"
                onClick={onResetIgnored}
                className="mt-4 text-[11px] font-bold text-orange-600 hover:text-orange-800 inline-flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Restaurer {ignoredCount} zone{ignoredCount > 1 ? "s" : ""}
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {flagged.map((p, i) => {
              const isCurrent = i === currentIdx;
              const dot = tierBg(p.risk, p.score);
              return (
                <li key={p.index}>
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    className={`px-4 py-3 transition-colors ${
                      isCurrent ? "bg-orange-50/60 ring-2 ring-inset ring-orange-400" : "hover:bg-zinc-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onGoto(i)}
                      className="w-full text-left group"
                      aria-label={`Zone ${i + 1}, score ${p.score}%`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className={`h-6 w-6 rounded-md flex items-center justify-center text-white text-[10px] font-black shrink-0 ${
                            isCurrent ? "bg-orange-500" : dot
                          }`}
                        >
                          {i + 1}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          Zone {p.index + 1}
                        </span>
                        <span className="ml-auto text-[11px] font-black text-zinc-700 tabular-nums">
                          {p.score}%
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 leading-relaxed italic">
                        « {preview(p.text)} »
                      </p>
                    </button>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => onGoto(i)}
                        className="text-[10px] font-bold text-cyan-600 hover:text-cyan-800 uppercase tracking-widest inline-flex items-center gap-1 transition-colors"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        Voir
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleIgnore(p.index)}
                        className="text-[10px] font-bold text-zinc-400 hover:text-orange-600 uppercase tracking-widest inline-flex items-center gap-1 transition-colors"
                        title="Retirer cette zone du calcul global"
                      >
                        <EyeOff className="h-3 w-3" />
                        Ignorer
                      </button>
                    </div>
                  </motion.div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      {(totalFlagged > 0 || ignoredCount > 0) && (
        <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-[10px]">
          <span className="text-zinc-500 font-semibold">
            {totalFlagged} total · {ignoredCount} ignorée{ignoredCount > 1 ? "s" : ""}
          </span>
          {ignoredCount > 0 && (
            <button
              type="button"
              onClick={onResetIgnored}
              className="text-orange-600 hover:text-orange-800 font-bold inline-flex items-center gap-1 uppercase tracking-widest"
            >
              <RotateCcw className="h-3 w-3" />
              Restaurer
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
