"use client";

/**
 * 10/07/26 (Orsu) — Premium ScoreRing pour le rapport /humanizer.
 * SVG animé (stroke-dashoffset via framer-motion) + count-up sur le nombre
 * central. Couleur par tier :
 *   0-15   emerald (#10b981)
 *   15-30  amber   (#f59e0b)
 *   30-50  orange  (#f97316)
 *   50-70  rose    (#f43f5e)
 *   70+    red     (#ef4444)
 */

import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

export type ScoreRingProps = {
  value: number;
  size?: number;
  confidence?: number;
  label?: string;
};

function tierColor(v: number): { stroke: string; text: string; bg: string } {
  const clamped = Math.max(0, Math.min(100, v));
  if (clamped < 15) return { stroke: "#10b981", text: "text-emerald-600", bg: "bg-emerald-50" };
  if (clamped < 30) return { stroke: "#f59e0b", text: "text-amber-600", bg: "bg-amber-50" };
  if (clamped < 50) return { stroke: "#f97316", text: "text-orange-600", bg: "bg-orange-50" };
  if (clamped < 70) return { stroke: "#f43f5e", text: "text-rose-600", bg: "bg-rose-50" };
  return { stroke: "#ef4444", text: "text-red-600", bg: "bg-red-50" };
}

export default function ScoreRing({
  value,
  size = 180,
  confidence,
  label = "Textes suspects",
}: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const { stroke, text } = tierColor(clamped);

  // Ring geometry
  const strokeWidth = Math.max(8, Math.round(size / 15));
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (clamped / 100) * circumference;

  // Count-up motion value
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, clamped, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [clamped, count]);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label} : ${clamped}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-0.5">
          <motion.span
            className={`font-black tabular-nums leading-none ${text}`}
            style={{ fontSize: size * 0.28 }}
          >
            {rounded}
          </motion.span>
          <span
            className={`font-bold ${text} opacity-80`}
            style={{ fontSize: size * 0.11 }}
          >
            %
          </span>
        </div>
        <span
          className="mt-1.5 text-[10px] uppercase tracking-widest font-semibold text-zinc-500"
          style={{ fontSize: Math.max(9, size * 0.06) }}
        >
          {label}
        </span>
        {typeof confidence === "number" && (
          <span
            className="mt-0.5 text-[9px] text-zinc-400 font-medium"
            style={{ fontSize: Math.max(8, size * 0.055) }}
          >
            Confiance {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
