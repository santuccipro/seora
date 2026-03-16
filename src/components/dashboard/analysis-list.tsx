"use client";

import Link from "next/link";
import { FileText, ArrowRight, Clock } from "lucide-react";

interface Analysis {
  id: string;
  fileName: string;
  score: number | null;
  status: string;
  createdAt: string;
}

function ScoreBadge({ score }: { score: number }) {
  let color = "text-red-600 bg-red-50";
  if (score >= 70) color = "text-green-600 bg-green-50";
  else if (score >= 50) color = "text-yellow-600 bg-yellow-50";
  else if (score >= 30) color = "text-orange-600 bg-orange-50";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${color}`}>
      {score}/100
    </span>
  );
}

export function AnalysisList({ analyses }: { analyses: Analysis[] }) {
  if (analyses.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center shadow-sm">
        <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Aucune analyse</h3>
        <p className="mt-1 text-sm text-gray-500">
          Uploadez votre premier CV pour commencer
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Vos analyses</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {analyses.map((analysis) => (
          <Link
            key={analysis.id}
            href={`/analyse/${analysis.id}`}
            className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{analysis.fileName}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                  <Clock className="h-3 w-3" />
                  {new Date(analysis.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {analysis.score !== null && <ScoreBadge score={analysis.score} />}
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
