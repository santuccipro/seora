"use client";

import { useState, useEffect } from "react";
import {
  X,
  Lock,
  FileText,
  Sparkles,
  Bot,
  BarChart3,
  CheckCircle2,
  Loader2,
  ArrowRight,
  TrendingUp,
  XCircle,
} from "lucide-react";

type PreviewType = "cv" | "letter" | "humanizer";

interface ResultPreviewPopupProps {
  isOpen: boolean;
  onClose: () => void;
  type: PreviewType;
  onUnlock: () => void;
}

function AnalyzingAnimation({ type, onDone }: { type: PreviewType; onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps: Record<PreviewType, string[]> = {
    cv: [
      "Extraction du contenu...",
      "Analyse de la mise en page...",
      "Détection des sections clés...",
      "Vérification de la structure...",
      "Analyse des mots-clés ATS...",
      "Comparaison avec les standards du marché...",
      "Évaluation de l'impact des expériences...",
      "Analyse des compétences techniques...",
      "Vérification orthographique...",
      "Calcul du score final...",
    ],
    letter: [
      "Analyse de l'offre d'emploi...",
      "Identification des mots-clés...",
      "Recherche sur l'entreprise...",
      "Structuration du contenu...",
      "Personnalisation du ton...",
      "Adaptation au secteur...",
      "Rédaction du corps...",
      "Optimisation de l'accroche...",
      "Vérification de la cohérence...",
      "Finalisation...",
    ],
    humanizer: [
      "Scan des patterns GPT détectés...",
      "Analyse de la perplexité du texte...",
      "Détection des structures SFT...",
      "Cartographie des répétitions syntaxiques...",
      "Reformulation phrase par phrase...",
      "Diversification du vocabulaire...",
      "Injection de variations naturelles...",
      "Randomisation des connecteurs...",
      "Test anti-détection GPTZero...",
      "Vérification finale...",
    ],
  };

  const currentSteps = steps[type];

  useEffect(() => {
    const totalDuration = 12000;
    const stepDuration = totalDuration / currentSteps.length;
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return p + 1;
      });
    }, totalDuration / 100);

    const stepInterval = setInterval(() => {
      setCurrentStep((s) => {
        if (s >= currentSteps.length - 1) {
          clearInterval(stepInterval);
          return s;
        }
        return s + 1;
      });
    }, stepDuration);

    const timer = setTimeout(onDone, totalDuration + 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearTimeout(timer);
    };
  }, [currentSteps.length, onDone]);

  const icons: Record<PreviewType, typeof BarChart3> = {
    cv: BarChart3,
    letter: FileText,
    humanizer: Bot,
  };
  const Icon = icons[type];
  const colors: Record<PreviewType, string> = {
    cv: "from-indigo-500 to-purple-600",
    letter: "from-blue-500 to-indigo-600",
    humanizer: "from-orange-500 to-amber-600",
  };

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[350px]">
      {/* Spinning icon */}
      <div className="relative mb-6">
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${colors[type]} flex items-center justify-center shadow-lg`}>
          <Icon className="h-9 w-9 text-white" />
        </div>
        <div className="absolute -inset-3 rounded-3xl border-2 border-indigo-300/40 animate-spin" style={{ borderStyle: "dashed", animationDuration: "3s" }} />
      </div>

      {/* Current step */}
      <div className="flex items-center gap-2 mb-4">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
        <p className="text-sm font-semibold text-gray-700">{currentSteps[currentStep]}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">{progress}%</p>
      </div>

      {/* Completed steps */}
      <div className="mt-5 w-full max-w-xs space-y-2">
        {currentSteps.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-2 transition-all duration-300 ${
              i <= currentStep ? "opacity-100" : "opacity-0"
            }`}
          >
            {i < currentStep ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : i === currentStep ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500 shrink-0" />
            ) : (
              <div className="h-3.5 w-3.5 rounded-full border border-gray-300 shrink-0" />
            )}
            <span className={`text-[11px] ${i < currentStep ? "text-emerald-600" : i === currentStep ? "text-indigo-600 font-medium" : "text-gray-400"}`}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultPreviewPopup({
  isOpen,
  onClose,
  type,
  onUnlock,
}: ResultPreviewPopupProps) {
  const [phase, setPhase] = useState<"analyzing" | "result">("analyzing");

  // Reset phase when popup opens
  useEffect(() => {
    if (isOpen) {
      setPhase("analyzing");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-scale-in glass-strong rounded-3xl shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-gray-400 hover:bg-gray-100/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {phase === "analyzing" ? (
          <AnalyzingAnimation type={type} onDone={() => setPhase("result")} />
        ) : (
          <>
            {/* ── CV Result ── */}
            {type === "cv" && (
              <div className="p-6">
                <div className="text-center mb-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900">Ton CV a des problèmes.</h3>
                  <p className="mt-1 text-sm text-gray-500">Il ne passera probablement pas les filtres ATS</p>
                </div>

                {/* Score — VISIBLE, not blurred */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <svg className="h-28 w-28 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EF4444" strokeWidth="3" strokeDasharray="34, 100" />
                    </svg>
                    <span className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-red-500">34</span>
                      <span className="text-[10px] text-gray-400">/100</span>
                    </span>
                  </div>
                </div>

                {/* Bars — VISIBLE */}
                <div className="space-y-2 mb-4">
                  {[
                    { label: "Structure", value: 30, color: "bg-red-400" },
                    { label: "Expérience", value: 45, color: "bg-orange-400" },
                    { label: "Compétences", value: 25, color: "bg-red-500" },
                    { label: "Mots-clés ATS", value: 20, color: "bg-red-500" },
                    { label: "Impact", value: 35, color: "bg-orange-400" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-bold text-red-500">{item.value}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100">
                        <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Locked corrections preview */}
                <div className="relative rounded-xl border border-gray-200 bg-gray-50/50 p-3 mb-4">
                  <div className="filter blur-[5px] pointer-events-none select-none space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs text-gray-600">Ajouter des mots-clés ATS ciblés</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs text-gray-600">Restructurer la section expérience</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs text-gray-600">Quantifier les résultats obtenus</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                      <Lock className="h-3.5 w-3.5" />
                      Corrections détaillées + CV réécrit
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={onUnlock}
                  className="flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity"
                >
                  <TrendingUp className="h-4 w-4" />
                  Voir les corrections et passer à 90+
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="mt-2 text-center text-[10px] text-gray-400">
                  Seora corrige et réécrit ton CV automatiquement
                </p>
              </div>
            )}

            {/* ── Letter Result ── */}
            {type === "letter" && (
              <div className="p-6">
                <div className="text-center mb-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900">Ta lettre est prête !</h3>
                  <p className="mt-1 text-sm text-gray-500">Personnalisée pour l&apos;entreprise visée</p>
                </div>

                {/* Letter preview — first lines visible, rest blurred */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4 space-y-2">
                  <p className="text-sm text-gray-700">Madame, Monsieur,</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Passionné(e) par votre secteur d&apos;activité, je me permets de vous soumettre ma candidature...
                  </p>
                  <div className="relative">
                    <div className="filter blur-[5px] pointer-events-none select-none space-y-2">
                      <p className="text-sm text-gray-600">Mon expérience en stratégie digitale m&apos;a permis de développer...</p>
                      <p className="text-sm text-gray-600">Je serais ravi(e) d&apos;échanger avec vous lors d&apos;un entretien...</p>
                      <p className="text-sm text-gray-600">Cordialement,</p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <Lock className="h-3.5 w-3.5" />
                        Lettre complète verrouillée
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onUnlock}
                  className="flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="h-4 w-4" />
                  Débloquer ma lettre complète
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="mt-2 text-center text-[10px] text-gray-400">
                  Prête à copier-coller et envoyer
                </p>
              </div>
            )}

            {/* ── Humanizer Result ── */}
            {type === "humanizer" && (
              <div className="p-6">
                <div className="text-center mb-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900">Texte humanisé !</h3>
                  <p className="mt-1 text-sm text-gray-500">Ton texte est maintenant indétectable</p>
                </div>

                {/* Before/After score — VISIBLE */}
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Avant</p>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border-2 border-red-200">
                      <span className="text-lg font-extrabold text-red-600">87%</span>
                    </div>
                    <p className="mt-1 text-[10px] text-red-500">IA détecté</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                    <ArrowRight className="h-4 w-4 text-gray-300 mt-1" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Après</p>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-200">
                      <span className="text-lg font-extrabold text-emerald-600">4%</span>
                    </div>
                    <p className="mt-1 text-[10px] text-emerald-500">Humain</p>
                  </div>
                </div>

                {/* Blurred text */}
                <div className="relative rounded-xl border border-gray-200 bg-gray-50/50 p-3 mb-4">
                  <div className="filter blur-[5px] pointer-events-none select-none">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Le texte reformulé conserve le sens original tout en adoptant un style plus naturel et personnel...
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                      <Lock className="h-3.5 w-3.5" />
                      Texte complet verrouillé
                    </div>
                  </div>
                </div>

                <button
                  onClick={onUnlock}
                  className="flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity"
                >
                  <Bot className="h-4 w-4" />
                  Récupérer mon texte humanisé
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="mt-2 text-center text-[10px] text-gray-400">
                  Indétectable par GPTZero, Turnitin et Compilatio
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
