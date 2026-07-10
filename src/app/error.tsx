"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

// 10/07/26 (Orsu) — Error page aligné brand Seora orange + log digest.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Seora error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="text-center max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 mb-5">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto leading-relaxed">
          Un pépin inattendu s&apos;est produit. Réessaie ou reviens à l&apos;accueil — on s&apos;occupe de nettoyer.
        </p>
        {error.digest && (
          <p className="text-[10px] text-gray-400 font-mono mb-6">
            Code : {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 hover:border-orange-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}
