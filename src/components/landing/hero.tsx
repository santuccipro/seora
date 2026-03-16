"use client";

import { signIn } from "next-auth/react";
import { ArrowRight, Sparkles, Star, CheckCircle2 } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-cyan-100/60 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 mb-8">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-700">
              Propulsé par l&apos;IA la plus avancée
            </span>
          </div>

          {/* Title */}
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Votre CV noté et{" "}
            <span className="gradient-text">corrigé par l&apos;IA</span>{" "}
            en 30 secondes
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
            Uploadez votre CV, obtenez un score sur 100, des recommandations
            personnalisées et un CV optimisé pour décrocher plus d&apos;entretiens.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={() => signIn()}
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-105"
            >
              Analyser mon CV gratuitement
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="text-sm text-gray-500">
              3 analyses offertes - Sans carte bancaire
            </p>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2 text-sm font-medium text-gray-700">4.9/5</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {["bg-indigo-500", "bg-cyan-500", "bg-purple-500", "bg-pink-500"].map((bg, i) => (
                  <div
                    key={i}
                    className={`h-8 w-8 rounded-full ${bg} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}
                  >
                    {["A", "M", "S", "L"][i]}
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-600">
                <strong>2 847</strong> CVs analysés ce mois
              </span>
            </div>
          </div>

          {/* Feature pills */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {[
              "Score détaillé /100",
              "Corrections IA",
              "Optimisé ATS",
              "100% français",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 shadow-sm border border-gray-100"
              >
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
