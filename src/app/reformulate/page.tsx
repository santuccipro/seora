"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import {
  FileText,
  Coins,
  Loader2,
  Sparkles,
  Copy,
  Check,
  ArrowLeftRight,
  RotateCcw,
  RefreshCw,
} from "lucide-react";

export default function ReformulatePage() {
  const { data: session } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [style, setStyle] = useState<"academique" | "simplifie" | "professionnel" | "soutenu">("academique");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reformulatedText: string; changes: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (session) {
      fetch("/api/tokens").then(r => r.json()).then(d => setTokens(d.tokens)).catch(() => {});
    }
  }, [session]);

  const handleReformulate = async () => {
    if (!session) { toast.error("Connectez-vous d'abord"); return; }
    if (!inputText || inputText.trim().length < 50) { toast.error("Minimum 50 caractères"); return; }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/reformulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, style }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur"); return; }
      setResult(data);
      setTokens(prev => prev !== null ? prev - 1 : null);
      toast.success("Texte reformulé !");
    } catch { toast.error("Erreur réseau"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-mesh">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="orb orb-cyan animate-float-slow w-[400px] h-[400px] -top-20 -left-40 opacity-50" />
        <div className="orb orb-indigo animate-float-medium w-[500px] h-[500px] bottom-0 -right-40 opacity-30" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-40" />

      <div className="relative z-10">
        <nav className="sticky top-0 z-50">
          <div className="mx-auto max-w-5xl px-4 pt-3">
            <div className="flex h-14 items-center justify-between rounded-2xl glass-strong px-5">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-xl shadow-lg shadow-indigo-500/20">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-bold tracking-tight text-gray-900">Seora CV</span>
              </Link>
              <div className="flex items-center gap-3">
                {session && tokens !== null && (
                  <div className="flex items-center gap-1.5 rounded-full bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                    <Coins className="h-3 w-3" /> {tokens} tokens
                  </div>
                )}
                <Link href="/app" className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors">Dashboard</Link>
              </div>
            </div>
          </div>
        </nav>

        <section className="pt-12 pb-6 sm:pt-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full glass-strong px-4 py-1.5 text-xs font-semibold text-cyan-700 mb-4 shadow-sm">
              <RefreshCw className="h-3.5 w-3.5" />
              Reformulateur IA
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Reformulez <span className="brand-gradient-text">vos textes</span>
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto">
              Changez le style de vos textes en gardant le même sens. Idéal pour mémoires, rapports et dissertations.
            </p>
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto max-w-5xl px-6">
            {/* Style selector */}
            <div className="mb-6 glass-card rounded-2xl px-4 py-2.5 flex items-center gap-3 w-fit">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Style</span>
              <div className="flex gap-1">
                {([
                  { id: "academique" as const, label: "Académique" },
                  { id: "simplifie" as const, label: "Simplifié" },
                  { id: "professionnel" as const, label: "Professionnel" },
                  { id: "soutenu" as const, label: "Soutenu" },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setStyle(opt.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      style === opt.id
                        ? "brand-gradient text-white shadow-md shadow-indigo-500/20"
                        : "text-gray-500 hover:bg-white/60"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Input */}
              <div className="glass-card rounded-3xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-900">Texte original</span>
                  <span className="text-[11px] text-gray-400">{inputText.trim().split(/\s+/).filter(Boolean).length} mots</span>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Collez ici le texte à reformuler..."
                  maxLength={15000}
                  rows={16}
                  className="flex-1 w-full rounded-xl border border-gray-200/60 bg-white/40 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 resize-none outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 backdrop-blur-sm leading-relaxed"
                />
                <button
                  onClick={handleReformulate}
                  disabled={loading || !inputText || inputText.length < 50 || !session}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-5 py-3 text-sm font-bold text-white disabled:opacity-40 shadow-lg shadow-indigo-500/25"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Reformulation...</> : <><Sparkles className="h-4 w-4" /> Reformuler <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] ml-1">1 token</span></>}
                </button>
              </div>

              {/* Output */}
              <div className="glass-card rounded-3xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-900">Texte reformulé</span>
                  {result && (
                    <button onClick={() => { navigator.clipboard.writeText(result.reformulatedText); setCopied(true); toast.success("Copié !"); setTimeout(() => setCopied(false), 2000); }}
                      className="flex items-center gap-1.5 rounded-lg bg-gray-100/80 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-200/80">
                      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copié" : "Copier"}
                    </button>
                  )}
                </div>

                {result ? (
                  <>
                    <div className="flex-1 rounded-xl border border-gray-200/60 bg-white/40 px-4 py-3 text-sm text-gray-700 leading-relaxed overflow-y-auto max-h-[400px] backdrop-blur-sm whitespace-pre-wrap">
                      {result.reformulatedText}
                    </div>
                    <button
                      onClick={() => { setInputText(result.reformulatedText); setResult(null); }}
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-white/50 border border-gray-200/40 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-white/70"
                    >
                      <RotateCcw className="h-3 w-3" /> Reformuler encore
                    </button>
                  </>
                ) : (
                  <div className="flex-1 rounded-xl border border-dashed border-gray-200/60 bg-white/20 flex items-center justify-center">
                    <div className="text-center p-8">
                      <ArrowLeftRight className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-400">Le résultat apparaîtra ici</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
