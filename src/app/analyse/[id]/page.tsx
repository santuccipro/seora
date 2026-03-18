"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard/layout";
import { ScoreRing } from "@/components/charts/score-ring";
import { RadarChart } from "@/components/charts/radar-chart";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  Share2,
  Target,
} from "lucide-react";
import Link from "next/link";

interface Correction {
  section: string;
  original: string;
  suggestion: string;
  reason: string;
  priority: "haute" | "moyenne" | "basse";
}

interface AnalysisData {
  id: string;
  fileName: string;
  score: number;
  scoreBreakdown: Record<string, number> | null;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  corrections: Correction[] | null;
  correctedCV: string | null;
  status: string;
  createdAt: string;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    haute: "bg-red-50 text-red-700 border-red-200",
    moyenne: "bg-yellow-50 text-yellow-700 border-yellow-200",
    basse: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[priority] || colors.moyenne}`}>
      {priority}
    </span>
  );
}

export default function AnalysisPage() {
  const { id } = useParams();
  const { status } = useSession();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [showCorrectedCV, setShowCorrectedCV] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/signin"); return; }
    if (status === "authenticated") fetchAnalysis();
  }, [status]);

  async function fetchAnalysis() {
    try {
      const res = await fetch(`/api/analyses/${id}`);
      if (!res.ok) { router.push("/app"); return; }
      setAnalysis(await res.json());
    } catch { toast.error("Erreur"); }
    finally { setLoading(false); }
  }

  async function handleGetCorrections() {
    setCorrectionsLoading(true);
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) router.push("/tokens");
        else toast.error(data.error);
        return;
      }
      setAnalysis((prev) => prev ? { ...prev, corrections: data.corrections, correctedCV: data.correctedCV, status: "corrected" } : null);
      toast.success("Corrections générées !");
    } catch { toast.error("Erreur"); }
    finally { setCorrectionsLoading(false); }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const res = await fetch(`/api/share/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setShareUrl(data.shareUrl);
        navigator.clipboard.writeText(data.shareUrl);
        toast.success("Lien de partage copié !");
      }
    } catch { toast.error("Erreur"); }
    finally { setSharing(false); }
  }

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div></DashboardLayout>;
  }

  if (!analysis) {
    return <DashboardLayout><p>Analyse introuvable</p></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app" className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{analysis.fileName}</h1>
              <p className="text-sm text-gray-500">
                {new Date(analysis.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Partager
            </button>
            <Link
              href={`/job-match`}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <Target className="h-4 w-4" />
              Matcher une offre
            </Link>
          </div>
        </div>

        {shareUrl && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center justify-between">
            <p className="text-sm text-green-700">Lien de partage : <span className="font-mono">{shareUrl}</span></p>
            <button
              onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copié !"); }}
              className="text-xs font-medium text-green-600 hover:underline"
            >
              Copier
            </button>
          </div>
        )}

        {/* Score + Radar + Summary */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
            <ScoreRing score={analysis.score} size={150} />
            {analysis.scoreBreakdown && (
              <RadarChart data={analysis.scoreBreakdown} size={240} />
            )}
          </div>
          <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Résumé de l&apos;analyse</h3>
            <p className="text-gray-600 leading-relaxed mb-6">{analysis.summary}</p>

            {analysis.scoreBreakdown && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Object.entries(analysis.scoreBreakdown).map(([key, val]) => {
                  const labels: Record<string, string> = {
                    structure: "Structure", contenu: "Contenu", experiences: "Expériences",
                    competences: "Compétences", orthographe: "Orthographe", impact: "Impact ATS",
                  };
                  let color = "text-red-600 bg-red-50";
                  if (val >= 70) color = "text-green-600 bg-green-50";
                  else if (val >= 50) color = "text-yellow-600 bg-yellow-50";
                  return (
                    <div key={key} className={`rounded-lg p-3 ${color}`}>
                      <p className="text-xs font-medium opacity-70">{labels[key] || key}</p>
                      <p className="text-lg font-bold">{val}/100</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> Points forts
            </h3>
            <ul className="space-y-3">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-500" /> Axes d&apos;amélioration
            </h3>
            <ul className="space-y-3">
              {analysis.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Corrections */}
        {!analysis.corrections ? (
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 border border-indigo-100 p-8 text-center">
            <Sparkles className="mx-auto h-12 w-12 text-indigo-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Débloquez les corrections détaillées</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Corrections précises section par section et un CV entièrement réécrit et optimisé.
            </p>
            <button
              onClick={handleGetCorrections}
              disabled={correctionsLoading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
            >
              {correctionsLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération...</> : <><Sparkles className="h-4 w-4" /> Obtenir les corrections (2 tokens)</>}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Corrections détaillées</h3>
            <div className="space-y-4">
              {analysis.corrections.map((c, i) => (
                <div key={i} className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">{c.section}</h4>
                    <PriorityBadge priority={c.priority} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-xs font-medium text-red-600 mb-2">Original</p>
                      <p className="text-sm text-red-800">{c.original}</p>
                    </div>
                    <div className="rounded-xl bg-green-50 p-4">
                      <p className="text-xs font-medium text-green-600 mb-2">Suggestion</p>
                      <p className="text-sm text-green-800">{c.suggestion}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-500 italic">{c.reason}</p>
                </div>
              ))}
            </div>

            {analysis.correctedCV && (
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                <button onClick={() => setShowCorrectedCV(!showCorrectedCV)} className="flex w-full items-center justify-between p-6 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <span className="text-lg font-semibold text-gray-900">CV corrigé complet</span>
                  </div>
                  {showCorrectedCV ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </button>
                {showCorrectedCV && (
                  <div className="border-t border-gray-100 p-6">
                    <div className="flex justify-end mb-3">
                      <button onClick={() => { navigator.clipboard.writeText(analysis.correctedCV!); toast.success("Copié !"); }}
                        className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200">
                        <Copy className="h-3.5 w-3.5" /> Copier
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans rounded-xl bg-gray-50 p-6">
                      {analysis.correctedCV}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
