"use client";

/**
 * 10/07/26 (Orsu) — Timeline horizontale premium.
 * Axe fin, cercles numérotés positionnés proportionnellement au index/N.
 * Couleur par tier (cyan low / orange med / red high), diamètre par longueur
 * du paragraphe. Hover tooltip (extrait 30 mots + score). Click → scroll
 * fluide + flash 800ms. Chevrons de navigation.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

type Paragraph = {
  index: number;
  text: string;
  score: number;
  risk: "high" | "medium" | "low";
};

export type TimelineNumberedProps = {
  paragraphs: Paragraph[];
  flagged: Paragraph[];
  currentIdx: number;
  onSelect: (i: number) => void;
};

function markerTierColor(risk: Paragraph["risk"], score: number) {
  if (risk === "high" || score >= 60) {
    return { bg: "bg-red-500", ring: "ring-red-200", hex: "#ef4444" };
  }
  if (risk === "medium" || score >= 30) {
    return { bg: "bg-orange-500", ring: "ring-orange-200", hex: "#f97316" };
  }
  return { bg: "bg-cyan-500", ring: "ring-cyan-200", hex: "#06b6d4" };
}

function markerSize(text: string): number {
  const len = text.length;
  // 22px pour phrase courte, ~36px pour un gros paragraphe.
  if (len < 120) return 22;
  if (len < 300) return 26;
  if (len < 600) return 30;
  if (len < 1200) return 34;
  return 36;
}

function extractPreview(text: string, wordCount = 30): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  if (words.length <= wordCount) return text.trim();
  return words.slice(0, wordCount).join(" ") + "...";
}

export default function TimelineNumbered({
  paragraphs,
  flagged,
  currentIdx,
  onSelect,
}: TimelineNumberedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);

  const flaggedCount = flagged.length;
  const total = Math.max(1, paragraphs.length - 1);

  const handleHover = useCallback((flaggedIdx: number, evt: React.MouseEvent<HTMLButtonElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const btnRect = evt.currentTarget.getBoundingClientRect();
    if (!rect) return;
    setHoveredIdx(flaggedIdx);
    setTooltipPos({
      left: btnRect.left - rect.left + btnRect.width / 2,
      top: btnRect.top - rect.top,
    });
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredIdx(null);
    setTooltipPos(null);
  }, []);

  const goPrev = () => onSelect(Math.max(0, currentIdx - 1));
  const goNext = () => onSelect(Math.min(flaggedCount - 1, currentIdx + 1));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, flaggedCount]);

  if (paragraphs.length === 0) {
    return (
      <div className="w-full py-6 text-center text-xs text-zinc-400 italic">
        Aucune zone à afficher.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Compteur + navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-600" strokeWidth={2.4} />
          </div>
          <span className="text-sm font-bold text-zinc-800">
            {flaggedCount} zone{flaggedCount > 1 ? "s" : ""} à risque
          </span>
          {flaggedCount > 0 && (
            <span className="text-xs text-zinc-400">
              · {Math.min(currentIdx + 1, flaggedCount)} / {flaggedCount}
            </span>
          )}
        </div>

        {flaggedCount > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIdx === 0}
              aria-label="Zone précédente"
              className="p-1.5 rounded-lg hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-600" />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={currentIdx >= flaggedCount - 1}
              aria-label="Zone suivante"
              className="p-1.5 rounded-lg hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </button>
          </div>
        )}
      </div>

      {/* Timeline axis */}
      <div className="relative h-16">
        {/* Axe horizontal fin */}
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-zinc-200 via-zinc-300 to-zinc-200 rounded-full" />

        {/* Points de repère début/fin */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-zinc-300" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-zinc-300" />

        {/* Marqueurs numérotés (uniquement pour zones flaggées) */}
        {flagged.map((p, i) => {
          const posPct = (p.index / total) * 100;
          const size = markerSize(p.text);
          const isCurrent = i === currentIdx;
          const color = markerTierColor(p.risk, p.score);

          return (
            <motion.button
              key={p.index}
              type="button"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.35,
                delay: i * 0.04,
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(i)}
              onMouseEnter={(e) => handleHover(i, e)}
              onMouseLeave={handleLeave}
              onFocus={(e) => handleHover(i, e as unknown as React.MouseEvent<HTMLButtonElement>)}
              onBlur={handleLeave}
              aria-label={`Zone ${i + 1} sur ${flaggedCount}, score ${p.score}%`}
              aria-current={isCurrent ? "true" : undefined}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full flex items-center justify-center font-black text-white shadow-md transition-all ${color.bg} ${
                isCurrent ? `ring-4 ${color.ring} scale-110 z-20` : "z-10"
              }`}
              style={{
                left: `${posPct}%`,
                width: size,
                height: size,
                fontSize: Math.max(9, size * 0.42),
              }}
            >
              {i + 1}
            </motion.button>
          );
        })}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredIdx !== null && tooltipPos && flagged[hoveredIdx] && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute z-30 max-w-xs"
            style={{
              left: tooltipPos.left,
              top: tooltipPos.top - 8,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="rounded-xl bg-zinc-900 text-white px-3 py-2 shadow-xl text-xs leading-relaxed">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-widest font-black text-zinc-300">
                  Zone {hoveredIdx + 1}
                </span>
                <span
                  className="text-[10px] font-black rounded-full px-1.5 py-0.5"
                  style={{
                    background: markerTierColor(flagged[hoveredIdx].risk, flagged[hoveredIdx].score).hex,
                  }}
                >
                  {flagged[hoveredIdx].score}%
                </span>
              </div>
              <p className="italic text-zinc-100">
                « {extractPreview(flagged[hoveredIdx].text)} »
              </p>
            </div>
            <div className="mx-auto h-2 w-2 rotate-45 bg-zinc-900 -mt-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
