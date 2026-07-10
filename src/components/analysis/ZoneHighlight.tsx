"use client";

/**
 * 10/07/26 (Orsu) — Rendu premium d'un paragraphe dans le reader du rapport.
 * Highlight cyan par intensité (score>=60 fort, >=40 léger), border-l-4 si
 * flaggé, badge flottant Cpu + numéro + score. Flash animation quand la
 * zone devient "current".
 */

import { Fragment, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { Cpu, EyeOff, RotateCcw } from "lucide-react";

type Sentence = {
  text: string;
  tail: string;
  score: number;
  why?: string;
};

type Paragraph = {
  index: number;
  text: string;
  score: number;
  risk: "high" | "medium" | "low";
  sentences?: Sentence[];
};

export type ZoneHighlightProps = {
  paragraph: Paragraph;
  flagIdx: number; // index dans le tableau flagged, -1 si pas flaggé
  isCurrent: boolean;
  isIgnored: boolean;
  onToggleIgnore: () => void;
  onGoto: () => void;
};

export default function ZoneHighlight({
  paragraph,
  flagIdx,
  isCurrent,
  isIgnored,
  onToggleIgnore,
  onGoto,
}: ZoneHighlightProps) {
  const isFlagged = flagIdx !== -1;

  const sentences: Sentence[] =
    paragraph.sentences && paragraph.sentences.length > 0
      ? paragraph.sentences
      : [{ text: paragraph.text, tail: "", score: paragraph.score }];

  // Flash animation controls — déclenchée quand isCurrent devient true.
  const flashControls = useAnimation();

  useEffect(() => {
    if (isCurrent) {
      flashControls.start({
        backgroundColor: [
          "rgba(253, 224, 71, 0.35)", // yellow
          "rgba(6, 182, 212, 0.20)", // cyan
          "rgba(6, 182, 212, 0.00)", // transparent
        ],
        transition: { duration: 0.8, ease: "easeOut", times: [0, 0.4, 1] },
      });
    } else {
      flashControls.set({ backgroundColor: "rgba(6, 182, 212, 0)" });
    }
  }, [isCurrent, flashControls]);

  return (
    <div
      id={`report-para-${paragraph.index}`}
      className={`scroll-mt-24 relative group grid grid-cols-[1fr_auto] gap-x-4 py-2 ${
        isIgnored ? "opacity-40" : ""
      }`}
    >
      {/* Zone de flash (couche sous le texte) */}
      <motion.div
        animate={flashControls}
        initial={{ backgroundColor: "rgba(6, 182, 212, 0)" }}
        className="pointer-events-none absolute inset-0 rounded-lg -mx-2"
      />

      {/* Texte */}
      <div
        className={`relative transition-all rounded-md ${
          isFlagged ? "border-l-4 border-cyan-400 pl-4 -ml-4" : ""
        } ${isCurrent ? "border-orange-400" : ""}`}
      >
        <p
          className={`text-[15px] leading-[1.85] text-zinc-800 whitespace-pre-wrap ${
            isIgnored ? "line-through decoration-zinc-400" : ""
          }`}
        >
          {sentences.map((s, si) => {
            const bg =
              isIgnored
                ? ""
                : s.score >= 60
                  ? "bg-cyan-100 px-1 py-0.5 rounded"
                  : s.score >= 40
                    ? "bg-cyan-50 px-1 py-0.5 rounded"
                    : "";
            return (
              <Fragment key={si}>
                <span className={bg} title={s.why || undefined}>
                  {s.text}
                </span>
                {s.tail || " "}
              </Fragment>
            );
          })}
        </p>
      </div>

      {/* Badge flottant à droite */}
      <div className="relative w-16 flex items-start justify-center pt-1">
        {isFlagged && !isIgnored && (
          <div className="flex flex-col items-center gap-1">
            <motion.button
              type="button"
              onClick={onGoto}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className={`flex flex-col items-center gap-0.5 rounded-xl border-2 bg-white shadow-sm px-2 py-1.5 transition-colors ${
                isCurrent ? "border-orange-400 shadow-orange-100" : "border-cyan-300 hover:border-cyan-400"
              }`}
              aria-label={`Aller à la zone ${flagIdx + 1}, ${paragraph.score}% suspect`}
            >
              <Cpu
                className={`h-3.5 w-3.5 ${isCurrent ? "text-orange-500" : "text-cyan-500"}`}
                strokeWidth={2.4}
              />
              <span
                className={`text-[13px] font-black tabular-nums leading-none ${
                  isCurrent ? "text-orange-500" : "text-cyan-600"
                }`}
              >
                {flagIdx + 1}
              </span>
              <span className="text-[8px] font-bold text-zinc-400 tabular-nums leading-none">
                {paragraph.score}%
              </span>
            </motion.button>
            <button
              type="button"
              onClick={onToggleIgnore}
              className="text-[9px] font-bold text-zinc-400 hover:text-orange-600 uppercase tracking-widest inline-flex items-center gap-0.5 transition-colors"
              aria-label="Ignorer cette zone"
              title="Retirer cette zone du calcul global"
            >
              <EyeOff className="h-2.5 w-2.5" strokeWidth={2.5} />
              Ignorer
            </button>
          </div>
        )}
        {isIgnored && (
          <button
            type="button"
            onClick={onToggleIgnore}
            className="text-[9px] font-bold text-orange-600 hover:text-orange-800 uppercase tracking-widest inline-flex items-center gap-0.5 mt-1 transition-colors"
            aria-label="Restaurer cette zone"
          >
            <RotateCcw className="h-2.5 w-2.5" strokeWidth={2.5} />
            Restaurer
          </button>
        )}
      </div>
    </div>
  );
}
