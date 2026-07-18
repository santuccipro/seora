"use client";

/**
 * 10/07/26 (Orsu) — Rendu premium d'un paragraphe dans le reader du rapport.
 * 18/07/26 — Ajout panel "Humanisé" inline : before/after style Rewordify.
 */

import { Fragment, useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Cpu, EyeOff, RotateCcw, Wand2, Loader2, ClipboardCopy, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

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
  flagIdx: number;
  isCurrent: boolean;
  isIgnored: boolean;
  onToggleIgnore: () => void;
  onGoto: () => void;
  onHumanize?: () => void;
  humanizedText?: string;
  humanizeLoading?: boolean;
};

export default function ZoneHighlight({
  paragraph,
  flagIdx,
  isCurrent,
  isIgnored,
  onToggleIgnore,
  onGoto,
  onHumanize,
  humanizedText,
  humanizeLoading,
}: ZoneHighlightProps) {
  const isFlagged = flagIdx !== -1;
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  // Auto-open panel when humanized text arrives
  useEffect(() => {
    if (humanizedText) setPanelOpen(true);
  }, [humanizedText]);

  const sentences: Sentence[] =
    paragraph.sentences && paragraph.sentences.length > 0
      ? paragraph.sentences
      : [{ text: paragraph.text, tail: "", score: paragraph.score }];

  const flashControls = useAnimation();

  useEffect(() => {
    if (isCurrent) {
      flashControls.start({
        backgroundColor: [
          "rgba(253, 224, 71, 0.35)",
          "rgba(6, 182, 212, 0.20)",
          "rgba(6, 182, 212, 0.00)",
        ],
        transition: { duration: 0.8, ease: "easeOut", times: [0, 0.4, 1] },
      });
    } else {
      flashControls.set({ backgroundColor: "rgba(6, 182, 212, 0)" });
    }
  }, [isCurrent, flashControls]);

  const handleCopy = () => {
    if (!humanizedText) return;
    navigator.clipboard.writeText(humanizedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`report-para-${paragraph.index}`}
      className={`scroll-mt-24 relative group py-2 ${isIgnored ? "opacity-40" : ""}`}
    >
      {/* Flash layer */}
      <motion.div
        animate={flashControls}
        initial={{ backgroundColor: "rgba(6, 182, 212, 0)" }}
        className="pointer-events-none absolute inset-0 rounded-lg -mx-2"
      />

      {/* Main row: text + badge */}
      <div className="grid grid-cols-[1fr_auto] gap-x-4">
        {/* Text */}
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

        {/* Badge */}
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
            >
              <RotateCcw className="h-2.5 w-2.5" strokeWidth={2.5} />
              Restaurer
            </button>
          )}
        </div>
      </div>

      {/* ── Humaniser CTA bar (visible dès qu'une zone est flaggée) ── */}
      {isFlagged && !isIgnored && onHumanize && !humanizedText && (
        <div className="mt-2 -ml-4 pl-4">
          {humanizeLoading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-violet-500 font-semibold">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Réécriture en cours…
            </div>
          ) : (
            <button
              type="button"
              onClick={onHumanize}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 px-4 py-2 text-xs font-bold transition-colors"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Humaniser cette zone
              <span className="ml-1 rounded-full bg-violet-200 text-violet-700 px-1.5 py-0.5 text-[10px] font-black">−1 token</span>
            </button>
          )}
        </div>
      )}

      {/* ── Humanisé panel — before/after inline ── */}
      {humanizedText && panelOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-3 ml-0 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white overflow-hidden shadow-sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-100 bg-emerald-50">
            <div className="flex items-center gap-1.5">
              <Wand2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[10px] uppercase tracking-widest font-black text-emerald-700">
                Version humanisée
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {copied ? (
                  <><CheckCircle2 className="h-3 w-3" /> Copié !</>
                ) : (
                  <><ClipboardCopy className="h-3 w-3" /> Copier</>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Before / After */}
          <div className="grid grid-cols-2 divide-x divide-emerald-100">
            <div className="px-4 py-3">
              <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold mb-1.5">Avant</p>
              <p className="text-xs text-zinc-500 leading-relaxed line-through decoration-zinc-300">
                {paragraph.text}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[9px] uppercase tracking-widest text-emerald-600 font-bold mb-1.5">Après</p>
              <p className="text-xs text-zinc-800 leading-relaxed font-medium">
                {humanizedText}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
