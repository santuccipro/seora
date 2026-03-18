"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import {
  FileText,
  Coins,
  Loader2,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";

interface FlaggedSection {
  text: string;
  issue: string;
  confidence: number;
  explanation: string;
  source_probable: string;
}

export default function PlagiarismPage() {
  const { data: session } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    originalityScore: number;
    flaggedSections: FlaggedSection[];
    summary: string;
    tips: string[];
  } | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (session) {
      fetch("/api/tokens").then(r => r.json()).then(d => setTokens(d.tokens)).catch(() => {});
    }
  }, [session]);

  const handleDetect = async () => {
    if (!session) { toast.error("Connectez-vous d'abord"); return; }
    if (!inputText || inputText.trim().length < 100) { toast.error("Le texte doit contenir au moins 100 caractères"); return; }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/plagiarism", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur"); return; }
      setResult(data);
      setTokens(prev => prev !== null ? prev - 1 : null);
      toast.success("Analyse terminée !");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 50) return "text-orange-500";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const getIssueLabel = (issue: string) => {
    const labels: Record<string, string> = {
      plagiat_probable: "Plagiat probable",
      formulation_commune: "Formulation commune",
      citation_non_sourcee: "Citation non sourcée",
      paraphrase_proche: "Paraphrase trop proche",
    };
    return labels[issue] || issue;
  };

  const getIssueColor = (issue: string) => {
    const colors: Record<string, string> = {
      plagiat_probable: "bg-red-100 text-red-700",
      formulation_commune: "bg-yellow-100 text-yellow-700",
      citation_non_sourcee: "bg-orange-100 text-orange-700",
      paraphrase_proche: "bg-purple-100 text-purple-700",
    };
    return colors[issue] || "bg-gray-100 text-gray-700";
  };

  const charCount = inputText.length;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-mesh">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="orb orb-purple animate-float-slow w-[500px] h-[500px] -top-40 -right-40 opacity-50" />
        <div className="orb orb-blue animate-float-medium w-[400px] h-[400px] bottom-0 -left-40 opacity-30" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-40" />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="sticky top-0 z-50">
          <div className="mx-auto max-w-5xl px-4 pt-3">
            <div className="flex h-14 items-center justify-between rounded-2xl glass-strong px-5">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-xl shadow-lg shadow-indigo-500/20">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-bold tracking-tight text-gray-900">Seora CV</span>
              </Link>
              <div className="flex items-center gap-3">
                {session && tokens !== null && (
                  <div className="flex items-center gap-1.5 rounded-full bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                    <Coins className="h-3 w-3" /> {tokens} tokens
                  </div>
                )}
                <Link href="/app" className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors">Dashboard</Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Header */}
        <section className="pt-12 pb-6 sm:pt-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full glass-strong px-4 py-1.5 text-xs font-semibold text-purple-700 mb-4 shadow-sm">
              <Search className="h-3.5 w-3.5" />
              Détecteur de plagiat
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Vérifiez <span className="brand-gradient-text">l&apos;originalité</span>
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto">
              Détectez le plagiat, les paraphrases trop proches et les citations non sourcées. 1 token par analyse.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              {/* Input — 3 cols */}
              <div className="lg:col-span-3 glass-card rounded-3xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-900">Texte à analyser</span>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span>{wordCount} mots</span>
                    <span>•</span>
                    <span>{charCount}/20000</span>
                  </div>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Collez ici votre texte (mémoire, rapport, dissertation, essai...)..."
                  maxLength={20000}
                  rows={18}
                  className="flex-1 w-full rounded-xl border border-gray-200/60 bg-white/40 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 resize-none outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 backdrop-blur-sm leading-relaxed"
                />
                <button
                  onClick={handleDetect}
                  disabled={loading || !inputText || charCount < 100 || !session}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-5 py-3 text-sm font-bold text-white disabled:opacity-40 shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours...</>
                  ) : (
                    <><Search className="h-4 w-4" /> Détecter le plagiat <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] ml-1">1 token</span></>
                  )}
                </button>
              </div>

              {/* Results — 2 cols */}
              <div className="lg:col-span-2 space-y-4">
                {result ? (
                  <>
                    {/* Score card */}
                    <div className="glass-card rounded-3xl p-6 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Score d&apos;originalité</p>
                      <p className={`text-5xl font-extrabold ${getScoreColor(result.originalityScore)}`}>
                        {result.originalityScore}%
                      </p>
                      <div className="mt-3 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getScoreBg(result.originalityScore)} transition-all duration-1000`}
                          style={{ width: `${result.originalityScore}%` }}
                        />
                      </div>
                      <p className="mt-3 text-xs text-gray-500 leading-relaxed">{result.summary}</p>
                    </div>

                    {/* Flagged sections */}
                    {result.flaggedSections.length > 0 && (
                      <div className="glass-card rounded-3xl p-5">
                        <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          {result.flaggedSections.length} passage{result.flaggedSections.length > 1 ? "s" : ""} signalé{result.flaggedSections.length > 1 ? "s" : ""}
                        </p>
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                          {result.flaggedSections.map((section, i) => (
                            <div key={i} className="rounded-xl bg-white/50 border border-gray-200/40 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${getIssueColor(section.issue)}`}>
                                  {getIssueLabel(section.issue)}
                                </span>
                                <span className="text-[10px] text-gray-400">{section.confidence}% confiance</span>
                              </div>
                              <p className="text-xs text-gray-700 italic mb-1.5">&ldquo;{section.text}&rdquo;</p>
                              <p className="text-[11px] text-gray-500">{section.explanation}</p>
                              <p className="text-[10px] text-gray-400 mt-1">Source probable : {section.source_probable}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.flaggedSections.length === 0 && (
                      <div className="glass-card rounded-3xl p-6 text-center">
                        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                        <p className="text-sm font-bold text-gray-900">Aucun plagiat détecté</p>
                        <p className="text-xs text-gray-500 mt-1">Votre texte semble original.</p>
                      </div>
                    )}

                    {/* Tips */}
                    <button
                      onClick={() => setShowTips(!showTips)}
                      className="flex w-full items-center justify-between glass-card rounded-2xl px-4 py-3 text-xs font-medium text-gray-600"
                    >
                      <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-indigo-500" /> Conseils pour améliorer l&apos;originalité</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTips ? "rotate-180" : ""}`} />
                    </button>
                    {showTips && (
                      <div className="glass-card rounded-2xl p-4 space-y-2">
                        {result.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-indigo-400" />
                            {tip}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="glass-card rounded-3xl p-10 text-center">
                    <Search className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-400">Les résultats apparaîtront ici</p>
                    <p className="text-xs text-gray-300 mt-1">Collez votre texte et lancez l&apos;analyse</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
