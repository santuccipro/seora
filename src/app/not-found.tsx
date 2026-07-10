import Link from "next/link";
import { Bot, ArrowLeft, Sparkles } from "lucide-react";

// 10/07/26 (Orsu) — 404 aligné brand Seora orange + CTA humanizer.
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="text-center max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25 mb-5">
          <Bot className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-7xl font-black bg-gradient-to-br from-orange-500 to-amber-600 bg-clip-text text-transparent mb-2">
          404
        </h1>
        <h2 className="text-2xl font-black text-gray-900 mb-2">
          Cette page a disparu
        </h2>
        <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
          Elle a été déplacée, supprimée, ou n&apos;a jamais existé. Retour à la maison ou lance direct une analyse.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-orange-200 hover:border-orange-400 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
          <Link
            href="/humanizer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Analyser un doc
          </Link>
        </div>
      </div>
    </div>
  );
}
