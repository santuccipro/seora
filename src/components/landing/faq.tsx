"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Comment fonctionne l'analyse IA ?",
    answer: "Notre IA analyse votre CV selon 6 critères : structure, contenu, expériences, compétences, orthographe et impact. Elle utilise les mêmes standards que les recruteurs français pour vous donner un score objectif et des recommandations concrètes.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Absolument. Vos CVs sont chiffrés et stockés de manière sécurisée. Nous ne partageons jamais vos données avec des tiers. Vous pouvez supprimer vos données à tout moment depuis votre dashboard.",
  },
  {
    question: "C'est quoi un token ?",
    answer: "Un token est une unité d'utilisation. 1 token = 1 analyse de CV (score + points forts/faibles). Les corrections détaillées avec réécriture coûtent 2 tokens supplémentaires. Vous recevez 3 tokens gratuits à l'inscription.",
  },
  {
    question: "Est-ce que ça marche pour tous les secteurs ?",
    answer: "Oui ! Notre IA est entraînée sur les conventions du marché français dans tous les secteurs : tech, commerce, marketing, santé, finance, industrie, etc. Elle adapte ses recommandations à votre domaine.",
  },
  {
    question: "Quelle est la différence avec un conseiller en emploi ?",
    answer: "Seora CV vous donne un feedback instantané, disponible 24/7, à une fraction du prix d'un consultant. L'analyse est objective et basée sur des données, pas sur une opinion subjective. C'est un excellent complément à un accompagnement humain.",
  },
  {
    question: "Quels formats de CV sont acceptés ?",
    answer: "Nous acceptons les CVs au format PDF. C'est le format standard attendu par les recruteurs et les systèmes ATS. Si votre CV est au format Word, vous pouvez le convertir en PDF avant de l'uploader.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 bg-gray-50/50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Questions <span className="gradient-text">fréquentes</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl bg-white border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
