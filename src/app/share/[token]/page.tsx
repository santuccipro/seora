"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ScoreRing } from "@/components/charts/score-ring";
import { RadarChart } from "@/components/charts/radar-chart";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface ShareData {
  score: number;
  scoreBreakdown: Record<string, number> | null;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  userName: string;
  createdAt: string;
}

export default function SharePage() {
  const { token } = useParams();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Cette analyse n&apos;existe pas ou n&apos;est plus partagée.</p>
          <Link href="/" className="mt-4 inline-block text-indigo-600 font-medium hover:underline">
            Retour à Seora CV
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">CV <span className="gradient-text">Master</span></span>
          </Link>
          <Link
            href="/auth/signin"
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white"
          >
            Analyser mon CV
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Résultat de l&apos;analyse CV de <strong>{data.userName}</strong>
          </p>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
          <ScoreRing score={data.score} size={160} />
          {data.scoreBreakdown && (
            <RadarChart data={data.scoreBreakdown} />
          )}
        </div>

        {/* Summary */}
        <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Résumé</h3>
          <p className="text-gray-600 leading-relaxed">{data.summary}</p>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Points forts
            </h3>
            <ul className="space-y-2">
              {data.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Axes d&apos;amélioration
            </h3>
            <ul className="space-y-2">
              {data.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 p-8 text-center text-white shadow-lg">
          <h3 className="text-xl font-bold mb-2">Envie d&apos;analyser votre CV ?</h3>
          <p className="text-indigo-100 mb-4">3 analyses gratuites, sans carte bancaire</p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-indigo-600 hover:shadow-lg transition-all"
          >
            Commencer maintenant
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
