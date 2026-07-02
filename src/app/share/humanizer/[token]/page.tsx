"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Bot, Sparkles, CheckCircle2, Loader2, ArrowRight, TrendingDown } from "lucide-react";

type SharedData = {
  fileName: string;
  aiScoreBefore: number;
  aiScoreAfter: number;
  wordCount: number;
  passesCount: number;
  scoreDetails: { after: Record<string, number> } | null;
  createdAt: string;
  originalPreview: string;
  humanizedPreview: string;
};

export default function SharedHumanizerPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/humanize/share/${params.token}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Non trouvé");
        }
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Bot className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analyse introuvable</h1>
          <p className="text-sm text-gray-500 mb-6">
            {error ?? "Le lien de partage est invalide ou a été révoqué."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white px-6 py-3 text-sm font-bold shadow-lg"
          >
            Découvrir Seora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25 mb-4">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">
            Preuve d'humanisation
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2 truncate">
            {data.fileName}
          </h1>
          <p className="text-sm text-gray-500">
            {data.wordCount} mots · {data.passesCount} passes · {new Date(data.createdAt).toLocaleDateString("fr-FR")}
          </p>
        </div>

        {/* Big result */}
        <div className="rounded-3xl bg-white shadow-2xl border border-orange-100 p-6 sm:p-10 mb-6">
          <div className="grid grid-cols-2 items-center gap-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                Score IA avant
              </p>
              <p className="text-5xl sm:text-6xl font-extrabold text-red-500">
                {data.aiScoreBefore}%
              </p>
              <p className="text-xs text-gray-500 mt-2">Détection IA élevée</p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                Score IA après
              </p>
              <p className={`text-5xl sm:text-6xl font-extrabold ${
                data.aiScoreAfter <= 15 ? "text-emerald-600" : "text-amber-500"
              }`}>
                {data.aiScoreAfter}%
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {data.aiScoreAfter <= 15 ? "✓ Passe les détecteurs" : "Zone à risque"}
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 text-orange-800 px-4 py-2 text-sm font-bold">
              <TrendingDown className="h-4 w-4" />
              Baisse de {data.aiScoreBefore - data.aiScoreAfter} points
            </div>
          </div>
        </div>

        {/* Text preview side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl bg-white shadow-sm border border-red-100 p-5">
            <p className="text-[10px] uppercase tracking-widest text-red-600 font-bold mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Version originale (aperçu)
            </p>
            <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
              {data.originalPreview}
              {data.originalPreview.length >= 800 && "..."}
            </p>
          </div>
          <div className="rounded-2xl bg-white shadow-sm border border-emerald-100 p-5">
            <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Version humanisée (aperçu)
            </p>
            <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
              {data.humanizedPreview}
              {data.humanizedPreview.length >= 800 && "..."}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 text-white p-8 shadow-xl">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-white/15 mb-4">
            <Bot className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">Humanise ton propre mémoire</h2>
          <p className="text-sm opacity-90 mb-5 max-w-md mx-auto">
            Score IA sous 15% garanti · 3 tokens par doc · Résultat en 40s
          </p>
          <Link
            href="/humanizer"
            className="inline-flex items-center gap-2 rounded-2xl bg-white text-orange-600 px-6 py-3 text-sm font-bold shadow-lg hover:shadow-xl transition-all"
          >
            Essayer maintenant
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-[11px] opacity-70 mt-3">
            Généré par Seora · {new Date(data.createdAt).getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
