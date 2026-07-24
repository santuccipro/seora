"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { FileText, BarChart3, Briefcase } from "lucide-react";
import { getTipsForSector, SECTOR_PASTEL } from "@/lib/career-tips";
import type { CareerTip } from "@/lib/career-tips";

/* ─── Types ─── */
interface DashboardStats {
  totalAnalyses: number;
  avgScore: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  score: number | null;
  date: string;
}

interface DashboardApiResponse {
  stats: DashboardStats;
  recentActivity: RecentActivity[];
}

interface JobApplication {
  id: string;
  status: string;
}

/* ─── Quick actions config ─── */
const QUICK_ACTIONS = [
  { href: "/app", label: "Score mon CV ATS", emoji: "📄" },
  { href: "/cv-builder", label: "Créer mon CV", emoji: "✏️" },
  { href: "/cover-letter", label: "Rédiger ma lettre", emoji: "📝" },
  { href: "/linkedin-analyzer", label: "📊 Optimiser mon LinkedIn", emoji: "" },
  { href: "/job-match", label: "Adapter mon CV à l'offre", emoji: "🎯" },
  { href: "/photo-studio", label: "Photo LinkedIn IA", emoji: "📸" },
  { href: "/interview-prep", label: "Préparer mon entretien", emoji: "🎤" },
];

/* ─── Main component ─── */
export function DashboardEnhancements() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeApps, setActiveApps] = useState<number>(0);
  const [recentSector, setRecentSector] = useState<string>("generique");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, appsRes] = await Promise.allSettled([
          fetch("/api/dashboard").then((r) => r.json() as Promise<DashboardApiResponse>),
          fetch("/api/job-applications").then((r) => r.json() as Promise<JobApplication[]>),
        ]);

        if (dashRes.status === "fulfilled" && dashRes.value && !("error" in dashRes.value)) {
          const data = dashRes.value;
          setStats(data.stats);
          // Try to infer sector from recent activity
          // recentActivity doesn't expose sector, so we just use "generique"
          // unless we can infer from the title or type
          setRecentSector("generique");
          void data; // suppress unused warning on recentActivity for now
        }

        if (appsRes.status === "fulfilled" && Array.isArray(appsRes.value)) {
          const active = appsRes.value.filter(
            (a: JobApplication) => a.status !== "rejected"
          ).length;
          setActiveApps(active);
        }
      } catch {
        // silently fail — enhancements are non-critical
      } finally {
        setLoading(false);
      }
    };

    void fetchAll();
  }, []);

  // Memoize tips so they don't re-shuffle on every render
  const tips = useMemo<CareerTip[]>(
    () => getTipsForSector(recentSector, 3),
    [recentSector]
  );

  const pastel = SECTOR_PASTEL[recentSector] ?? SECTOR_PASTEL["generique"];

  return (
    <div className="space-y-5 mb-6">
      {/* ── A. Stats bar ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatWidget
          icon={<FileText className="h-4 w-4 text-indigo-600" />}
          bg="bg-indigo-50"
          value={loading ? "…" : String(stats?.totalAnalyses ?? 0)}
          label="CVs analysés"
        />
        <StatWidget
          icon={<BarChart3 className="h-4 w-4 text-emerald-600" />}
          bg="bg-emerald-50"
          value={loading ? "…" : stats && stats.totalAnalyses > 0 ? `${stats.avgScore}/100` : "—"}
          label="Score moyen"
        />
        <StatWidget
          icon={<Briefcase className="h-4 w-4 text-amber-600" />}
          bg="bg-amber-50"
          value={loading ? "…" : String(activeApps)}
          label="Candidatures"
        />
      </div>

      {/* ── B. Conseils du jour ── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2">
          Conseils pour ta candidature
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {tips.map((tip, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-4 ${pastel}`}
            >
              <div className="text-2xl mb-2">{tip.icon}</div>
              <p className="text-xs font-bold text-gray-900 mb-1">{tip.title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">{tip.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── C. Quick actions ── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2">
          Accès rapide
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all whitespace-nowrap shrink-0 shadow-sm"
            >
              <span>{action.emoji}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Stat widget ─── */
function StatWidget({
  icon,
  bg,
  value,
  label,
}: {
  icon: React.ReactNode;
  bg: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl glass-strong border border-gray-200/60 p-3.5 flex flex-col gap-2">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-extrabold text-gray-900 leading-none">{value}</p>
        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}
