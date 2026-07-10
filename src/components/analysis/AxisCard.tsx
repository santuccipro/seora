"use client";

/**
 * 10/07/26 (Orsu) — Carte réutilisable pour la grille "3 axes" (Similitudes /
 * Détection IA / Obfuscation). Count-up Framer Motion sur la valeur si
 * `countUp = true`. Hover shadow + translate-y.
 */

import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export type AxisAccent =
  | "orange"
  | "cyan"
  | "violet"
  | "gray"
  | "emerald"
  | "amber"
  | "rose"
  | "red";

const ACCENT_MAP: Record<AxisAccent, {
  iconBg: string;
  iconText: string;
  valueText: string;
  progressBar: string;
  progressTrack: string;
  ring: string;
}> = {
  orange: {
    iconBg: "bg-orange-100",
    iconText: "text-orange-600",
    valueText: "text-orange-600",
    progressBar: "bg-gradient-to-r from-orange-400 to-orange-600",
    progressTrack: "bg-orange-50",
    ring: "ring-orange-200",
  },
  cyan: {
    iconBg: "bg-cyan-100",
    iconText: "text-cyan-600",
    valueText: "text-cyan-600",
    progressBar: "bg-gradient-to-r from-cyan-400 to-cyan-600",
    progressTrack: "bg-cyan-50",
    ring: "ring-cyan-200",
  },
  violet: {
    iconBg: "bg-violet-100",
    iconText: "text-violet-600",
    valueText: "text-violet-600",
    progressBar: "bg-gradient-to-r from-violet-400 to-violet-600",
    progressTrack: "bg-violet-50",
    ring: "ring-violet-200",
  },
  gray: {
    iconBg: "bg-zinc-100",
    iconText: "text-zinc-500",
    valueText: "text-zinc-500",
    progressBar: "bg-zinc-300",
    progressTrack: "bg-zinc-100",
    ring: "ring-zinc-200",
  },
  emerald: {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    valueText: "text-emerald-600",
    progressBar: "bg-gradient-to-r from-emerald-400 to-emerald-600",
    progressTrack: "bg-emerald-50",
    ring: "ring-emerald-200",
  },
  amber: {
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    valueText: "text-amber-600",
    progressBar: "bg-gradient-to-r from-amber-400 to-amber-600",
    progressTrack: "bg-amber-50",
    ring: "ring-amber-200",
  },
  rose: {
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    valueText: "text-rose-600",
    progressBar: "bg-gradient-to-r from-rose-400 to-rose-600",
    progressTrack: "bg-rose-50",
    ring: "ring-rose-200",
  },
  red: {
    iconBg: "bg-red-100",
    iconText: "text-red-600",
    valueText: "text-red-600",
    progressBar: "bg-gradient-to-r from-red-400 to-red-600",
    progressTrack: "bg-red-50",
    ring: "ring-red-200",
  },
};

export type AxisCardProps = {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle: string;
  accent: AxisAccent;
  emphasize?: boolean;
  badge?: string;
  countUp?: boolean;
  progressPct?: number;
};

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span className="tabular-nums">{rounded}</motion.span>;
}

export default function AxisCard({
  icon: Icon,
  title,
  value,
  subtitle,
  accent,
  emphasize = false,
  badge,
  countUp = false,
  progressPct,
}: AxisCardProps) {
  const cfg = ACCENT_MAP[accent];
  const clampPct = typeof progressPct === "number"
    ? Math.max(0, Math.min(100, progressPct))
    : undefined;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`group relative rounded-2xl bg-white border p-5 shadow-sm hover:shadow-xl transition-all duration-200 ${
        emphasize ? `border-zinc-200 ring-1 ${cfg.ring}` : "border-zinc-200"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-5 w-5 ${cfg.iconText}`} strokeWidth={2.2} />
        </div>
        {badge && (
          <span className={`text-[9px] font-black uppercase tracking-widest rounded-full px-2 py-1 ${cfg.iconBg} ${cfg.iconText}`}>
            {badge}
          </span>
        )}
      </div>

      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">
        {title}
      </p>

      <div className={`flex items-baseline gap-0.5 ${emphasize ? "text-4xl" : "text-3xl"} font-black leading-none mb-2 ${cfg.valueText}`}>
        {countUp && typeof value === "number" ? (
          <>
            <AnimatedNumber value={value} />
            <span className="text-lg opacity-70">%</span>
          </>
        ) : (
          <span className="tabular-nums">{value}</span>
        )}
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed">
        {subtitle}
      </p>

      {typeof clampPct === "number" && (
        <div className={`mt-4 h-1.5 rounded-full overflow-hidden ${cfg.progressTrack}`}>
          <motion.div
            className={`h-full ${cfg.progressBar} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${clampPct}%` }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        </div>
      )}
    </motion.div>
  );
}
