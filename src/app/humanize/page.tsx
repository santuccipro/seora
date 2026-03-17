"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  FileText,
  Coins,
  ArrowRight,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Shield,
  Zap,
  RotateCcw,
  ChevronDown,
  Bot,
  User,
  ArrowLeftRight,
  X,
  Lock,
} from "lucide-react";

export default function HumanizePage() {
  const { data: session } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [intensity, setIntensity] = useState<"light" | "balanced" | "aggressive">("balanced");
  const [tone, setTone] = useState<"standard" | "professionnel" | "academique" | "decontracte">("standard");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    humanizedText: string;
    changes: string[];
    aiScoreBefore: number;
    aiScoreAfter: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  // Theatrical loading
  const [theatricalStep, setTheatricalStep] = useState(-1);
  const [fakeScoreBefore] = useState(78);
  const [fakeScoreAfter] = useState(12);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (session) {
      fetch("/api/tokens").then(r => r.json()).then(d => setTokens(d.tokens)).catch(() => {});
    }
  }, [session]);

  // Auto-process text from landing page sessionStorage
  const hasAutoProcessed = useRef(false);
  const [pendingAutoProcess, setPendingAutoProcess] = useState(false);
  useEffect(() => {
    if (hasAutoProcessed.current) return;
    const text = sessionStorage.getItem("seora_humanizer_text");
    if (text) {
      hasAutoProcessed.current = true;
      sessionStorage.removeItem("seora_humanizer_text");
      setInputText(text);
      setPendingAutoProcess(true);
    }
  }, []);

  const handleHumanize = async () => {
    if (!inputText || inputText.trim().length < 50) { toast.error("Le texte doit contenir au moins 50 caractères"); return; }

    setLoading(true);
    setResult(null);
    setTheatricalStep(0);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const animate = async () => {
      const delays = [2500, 3000, 3500, 2500, 2000];
      for (let i = 0; i < delays.length; i++) {
        await sleep(delays[i]);
        setTheatricalStep(i + 1);
      }
    };

    const callApi = async () => {
      if (!session) return null;
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, intensity, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      return data;
    };

    try {
      const [, apiResult] = await Promise.all([animate(), callApi()]);
      if (apiResult) {
        setResult(apiResult);
        setTokens(prev => prev !== null ? prev - 1 : null);
        toast.success("Texte humanisé !");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur réseau";
      toast.error(message);
    }

    setLoading(false);
  };

  // Auto-trigger after text loaded from sessionStorage
  useEffect(() => {
    if (pendingAutoProcess && inputText.length >= 50 && !loading) {
      setPendingAutoProcess(false);
      handleHumanize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoProcess, inputText]);

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.humanizedText);
      setCopied(true);
      toast.success("Copié !");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const charCount = inputText.length;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-mesh">
      {/* Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="orb orb-indigo animate-float-slow w-[400px] h-[400px] -top-20 -right-40 opacity-50" />
        <div className="orb orb-purple animate-float-medium w-[500px] h-[500px] bottom-0 -left-40 opacity-30" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-40" />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="sticky top-0 z-50">
          <div className="mx-auto max-w-5xl px-4 pt-3">
            <div className="flex h-14 items-center justify-between rounded-2xl glass-strong px-5">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-xl shadow-lg shadow-indigo-500/20">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-bold tracking-tight text-gray-900">CV Master</span>
              </Link>

              <div className="flex items-center gap-3">
                {session && tokens !== null && (
                  <div className="flex items-center gap-1.5 rounded-full bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                    <Coins className="h-3 w-3" />
                    {tokens} tokens
                  </div>
                )}
                <Link href="/app" className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors">
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Header */}
        <section className="pt-12 pb-8 sm:pt-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full glass-strong px-4 py-1.5 text-xs font-semibold text-indigo-700 mb-4 shadow-sm">
              <Shield className="h-3.5 w-3.5" />
              Anti-détection IA
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Humanisez <span className="brand-gradient-text">vos textes</span>
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto">
              Rendez vos textes indétectables par GPTZero, Originality.ai et autres détecteurs d&apos;IA. 1 token par utilisation.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <section className="pb-20">
          <div className="mx-auto max-w-5xl px-6">

            {/* Settings bar */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              {/* Intensity */}
              <div className="glass-card rounded-2xl px-4 py-2.5 flex items-center gap-3">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Intensité</span>
                <div className="flex gap-1">
                  {([
                    { id: "light" as const, label: "Léger", icon: "○" },
                    { id: "balanced" as const, label: "Équilibré", icon: "◐" },
                    { id: "aggressive" as const, label: "Agressif", icon: "●" },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setIntensity(opt.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        intensity === opt.id
                          ? "brand-gradient text-white shadow-md shadow-indigo-500/20"
                          : "text-gray-500 hover:bg-white/60"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div className="glass-card rounded-2xl px-4 py-2.5 flex items-center gap-3">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Ton</span>
                <div className="flex gap-1">
                  {([
                    { id: "standard" as const, label: "Standard" },
                    { id: "professionnel" as const, label: "Pro" },
                    { id: "academique" as const, label: "Académique" },
                    { id: "decontracte" as const, label: "Casual" },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setTone(opt.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        tone === opt.id
                          ? "brand-gradient text-white shadow-md shadow-indigo-500/20"
                          : "text-gray-500 hover:bg-white/60"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Input */}
              <div className="glass-card rounded-3xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100">
                      <Bot className="h-3.5 w-3.5 text-red-500" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Texte original</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span>{wordCount} mots</span>
                    <span>•</span>
                    <span>{charCount}/15000</span>
                  </div>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Collez ici votre texte généré par l'IA (lettre de motivation, email, essai, etc.)..."
                  maxLength={15000}
                  rows={16}
                  className="flex-1 w-full rounded-xl border border-gray-200/60 bg-white/40 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 resize-none outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 backdrop-blur-sm leading-relaxed"
                />
                <button
                  onClick={handleHumanize}
                  disabled={loading || !inputText || charCount < 50}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-5 py-3 text-sm font-bold text-white disabled:opacity-40 shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Humanisation en cours...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Humaniser <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] ml-1">1 token</span></>
                  )}
                </button>
              </div>

              {/* Output */}
              <div className="glass-card rounded-3xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                      <User className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Texte humanisé</span>
                  </div>
                  {result && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 rounded-lg bg-gray-100/80 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-200/80 transition-colors"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copié" : "Copier"}
                    </button>
                  )}
                </div>

                {/* Theatrical Loading */}
                {loading && theatricalStep >= 0 && (
                  <div className="flex-1 rounded-xl border border-gray-200/60 bg-white/40 px-5 py-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-indigo-400/20 animate-ping" />
                        <div className="relative h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">Humanisation en cours</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        "Analyse du texte original",
                        "Détection des patterns IA",
                        "Recherche de formulations naturelles",
                        "Reformulation intelligente",
                        "Vérification anti-détection",
                      ].map((step, i) => (
                        <div key={i} className={`flex items-center gap-3 transition-all duration-700 ${theatricalStep > i ? "opacity-100" : theatricalStep === i ? "opacity-70" : "opacity-25"}`}>
                          {theatricalStep > i ? (
                            <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                              <Check className="h-3 w-3 text-green-500" />
                            </div>
                          ) : theatricalStep === i ? (
                            <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                              <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                            </div>
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-200 shrink-0" />
                          )}
                          <span className={`text-xs ${theatricalStep > i ? "text-gray-900 font-medium" : theatricalStep === i ? "text-gray-600" : "text-gray-300"}`}>{step}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-1000 ease-out" style={{ width: `${Math.min(((theatricalStep + 1) / 6) * 100, 100)}%` }} />
                    </div>
                    {theatricalStep >= 2 && (
                      <div className="mt-4 pt-3 border-t border-gray-100/40">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2">Technologie utilisée</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {["Suppression SFT markers", "Désynchronisation GPT-patterns", "Randomisation syntaxique", "Inversion perplexité-burstiness"].map((t) => (
                            <span key={t} className="inline-flex items-center rounded-full bg-indigo-50/80 border border-indigo-100/60 px-2.5 py-0.5 text-[10px] font-medium text-indigo-500">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {theatricalStep >= 3 && (
                      <div className="mt-3 pt-3 border-t border-gray-100/40">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2">Vérifié avec</p>
                        <div className="flex items-center gap-4">
                          {["GPTZero", "Originality.ai", "Scribbr", "QuillBot"].map((n) => (
                            <span key={n} className="text-[11px] font-semibold text-gray-400">{n}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Gated Results (non-auth) */}
                {!loading && theatricalStep >= 5 && !session && !result && (
                  <div className="flex-1 relative rounded-xl border border-gray-200/60 bg-white/40 overflow-hidden">
                    {/* Fake scores visible */}
                    <div className="p-5">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="rounded-xl bg-red-50/80 border border-red-100/60 p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Avant</span>
                            <span className="text-sm font-extrabold text-red-600">{fakeScoreBefore}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-red-100 overflow-hidden">
                            <div className="h-full rounded-full bg-red-500 transition-all duration-1000" style={{ width: `${fakeScoreBefore}%` }} />
                          </div>
                          <p className="text-[10px] text-red-400 mt-1">Détecté comme IA</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50/80 border border-emerald-100/60 p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Après</span>
                            <span className="text-sm font-extrabold text-emerald-600">{fakeScoreAfter}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000" style={{ width: `${fakeScoreAfter}%` }} />
                          </div>
                          <p className="text-[10px] text-emerald-400 mt-1">Score humain</p>
                        </div>
                      </div>
                      {/* Blurred text */}
                      <div className="filter blur-[6px] pointer-events-none select-none space-y-2" aria-hidden="true">
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-11/12" />
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-4/5" />
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                      </div>
                    </div>
                    {/* Gate overlay */}
                    <div className="absolute inset-x-0 bottom-0 top-24 flex items-center justify-center bg-gradient-to-t from-white/95 via-white/90 to-transparent backdrop-blur-[2px]">
                      <div className="text-center px-6">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 mb-3">
                          <Shield className="h-5 w-5 text-indigo-600" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900">Débloquez le texte humanisé</h3>
                        <p className="text-xs text-gray-500 mt-1 mb-4">Créez votre compte pour accéder au résultat complet</p>
                        <button onClick={() => setShowAuth(true)} className="inline-flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-xs font-semibold text-white hover:bg-gray-800 shadow-lg transition-all">
                          <ArrowRight className="h-3.5 w-3.5" />
                          Créer mon compte — c&apos;est gratuit
                        </button>
                        <p className="text-[10px] text-gray-400 mt-2">Sans carte bancaire • 3 tokens offerts</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real result */}
                {result ? (
                  <div className="flex-1 rounded-xl border border-gray-200/60 bg-white/40 px-4 py-3 text-sm text-gray-700 leading-relaxed overflow-y-auto max-h-[400px] backdrop-blur-sm whitespace-pre-wrap">
                    {result.humanizedText}
                  </div>
                ) : !loading && theatricalStep < 5 && (
                  <div className="flex-1 rounded-xl border border-dashed border-gray-200/60 bg-white/20 flex items-center justify-center">
                    <div className="text-center p-8">
                      <ArrowLeftRight className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-400">Le texte humanisé apparaîtra ici</p>
                      <p className="text-xs text-gray-300 mt-1">Collez votre texte à gauche et cliquez sur Humaniser</p>
                    </div>
                  </div>
                )}

                {/* Score comparison */}
                {result && (
                  <div className="mt-4 space-y-3">
                    {/* AI Score bars */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-red-50/80 border border-red-100/60 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Avant</span>
                          <span className="text-sm font-extrabold text-red-600">{result.aiScoreBefore}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-red-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-500 transition-all duration-1000"
                            style={{ width: `${result.aiScoreBefore}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-red-400 mt-1">Détecté comme IA</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50/80 border border-emerald-100/60 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Après</span>
                          <span className="text-sm font-extrabold text-emerald-600">{result.aiScoreAfter}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                            style={{ width: `${result.aiScoreAfter}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-emerald-400 mt-1">Score humain</p>
                      </div>
                    </div>

                    {/* Changes accordion */}
                    <button
                      onClick={() => setShowChanges(!showChanges)}
                      className="flex w-full items-center justify-between rounded-xl bg-white/40 border border-gray-200/40 px-3 py-2 text-xs font-medium text-gray-500"
                    >
                      <span>{result.changes.length} modifications effectuées</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showChanges ? "rotate-180" : ""}`} />
                    </button>
                    {showChanges && (
                      <div className="rounded-xl bg-white/40 border border-gray-200/40 p-3 space-y-1.5">
                        {result.changes.map((change, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                            <Zap className="h-3 w-3 mt-0.5 shrink-0 text-indigo-400" />
                            {change}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setResult(null); setTheatricalStep(-1); }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/50 border border-gray-200/40 px-3 py-2.5 text-xs font-medium text-gray-500 hover:bg-white/70 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" /> Recommencer
                      </button>
                      <button
                        onClick={() => {
                          setInputText(result.humanizedText);
                          setResult(null);
                          setTheatricalStep(-1);
                          toast.success("Texte transféré — humanisez encore pour plus d'effet");
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl brand-gradient px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
                      >
                        <Sparkles className="h-3 w-3" /> Re-humaniser
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>
      </div>

      {/* Auth Modal */}
      {showAuth && !session && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAuth(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl animate-scale-in">
            <button onClick={() => setShowAuth(false)} className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
            <AuthFormHumanize onSuccess={() => { setShowAuth(false); window.location.reload(); }} />
          </div>
        </div>
      )}
    </div>
  );
}

function AuthFormHumanize({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, name, redirect: false });
    if (res?.ok) onSuccess();
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Débloquez vos résultats</h2>
      <p className="text-xs text-gray-500 mb-5">3 tokens offerts à l&apos;inscription</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre prénom" required className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" />
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? "Connexion..." : "Continuer"}
        </button>
      </form>
    </div>
  );
}
