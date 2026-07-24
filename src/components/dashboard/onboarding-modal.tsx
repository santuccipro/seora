"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Briefcase, RefreshCw, Target } from "lucide-react";

const GOALS = [
  {
    key: "stage",
    icon: GraduationCap,
    label: "Trouver un stage",
    description: "Étudiant en cours d'études",
    route: "/cv-builder",
    color: "from-blue-500 to-indigo-500",
  },
  {
    key: "alternance",
    icon: RefreshCw,
    label: "Décrocher une alternance",
    description: "Formation en apprentissage",
    route: "/cv-builder",
    color: "from-purple-500 to-pink-500",
  },
  {
    key: "emploi",
    icon: Briefcase,
    label: "Trouver un emploi",
    description: "Jeune diplômé ou en reconversion",
    route: "/app",
    color: "from-green-500 to-teal-500",
  },
  {
    key: "humanize",
    icon: Target,
    label: "Humaniser mes textes",
    description: "Passer Turnitin / Compilatio",
    route: "/humanizer",
    color: "from-orange-500 to-red-500",
  },
] as const;

interface Props {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (goal: (typeof GOALS)[number]) => {
    localStorage.setItem("seora_onboarding_done", "1");
    onClose();
    router.push(goal.route);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900 text-center mb-1">
          Bienvenue sur Seora 🎉
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">
          Quel est ton objectif principal ?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map((goal) => {
            const Icon = goal.icon;
            return (
              <button
                key={goal.key}
                onClick={() => {
                  setSelected(goal.key);
                  handleSelect(goal);
                }}
                className={`rounded-xl p-4 text-left border-2 transition-all hover:scale-[1.02] ${
                  selected === goal.key
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-100 hover:border-indigo-200"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${goal.color} flex items-center justify-center mb-2`}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="font-semibold text-gray-900 text-sm">{goal.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{goal.description}</div>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => {
            localStorage.setItem("seora_onboarding_done", "1");
            onClose();
          }}
          className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Passer →
        </button>
      </div>
    </div>
  );
}
