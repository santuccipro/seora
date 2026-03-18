"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  BarChart3,
  Clock,
  Type,
  AlignLeft,
  Hash,
  Sparkles,
  ArrowRight,
  Shield,
} from "lucide-react";
import { useAuthModal } from "@/components/auth/auth-context";

export default function CompteurMots() {
  const [text, setText] = useState("");
  const { openAuthModal } = useAuthModal();

  const stats = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed)
      return {
        words: 0,
        characters: 0,
        charactersNoSpaces: 0,
        sentences: 0,
        paragraphs: 0,
        readingTime: "0m 0s",
        aiScore: 0,
      };

    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, "").length;
    const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim()).length;
    const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length || 1;

    const minutes = Math.floor(words / 200);
    const seconds = Math.round((words % 200) / (200 / 60));
    const readingTime = `${minutes}m ${seconds}s`;

    // Simple AI heuristic based on text patterns
    const avgWordLength =
      charactersNoSpaces / Math.max(words, 1);
    const avgSentenceLength = words / Math.max(sentences, 1);
    const uniqueWords = new Set(trimmed.toLowerCase().split(/\s+/)).size;
    const diversity = uniqueWords / Math.max(words, 1);

    let aiScore = 0;
    if (avgSentenceLength > 20) aiScore += 25;
    else if (avgSentenceLength > 15) aiScore += 15;
    if (avgWordLength > 6) aiScore += 20;
    else if (avgWordLength > 5) aiScore += 10;
    if (diversity < 0.5) aiScore += 25;
    else if (diversity < 0.65) aiScore += 15;
    if (words > 50 && sentences > 3) aiScore += 10;
    aiScore = Math.min(100, Math.max(0, aiScore));

    return {
      words,
      characters,
      charactersNoSpaces,
      sentences,
      paragraphs,
      readingTime,
      aiScore,
    };
  }, [text]);

  const aiLevel =
    stats.aiScore < 30 ? "LOW" : stats.aiScore < 60 ? "MEDIUM" : "HIGH";
  const aiColor =
    stats.aiScore < 30
      ? "text-emerald-600"
      : stats.aiScore < 60
        ? "text-amber-600"
        : "text-red-600";
  const aiBg =
    stats.aiScore < 30
      ? "bg-emerald-50"
      : stats.aiScore < 60
        ? "bg-amber-50"
        : "bg-red-50";

  const socialLimits = [
    { name: "Twitter / X", limit: 280, icon: "𝕏" },
    { name: "LinkedIn", limit: 2000, icon: "in" },
    { name: "Instagram", limit: 150, icon: "📷" },
    { name: "Facebook", limit: 250, icon: "f" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-100/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500">
              <span className="text-sm font-black text-white">S</span>
            </div>
            <span className="text-sm font-bold text-gray-900">
              Seora{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                CV
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <Shield className="h-3 w-3" /> Outil gratuit
            </span>
            <button
              onClick={() => openAuthModal()}
              className="rounded-xl brand-gradient px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25"
            >
              Analyser mon CV
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
            Compteur de mots
          </span>{" "}
          en ligne gratuit
        </h1>
        <p className="mt-3 text-sm text-gray-500 max-w-xl mx-auto">
          Comptez les mots, caractères et phrases de votre CV en temps réel.
          Vérifiez la probabilité de détection IA et respectez les limites des
          réseaux sociaux.
        </p>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: textarea */}
          <div className="rounded-2xl border border-gray-200/60 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Votre texte
              </h2>
              {text && (
                <button
                  onClick={() => setText("")}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Effacer
                </button>
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Collez votre CV ou texte ici..."
              className="w-full resize-none bg-transparent px-5 py-4 text-sm text-gray-700 outline-none placeholder:text-gray-300 min-h-[400px]"
            />
          </div>

          {/* Right: results */}
          <div className="space-y-4">
            {/* AI Detection gauge */}
            <div
              className={`rounded-2xl border border-gray-200/60 ${aiBg} p-5`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className={`h-5 w-5 ${aiColor}`} />
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Probabilité de détection IA
                    </p>
                    <p className={`text-lg font-bold ${aiColor}`}>
                      {aiLevel}
                    </p>
                  </div>
                </div>
                <div className="relative h-16 w-16">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={
                        stats.aiScore < 30
                          ? "#10b981"
                          : stats.aiScore < 60
                            ? "#f59e0b"
                            : "#ef4444"
                      }
                      strokeWidth="3"
                      strokeDasharray={`${stats.aiScore}, 100`}
                    />
                  </svg>
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${aiColor}`}
                  >
                    {stats.aiScore}%
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {stats.aiScore < 30
                  ? "Faible probabilité de détection par l'IA. Votre texte semble naturel."
                  : stats.aiScore < 60
                    ? "Probabilité modérée. Vérification recommandée avant soumission."
                    : "Forte probabilité de détection IA. Humanisation recommandée."}
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: Type,
                  label: "Mots",
                  value: stats.words,
                  color: "text-indigo-600 bg-indigo-50",
                },
                {
                  icon: Clock,
                  label: "Temps de lecture",
                  value: stats.readingTime,
                  color: "text-cyan-600 bg-cyan-50",
                },
                {
                  icon: AlignLeft,
                  label: "Phrases",
                  value: stats.sentences,
                  color: "text-violet-600 bg-violet-50",
                },
                {
                  icon: Hash,
                  label: "Caractères",
                  value: stats.characters,
                  color: "text-amber-600 bg-amber-50",
                },
                {
                  icon: FileText,
                  label: "Paragraphes",
                  value: stats.paragraphs,
                  color: "text-emerald-600 bg-emerald-50",
                },
                {
                  icon: Hash,
                  label: "Sans espaces",
                  value: stats.charactersNoSpaces,
                  color: "text-rose-600 bg-rose-50",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 rounded-xl border border-gray-200/60 bg-white p-3"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.color}`}
                  >
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-sm font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Social media limits */}
            <div className="rounded-2xl border border-gray-200/60 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Limites réseaux sociaux
              </h3>
              <div className="space-y-3">
                {socialLimits.map((social) => {
                  const pct = Math.min(
                    100,
                    (stats.characters / social.limit) * 100
                  );
                  const over = stats.characters > social.limit;
                  return (
                    <div key={social.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">
                          {social.icon} {social.name}
                        </span>
                        <span
                          className={
                            over
                              ? "text-red-500 font-medium"
                              : "text-gray-400"
                          }
                        >
                          {stats.characters}/{social.limit}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-1.5 rounded-full transition-all ${over ? "bg-red-400" : "bg-indigo-400"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-10 rounded-2xl brand-gradient p-8 text-center">
          <h3 className="text-xl font-bold text-white">
            Perfectionnez votre texte en quelques secondes
          </h3>
          <p className="mt-2 text-sm text-white/80">
            Analysez votre CV, humanisez vos textes IA ou générez une lettre de
            motivation.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() =>
                openAuthModal(() => {
                  window.location.href = "/app";
                })
              }
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-lg hover:bg-gray-50 transition-colors"
            >
              <Sparkles className="h-4 w-4" /> Analyser mon CV
            </button>
            <button
              onClick={() =>
                openAuthModal(() => {
                  window.location.href = "/humanize";
                })
              }
              className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              Humaniser un texte <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
