"use client";

import { signIn } from "next-auth/react";
import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Gratuit",
    price: "0 €",
    description: "Pour découvrir CV Master",
    tokens: "3 tokens offerts",
    features: [
      "1 analyse complète de CV",
      "Score sur 100",
      "Points forts et faibles",
      "Résumé de l'analyse",
    ],
    cta: "Commencer gratuitement",
    popular: false,
    gradient: false,
  },
  {
    name: "Starter",
    price: "4,99 €",
    description: "Pour optimiser votre CV",
    tokens: "5 tokens",
    features: [
      "Tout du gratuit",
      "5 analyses complètes",
      "Corrections détaillées par IA",
      "CV réécrit et optimisé",
      "Conseils ATS personnalisés",
    ],
    cta: "Acheter 5 tokens",
    popular: false,
    gradient: false,
  },
  {
    name: "Pro",
    price: "9,99 €",
    description: "Le plus populaire",
    tokens: "15 tokens",
    features: [
      "Tout du Starter",
      "15 analyses complètes",
      "Corrections illimitées",
      "Optimisation multi-versions",
      "Support prioritaire",
    ],
    cta: "Acheter 15 tokens",
    popular: true,
    gradient: true,
  },
  {
    name: "Expert",
    price: "24,99 €",
    description: "Pour les pros de la recherche",
    tokens: "50 tokens",
    features: [
      "Tout du Pro",
      "50 analyses complètes",
      "Parfait pour plusieurs CVs",
      "Idéal reconversion pro",
      "Support dédié",
    ],
    cta: "Acheter 50 tokens",
    popular: false,
    gradient: false,
  },
];

export function Pricing() {
  return (
    <section id="tarifs" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Des prix <span className="gradient-text">transparents</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Payez uniquement ce que vous utilisez, pas d&apos;abonnement
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all duration-300 hover:scale-105 ${
                plan.popular
                  ? "bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-xl shadow-indigo-500/25"
                  : "bg-white border border-gray-200 shadow-sm hover:shadow-lg"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                    <Sparkles className="h-3 w-3" />
                    POPULAIRE
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-lg font-bold ${plan.popular ? "text-white" : "text-gray-900"}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mt-1 ${plan.popular ? "text-indigo-100" : "text-gray-500"}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className={`text-4xl font-extrabold ${plan.popular ? "text-white" : "text-gray-900"}`}>
                  {plan.price}
                </span>
                <span className={`text-sm ml-1 ${plan.popular ? "text-indigo-100" : "text-gray-500"}`}>
                  / {plan.tokens}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.popular ? "text-indigo-200" : "text-green-500"}`} />
                    <span className={`text-sm ${plan.popular ? "text-indigo-50" : "text-gray-600"}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => signIn()}
                className={`w-full rounded-full py-3 text-sm font-semibold transition-all ${
                  plan.popular
                    ? "bg-white text-indigo-600 hover:bg-indigo-50"
                    : "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:shadow-lg"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          1 token = 1 analyse de CV | Les corrections détaillées coûtent 2 tokens
        </p>
      </div>
    </section>
  );
}
