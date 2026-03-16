"use client";

import {
  BarChart3,
  FileSearch,
  Zap,
  Shield,
  Target,
  PenTool,
  Building2,
  Gift,
  Share2,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Score radar sur 6 critères",
    description: "Score global /100 + radar détaillé : structure, contenu, expériences, compétences, orthographe, impact ATS.",
    badge: null,
  },
  {
    icon: FileSearch,
    title: "Analyse ATS avancée",
    description: "Vérification de la compatibilité avec les systèmes de recrutement automatisés utilisés par 90% des entreprises.",
    badge: null,
  },
  {
    icon: Zap,
    title: "Corrections IA instantanées",
    description: "Réécriture complète de votre CV avec avant/après pour chaque section, priorisée par importance.",
    badge: null,
  },
  {
    icon: Target,
    title: "Matching CV ↔ Offre",
    description: "Collez une offre d'emploi, l'IA adapte votre CV spécifiquement : mots-clés, reformulations, réorganisation.",
    badge: "NOUVEAU",
  },
  {
    icon: PenTool,
    title: "Lettre de motivation IA",
    description: "Générez une lettre personnalisée. L'IA scrape l'entreprise et crée une lettre qui parle de ses valeurs et projets.",
    badge: "NOUVEAU",
  },
  {
    icon: Building2,
    title: "Recherche entreprise",
    description: "L'IA analyse le site web de l'entreprise et utilise ses connaissances pour personnaliser votre candidature.",
    badge: "NOUVEAU",
  },
  {
    icon: Shield,
    title: "100% confidentiel",
    description: "Vos données sont chiffrées et jamais partagées. Votre CV reste privé, toujours. RGPD compliant.",
    badge: null,
  },
  {
    icon: Share2,
    title: "Partage de score",
    description: "Partagez votre score sur les réseaux sociaux. Comparez-vous à vos amis et challengez-les !",
    badge: null,
  },
  {
    icon: Gift,
    title: "Parrainage",
    description: "Invitez vos amis, gagnez 2 tokens gratuits par filleul. Eux aussi reçoivent 2 tokens offerts.",
    badge: null,
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            La boîte à outils{" "}
            <span className="gradient-text">ultime</span> pour votre candidature
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            9 fonctionnalités propulsées par l&apos;IA pour décrocher le job de vos rêves
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl bg-white p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-300"
            >
              {feature.badge && (
                <span className="absolute top-4 right-4 inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  {feature.badge}
                </span>
              )}
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                <feature.icon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
