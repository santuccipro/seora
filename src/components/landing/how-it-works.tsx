"use client";

import { Upload, Brain, CheckCircle, Download } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "1. Uploadez votre CV",
    description: "Glissez-déposez votre CV au format PDF. C'est rapide et sécurisé.",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    icon: Brain,
    title: "2. L'IA analyse tout",
    description: "Notre IA examine chaque section : expériences, compétences, mise en page, orthographe.",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: CheckCircle,
    title: "3. Recevez votre score",
    description: "Un score sur 100 avec des points forts, axes d'amélioration et recommandations.",
    color: "from-cyan-500 to-cyan-600",
  },
  {
    icon: Download,
    title: "4. CV optimisé",
    description: "Obtenez des corrections détaillées et un CV réécrit par l'IA, prêt à envoyer.",
    color: "from-green-500 to-green-600",
  },
];

export function HowItWorks() {
  return (
    <section id="fonctionnement" className="py-20 bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Comment ça <span className="gradient-text">marche ?</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            4 étapes simples pour un CV parfait
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.title}
              className="group relative rounded-2xl bg-white p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-300"
            >
              <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} shadow-lg`}>
                <step.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
