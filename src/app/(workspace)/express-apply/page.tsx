"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useAuthModal } from "@/components/auth/auth-context";
import { CV_SECTOR_LIST } from "@/lib/cv-criteria";
import type { CvSectorKey } from "@/lib/cv-criteria";
import { Zap, FileText, Mail, MessageSquare, Target, AlertTriangle, Copy, Check, ChevronDown } from "lucide-react";

type Step = "input" | "loading" | "result";

interface ExpressResult {
  adaptedSummary: string;
  keywordsToAdd: string[];
  coverLetter: string;
  interviewTips: Array<{ tip: string; why: string }>;
  matchScore: number;
  companyCulture: string;
  redFlags: string[];
}

const LOADING_STEPS = [
  "Lecture de l'offre...",
  "Extraction des mots-clés...",
  "Adaptation du résumé CV...",
  "Rédaction de la lettre...",
  "Préparation des tips entretien...",
];

export default function ExpressApplyPage() {
  const { status } = useSession();
  const { openAuthModal } = useAuthModal();
  const [step, setStep] = useState<Step>("input");
  const [jobOffer, setJobOffer] = useState("");
  const [sector, setSector] = useState<CvSectorKey>("tech-dev");
  const [userContext, setUserContext] = useState("");
  const [result, setResult] = useState<ExpressResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!jobOffer || jobOffer.length < 100) {
      setError("L'offre doit faire au moins 100 caractères.");
      return;
    }
    setError(null);
    setStep("loading");
    setLoadingStep(0);

    // Animate loading steps
    const interval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev >= LOADING_STEPS.length - 1) { clearInterval(interval); return prev; }
        return prev + 1;
      });
    }, 8000);

    try {
      const res = await fetch("/api/express-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobOffer, sector, userContext: userContext || undefined }),
      });
      clearInterval(interval);
      if (res.status === 403) {
        setError("Plus assez de tokens. Il en faut 3 pour la Candidature Express.");
        setStep("input");
        return;
      }
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json() as ExpressResult;
      setResult(data);
      setStep("result");
    } catch (e) {
      clearInterval(interval);
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setStep("input");
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const TABS = [
    { icon: FileText, label: "Résumé CV" },
    { icon: Mail, label: "Lettre" },
    { icon: MessageSquare, label: "Entretien" },
    { icon: Target, label: "Score" },
    { icon: AlertTriangle, label: "Analyse" },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Candidature Express</h1>
          </div>
          <p className="text-gray-500">Colle une offre → reçois ton résumé CV adapté + lettre + tips entretien en 60 secondes.</p>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 text-xs text-orange-600 font-medium">
            <Zap className="w-3 h-3" /> 3 tokens
          </div>
        </div>

        {/* Step: Input */}
        {step === "input" && (
          <div className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-700 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Offre d&apos;emploi <span className="text-red-400">*</span>
              </label>
              <textarea
                value={jobOffer}
                onChange={e => setJobOffer(e.target.value)}
                placeholder="Colle ici le texte complet de l'offre (depuis LinkedIn, Indeed, Welcome to the Jungle...)..."
                rows={8}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
              <div className="text-xs text-gray-400 mt-1 text-right">{jobOffer.length}/3000</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ton secteur</label>
              <div className="relative">
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value as CvSectorKey)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  {CV_SECTOR_LIST.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ton contexte <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                value={userContext}
                onChange={e => setUserContext(e.target.value)}
                placeholder="Ex: Étudiant en M1 Marketing à Paris, 1 stage de 6 mois en communication, maîtrise Canva, Notion, LinkedIn..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>

            <button
              onClick={() => { if (status !== "authenticated") { openAuthModal(() => handleSubmit()); return; } handleSubmit(); }}
              disabled={jobOffer.length < 100}
              className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
            >
              <Zap className="w-5 h-5" />
              Générer mon kit de candidature
            </button>
          </div>
        )}

        {/* Step: Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 space-y-8">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center animate-pulse">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-3 w-full max-w-sm">
              {LOADING_STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 transition-opacity ${i <= loadingStep ? "opacity-100" : "opacity-30"}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    i < loadingStep ? "border-green-500 bg-green-500" : i === loadingStep ? "border-orange-500 animate-spin" : "border-gray-200"
                  }`}>
                    {i < loadingStep && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm ${i === loadingStep ? "text-gray-900 font-medium" : "text-gray-400"}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && result && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
              {TABS.map((tab, i) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      activeTab === i ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab 0: Résumé CV */}
            {activeTab === 0 && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Résumé CV adapté à l&apos;offre</h3>
                    <button onClick={() => copyText(result.adaptedSummary, "summary")} className="text-gray-400 hover:text-gray-600 ml-2 shrink-0">
                      {copied === "summary" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{result.adaptedSummary}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Mots-clés à ajouter dans ton CV</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.keywordsToAdd.map((kw, i) => (
                      <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-3 py-1 text-xs font-medium">✓ {kw}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 1: Lettre */}
            {activeTab === 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Lettre de motivation</h3>
                  <button onClick={() => copyText(result.coverLetter, "letter")} className="text-gray-400 hover:text-gray-600 ml-2 shrink-0">
                    {copied === "letter" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{result.coverLetter}</p>
              </div>
            )}

            {/* Tab 2: Entretien */}
            {activeTab === 2 && (
              <div className="space-y-3">
                {result.interviewTips.map((tip, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex gap-3">
                      <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{tip.tip}</p>
                        <p className="text-gray-500 text-xs mt-1">{tip.why}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Score */}
            {activeTab === 3 && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
                  <div className={`text-5xl font-black mb-2 ${result.matchScore >= 70 ? "text-green-500" : result.matchScore >= 50 ? "text-orange-500" : "text-red-500"}`}>
                    {result.matchScore}<span className="text-2xl text-gray-300">/100</span>
                  </div>
                  <p className="text-gray-500 text-sm">Compatibilité profil × offre</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Culture d&apos;entreprise détectée</h3>
                  <p className="text-gray-600 text-sm">{result.companyCulture}</p>
                </div>
              </div>
            )}

            {/* Tab 4: Analyse */}
            {activeTab === 4 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Points d&apos;attention</h3>
                <ul className="space-y-2">
                  {result.redFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-orange-400 mt-0.5 shrink-0">⚠</span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setStep("input"); setResult(null); setActiveTab(0); }}
                className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                ← Nouvelle offre
              </button>
              <a href="/cv-builder" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium text-center">
                Créer mon CV →
              </a>
            </div>
          </div>
        )}
      </div>
  );
}
