"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import {
  Activity,
  Clock,
  Loader2,
  Cpu,
  BarChart3,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface StatsWindow {
  window_hours: number;
  total_ok: number;
  avg_score: number | null;
  avg_confidence: number | null;
  avg_latency_ms: number | null;
  low_confidence_rate_pct: number | null;
  score_histogram: { bucket: string; count: number }[];
  confidence_histogram: { bucket: string; count: number }[];
  latency_ms: { p50: number | null; p95: number | null; p99: number | null };
  language_distribution: { lang: string; count: number }[];
  http_status_distribution: { status: number; count: number }[];
}

interface SignalStats {
  window_hours: number;
  n_samples: number;
  signal_means: Record<string, number>;
}

interface DetectorStatsResponse {
  window_1: StatsWindow;
  window_7: StatsWindow;
  window_30: StatsWindow;
  signals?: SignalStats;
  error?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/** Minimal inline-SVG bar chart — no external deps. */
function Histogram({
  data,
  color = "#6366f1",
  title,
  ariaLabel,
}: {
  data: { bucket: string; count: number }[];
  color?: string;
  title: string;
  ariaLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 480;
  const H = 200;
  const padL = 40;
  const padB = 30;
  const padT = 10;
  const barW = (W - padL - 10) / Math.max(1, data.length);
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={ariaLabel ?? title}
        >
          <line x1={padL} y1={H - padB} x2={W - 5} y2={H - padB} stroke="#e5e7eb" />
          {data.map((d, i) => {
            const h = ((H - padB - padT) * d.count) / max;
            const x = padL + i * barW + 3;
            const y = H - padB - h;
            return (
              <g key={d.bucket}>
                <rect
                  x={x}
                  y={y}
                  width={Math.max(1, barW - 6)}
                  height={Math.max(0, h)}
                  fill={color}
                  rx={2}
                >
                  <title>
                    {d.bucket}: {d.count}
                  </title>
                </rect>
                <text
                  x={x + barW / 2 - 3}
                  y={H - padB + 14}
                  fontSize={9}
                  textAnchor="middle"
                  fill="#6b7280"
                >
                  {d.bucket}
                </text>
                {d.count > 0 && (
                  <text
                    x={x + barW / 2 - 3}
                    y={y - 4}
                    fontSize={9}
                    textAnchor="middle"
                    fill="#374151"
                  >
                    {d.count}
                  </text>
                )}
              </g>
            );
          })}
          <text x={padL - 8} y={padT + 8} fontSize={9} textAnchor="end" fill="#9ca3af">
            {max}
          </text>
          <text x={padL - 8} y={H - padB} fontSize={9} textAnchor="end" fill="#9ca3af">
            0
          </text>
        </svg>
      </div>
    </div>
  );
}

function SignalTable({ signals }: { signals: SignalStats | undefined }) {
  if (!signals) return null;
  const rows = Object.entries(signals.signal_means)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24);
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-1">
        Signaux — moyennes 7 derniers jours ({signals.n_samples} échantillons)
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Sert à surveiller le drift : si une moyenne bouge fort d&apos;une semaine sur
        l&apos;autre, un axe du modèle bouge.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between border-b border-gray-100 py-1.5"
          >
            <code className="text-gray-600 text-xs">{k}</code>
            <span className="font-medium text-gray-900">{Number(v).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LanguageBar({ dist }: { dist: { lang: string; count: number }[] }) {
  const total = dist.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;
  const palette: Record<string, string> = {
    fr: "#6366f1",
    en: "#22c55e",
    es: "#f97316",
    unknown: "#9ca3af",
  };
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Langues</h3>
      <div className="flex h-6 rounded-full overflow-hidden">
        {dist.map((d) => (
          <div
            key={d.lang}
            style={{
              width: `${(100 * d.count) / total}%`,
              background: palette[d.lang] || "#a3a3a3",
            }}
            title={`${d.lang}: ${d.count}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {dist.map((d) => (
          <div key={d.lang} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ background: palette[d.lang] || "#a3a3a3" }}
            />
            <span className="text-gray-600 uppercase">{d.lang}</span>
            <span className="text-gray-400">
              {d.count} ({((100 * d.count) / total).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DetectorStatsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DetectorStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setRefreshing(true);
    fetch("/api/admin/detector-stats?window_hours=24&signals=1")
      .then((r) => {
        if (r.status === 403) {
          setError("Accès réservé aux administrateurs");
          return null;
        }
        return r.json();
      })
      .then((d: DetectorStatsResponse | null) => {
        if (!d) return;
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(String(e)))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }
  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      </DashboardLayout>
    );
  }
  if (!data) return null;

  const w1 = data.window_1;
  const w7 = data.window_7;
  const w30 = data.window_30;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Cpu className="h-7 w-7 text-indigo-500" />
              Detector — observability
            </h1>
            <p className="mt-1 text-gray-600 text-sm">
              Métriques Seora Detector v3.1 · analytics locales SQLite · sans texte brut
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Rafraîchir
          </button>
        </div>

        {/* KPIs (24h) */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            icon={Activity}
            label="Détections (24h)"
            value={w1.total_ok}
            sub={`7j : ${w7.total_ok} · 30j : ${w30.total_ok}`}
            color="bg-indigo-500"
          />
          <StatCard
            icon={BarChart3}
            label="Score moyen (24h)"
            value={w1.avg_score !== null ? `${w1.avg_score}/100` : "—"}
            sub={w7.avg_score !== null ? `7j : ${w7.avg_score}/100` : ""}
            color="bg-purple-500"
          />
          <StatCard
            icon={Clock}
            label="Latence p95 (24h)"
            value={w1.latency_ms.p95 !== null ? `${w1.latency_ms.p95} ms` : "—"}
            sub={
              w1.latency_ms.p99 !== null
                ? `p50 : ${w1.latency_ms.p50} · p99 : ${w1.latency_ms.p99} ms`
                : ""
            }
            color="bg-cyan-500"
          />
          <StatCard
            icon={AlertTriangle}
            label="Faible confiance"
            value={
              w1.low_confidence_rate_pct !== null
                ? `${w1.low_confidence_rate_pct}%`
                : "—"
            }
            sub={
              w1.avg_confidence !== null
                ? `conf. moy : ${w1.avg_confidence}`
                : ""
            }
            color="bg-amber-500"
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Histogram
            data={w1.score_histogram}
            color="#6366f1"
            title="Distribution des scores (24h)"
            ariaLabel="Score distribution 24h"
          />
          <Histogram
            data={w7.score_histogram}
            color="#8b5cf6"
            title="Distribution des scores (7j)"
            ariaLabel="Score distribution 7d"
          />
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Histogram
            data={w1.confidence_histogram}
            color="#f59e0b"
            title="Distribution des confidences (24h)"
            ariaLabel="Confidence distribution 24h"
          />
          <LanguageBar dist={w7.language_distribution} />
        </div>

        {/* Signals table */}
        <SignalTable signals={data.signals} />

        {/* HTTP status */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Codes HTTP (24h)
          </h3>
          <div className="flex flex-wrap gap-3 text-xs">
            {w1.http_status_distribution.map((s) => (
              <div
                key={s.status}
                className={`rounded-full px-3 py-1 ${
                  s.status < 400
                    ? "bg-green-100 text-green-700"
                    : s.status < 500
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {s.status} : {s.count}
              </div>
            ))}
            {w1.http_status_distribution.length === 0 && (
              <span className="text-gray-400">Aucune requête ces dernières 24h.</span>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
