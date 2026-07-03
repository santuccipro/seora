"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  Download,
  Trash2,
  Share2,
  Loader2,
  FileText,
  Filter,
  TrendingDown,
  BarChart3,
  Plus,
} from "lucide-react";

type Item = {
  id: string;
  fileName: string;
  fileType: string;
  aiScoreBefore: number | null;
  aiScoreAfter: number | null;
  passesCount: number | null;
  wordCount: number | null;
  status: string;
  shareToken: string | null;
  createdAt: string;
};

type Stats = {
  total: number;
  done: number;
  avgScoreBefore: number;
  avgScoreAfter: number;
  avgWordCount: number;
  avgGain: number;
};

export default function HumanizerHistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filterMaxScore, setFilterMaxScore] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/humanizer/history");
    }
  }, [status, router]);

  const load = useCallback(async (cursor: string | null = null, reset = true) => {
    if (reset) setLoading(true);
    try {
      const url = new URL("/api/humanize/history", window.location.origin);
      if (cursor) url.searchParams.set("cursor", cursor);
      if (filterMaxScore !== null) url.searchParams.set("maxScore", String(filterMaxScore));
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur chargement");
      const data = await res.json();
      if (reset) {
        setItems(data.items);
      } else {
        setItems((prev) => [...prev, ...data.items]);
      }
      setStats(data.stats);
      setNextCursor(data.nextCursor);
    } catch {
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  }, [filterMaxScore]);

  useEffect(() => {
    if (status === "authenticated") load(null, true);
  }, [status, load]);

  const deleteItem = async (id: string) => {
    if (!confirm("Supprimer cette analyse ?")) return;
    try {
      const res = await fetch(`/api/humanize?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((it) => it.id !== id));
      toast.success("Analyse supprimée");
    } catch {
      toast.error("Erreur suppression");
    }
  };

  const download = async (id: string, fileName: string, format: "docx" | "pdf" | "txt") => {
    try {
      const res = await fetch(`/api/humanize/${id}/export?format=${format}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName.replace(/\.[^.]+$/, "")}-humanise.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur téléchargement");
    }
  };

  const share = async (id: string) => {
    try {
      const res = await fetch(`/api/humanize/${id}/share`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const url = `${window.location.origin}/share/humanizer/${data.shareToken}`;
      await navigator.clipboard.writeText(url);
      toast.success("Lien de partage copié");
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, shareToken: data.shareToken } : it))
      );
    } catch {
      toast.error("Erreur");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/humanizer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'humanizer
          </Link>
          <Link
            href="/humanizer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 rounded-full px-4 py-2 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Nouvelle analyse
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Historique des humanisations
          </h1>
          <p className="text-gray-600">
            Retrouve, télécharge et partage tes analyses passées.
          </p>
        </div>

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                Documents
              </p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">{stats.total}</p>
              <p className="text-[10px] text-gray-400">{stats.done} traités</p>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                Mots traités
              </p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">
                {(stats.avgWordCount * stats.done).toLocaleString("fr-FR")}
              </p>
              <p className="text-[10px] text-gray-400">moyenne {stats.avgWordCount}/doc</p>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold flex items-center justify-center gap-1">
                <BarChart3 className="h-3 w-3" /> Score moyen après
              </p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                {stats.avgScoreAfter}%
              </p>
              <p className="text-[10px] text-gray-400">avant : {stats.avgScoreBefore}%</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest opacity-80 font-semibold flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3" /> Gain moyen
              </p>
              <p className="text-2xl font-extrabold mt-1">-{stats.avgGain}%</p>
              <p className="text-[10px] opacity-80">par analyse</p>
            </div>
          </div>
        )}

        {/* Filter */}
        {items.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
              Filtrer :
            </span>
            <button
              onClick={() => setFilterMaxScore(null)}
              className={`text-xs px-3 py-1 rounded-full transition-all ${
                filterMaxScore === null
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterMaxScore(15)}
              className={`text-xs px-3 py-1 rounded-full transition-all ${
                filterMaxScore === 15
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              &le; 15% IA
            </button>
            <button
              onClick={() => setFilterMaxScore(30)}
              className={`text-xs px-3 py-1 rounded-full transition-all ${
                filterMaxScore === 30
                  ? "bg-amber-500 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              &le; 30% IA
            </button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-12 text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-orange-100 mb-4">
              <Bot className="h-7 w-7 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune analyse pour le moment</h3>
            <p className="text-sm text-gray-500 mb-6">
              Lance ta première humanisation pour voir ton historique apparaître ici.
            </p>
            <Link
              href="/humanizer"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white px-6 py-3 text-sm font-bold shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-4 w-4" />
              Nouvelle analyse
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const scoreAfterGood = (item.aiScoreAfter ?? 100) <= 15;
              return (
                <div key={item.id} className="rounded-2xl bg-white shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-orange-200 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/humanizer?id=${item.id}`}
                        className="text-sm font-bold text-gray-900 hover:text-orange-600 transition-colors truncate block"
                      >
                        {item.fileName}
                      </Link>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                        <span>{new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span>·</span>
                        <span>{item.wordCount ?? 0} mots</span>
                        <span>·</span>
                        <span>{item.passesCount ?? 0} passes</span>
                        <span>·</span>
                        <span className="uppercase text-gray-400">{item.fileType}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`text-lg font-extrabold ${scoreAfterGood ? "text-emerald-600" : (item.aiScoreAfter ?? 100) >= 40 ? "text-red-500" : "text-amber-500"}`}>
                          {item.aiScoreAfter ?? "-"}%
                        </p>
                        <p className="text-[10px] text-gray-400">
                          avant : {item.aiScoreBefore ?? "-"}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => download(item.id, item.fileName, "docx")}
                      className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      DOCX
                    </button>
                    <button
                      onClick={() => download(item.id, item.fileName, "pdf")}
                      className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </button>
                    <button
                      onClick={() => download(item.id, item.fileName, "txt")}
                      className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      TXT
                    </button>
                    <button
                      onClick={() => share(item.id)}
                      className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Share2 className="h-3 w-3" />
                      {item.shareToken ? "Partagé" : "Partager"}
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="ml-auto text-[11px] font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}

            {nextCursor && (
              <button
                onClick={() => load(nextCursor, false)}
                className="w-full py-3 rounded-2xl bg-white border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-all"
              >
                Charger plus
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
