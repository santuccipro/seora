"use client";

import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 p-12 text-center shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2MmgxMnptLTItMjJhMiAyIDAgMCAxIDIgMnYxNmEyIDIgMCAwIDEtMiAySDI2YTIgMiAwIDAgMS0yLTJWMTBhMiAyIDAgMCAxIDItMmgxMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

          <div className="relative">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Prêt à booster votre CV ?
            </h2>
            <p className="mt-4 text-lg text-indigo-100">
              Rejoignez des milliers de candidats qui ont amélioré leur CV avec CV Master
            </p>
            <button
              onClick={() => signIn()}
              className="mt-8 group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-indigo-600 shadow-xl hover:shadow-2xl transition-all hover:scale-105"
            >
              Commencer maintenant
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="mt-4 text-sm text-indigo-200">
              3 analyses offertes - Inscription en 10 secondes
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
