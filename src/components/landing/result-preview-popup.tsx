"use client";

import {
  X,
  Lock,
  FileText,
  Sparkles,
  Bot,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

type PreviewType = "cv" | "letter" | "humanizer";

interface ResultPreviewPopupProps {
  isOpen: boolean;
  onClose: () => void;
  type: PreviewType;
  onUnlock: () => void;
}

const previewData: Record<
  PreviewType,
  { title: string; subtitle: string; icon: typeof FileText; mockContent: React.ReactNode }
> = {
  cv: {
    title: "Analyse terminée !",
    subtitle: "Votre CV a été analysé avec succès",
    icon: BarChart3,
    mockContent: (
      <div className="space-y-4">
        {/* Score ring mock */}
        <div className="flex justify-center">
          <div className="relative h-32 w-32">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                strokeDasharray="72, 100"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-indigo-600">
              72
            </span>
          </div>
        </div>
        {/* Radar bars mock */}
        <div className="space-y-2">
          {[
            { label: "Expérience", value: 85 },
            { label: "Formation", value: 70 },
            { label: "Compétences", value: 65 },
            { label: "Mise en page", value: 80 },
            { label: "Mots-clés ATS", value: 55 },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-medium text-gray-900">{item.value}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-indigo-400"
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  letter: {
    title: "Lettre générée !",
    subtitle: "Votre lettre de motivation est prête",
    icon: FileText,
    mockContent: (
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
        <p>Madame, Monsieur,</p>
        <p>
          Actuellement en recherche active d&apos;opportunités dans le domaine du
          marketing digital, je me permets de vous soumettre ma candidature pour
          le poste proposé au sein de votre entreprise...
        </p>
        <p>
          Fort de mon expérience de 3 ans en gestion de campagnes publicitaires
          et en analyse de données, j&apos;ai développé une expertise solide dans
          l&apos;optimisation des performances marketing...
        </p>
        <p>
          Je serais ravi de pouvoir échanger avec vous lors d&apos;un entretien
          afin de vous présenter plus en détail mon parcours...
        </p>
      </div>
    ),
  },
  humanizer: {
    title: "Texte humanisé !",
    subtitle: "Votre texte est désormais indétectable",
    icon: Bot,
    mockContent: (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Avant</p>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <span className="text-lg font-bold text-red-600">87%</span>
            </div>
            <p className="mt-1 text-[10px] text-red-500">IA détecté</p>
          </div>
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Après</p>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <span className="text-lg font-bold text-emerald-600">12%</span>
            </div>
            <p className="mt-1 text-[10px] text-emerald-500">Humain</p>
          </div>
        </div>
        <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 leading-relaxed">
          <p>
            Le texte reformulé conserve le sens original tout en adoptant un
            style d&apos;écriture plus naturel et personnel. Les structures de
            phrases ont été diversifiées pour éviter les patterns typiques de
            l&apos;IA...
          </p>
        </div>
      </div>
    ),
  },
};

export function ResultPreviewPopup({
  isOpen,
  onClose,
  type,
  onUnlock,
}: ResultPreviewPopupProps) {
  if (!isOpen) return null;

  const data = previewData[type];
  const Icon = data.icon;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-scale-in glass-strong rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-gray-400 hover:bg-gray-100/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 pb-0 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="mt-3 text-lg font-bold text-gray-900">{data.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{data.subtitle}</p>
        </div>

        {/* Preview content with blur */}
        <div className="relative px-6 py-4">
          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50 p-4 max-h-[250px]">
            <div className="filter blur-[6px] pointer-events-none select-none">
              {data.mockContent}
            </div>
            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 mb-3">
                <Lock className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Résultat complet verrouillé
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            onClick={onUnlock}
            className="flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity"
          >
            <Icon className="h-4 w-4" />
            Débloquer l&apos;analyse complète
          </button>
          <p className="mt-3 text-center text-[10px] text-gray-400">
            5 tokens offerts &bull; Sans carte bancaire
          </p>
        </div>
      </div>
    </div>
  );
}
