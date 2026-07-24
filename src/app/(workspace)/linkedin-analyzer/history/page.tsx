"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Linkedin, Clock, TrendingUp, ChevronRight } from "lucide-react";

interface AnalysisSummary {
  id: string;
  targetSector: string;
  targetRole: string;
  targetLevel: string;
  globalScore: number;
  verdict: string;
  rewrittenTitle: string;
  createdAt: string;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-100 text-green-700" : score >= 50 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700";
  return <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${color}`}>{score}/100</span>;
}

export default function LinkedInAnalyzerHistoryPage() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/linkedin-analyzer/history")
      .then(r => r.json())
      .then(data => { setAnalyses(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/linkedin-analyzer" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Linkedin className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Historique LinkedIn</h1>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-16">
          <Linkedin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Aucune analyse LinkedIn pour l&apos;instant.</p>
          <Link href="/linkedin-analyzer" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
            Analyser mon profil →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <ScoreBadge score={a.globalScore} />
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(a.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm truncate">{a.targetRole}</p>
                  <p className="text-xs text-gray-400">{a.targetSector} · {a.targetLevel}</p>
                  {a.rewrittenTitle && (
                    <p className="text-xs text-indigo-600 mt-1 truncate flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 shrink-0" />
                      Titre suggéré : {a.rewrittenTitle}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
