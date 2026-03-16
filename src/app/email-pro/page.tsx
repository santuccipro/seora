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
  Mail,
  Send,
  Building2,
  User,
  Briefcase,
} from "lucide-react";

const EMAIL_TYPES = [
  { id: "candidature" as const, label: "Candidature", icon: Briefcase },
  { id: "relance" as const, label: "Relance", icon: Send },
  { id: "stage" as const, label: "Stage", icon: Building2 },
  { id: "remerciement" as const, label: "Remerciement", icon: Check },
  { id: "demande_info" as const, label: "Demande d'info", icon: Mail },
];

const TONES = [
  { id: "formel", label: "Formel" },
  { id: "semi-formel", label: "Semi-formel" },
  { id: "cordial", label: "Cordial" },
];

export default function EmailProPage() {
  const { data: session } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);
  const [context, setContext] = useState("");
  const [type, setType] = useState<string>("candidature");
  const [recipientName, setRecipientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [tone, setTone] = useState("formel");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ subject: string; body: string; tips?: string[] } | null>(null);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  useEffect(() => {
    if (session) {
      fetch("/api/tokens").then(r => r.json()).then(d => setTokens(d.tokens)).catch(() => {});
    }
  }, [session]);

  const handleGenerate = async () => {
    if (!session) { toast.error("Connectez-vous d'abord"); return; }
    if (!context || context.trim().length < 20) { toast.error("Minimum 20 caractères de contexte"); return; }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/email-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, type, recipientName, companyName, position, tone }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur"); return; }
      setResult(data);
      setTokens(prev => prev !== null ? prev - 1 : null);
      toast.success("Email généré !");
    } catch { toast.error("Erreur réseau"); } finally { setLoading(false); }
  };

  const copyText = (text: string, type: "subject" | "body") => {
    navigator.clipboard.writeText(text);
    if (type === "subject") { setCopiedSubject(true); setTimeout(() => setCopiedSubject(false), 2000); }
    else { setCopiedBody(true); setTimeout(() => setCopiedBody(false), 2000); }
    toast.success("Copié !");
  };

  return (
    <div className="min-h-screen bg-mesh">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="orb orb-indigo animate-float-slow w-[400px] h-[400px] -top-20 -left-40 opacity-50" />
        <div className="orb orb-purple animate-float-medium w-[500px] h-[500px] bottom-0 -right-40 opacity-30" />
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
                <span className="text-base font-bold tracking-tight text-gray-900">CV Master</span>
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
            <div className="inline-flex items-center gap-2 rounded-full glass-strong px-4 py-1.5 text-xs font-semibold text-indigo-700 mb-4 shadow-sm">
              <Mail className="h-3.5 w-3.5" />
              Email Pro IA
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Générez des <span className="brand-gradient-text">emails professionnels</span>
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto">
              Candidatures, relances, stages... L'IA rédige des emails percutants et adaptés à votre contexte.
            </p>
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Form */}
              <div className="glass-card rounded-3xl p-5 flex flex-col gap-4">
                <span className="text-sm font-bold text-gray-900">Paramètres</span>

                {/* Email type */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Type d'email</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMAIL_TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setType(t.id)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                          type === t.id
                            ? "brand-gradient text-white shadow-md shadow-indigo-500/20"
                            : "text-gray-500 hover:bg-white/60 bg-white/30"
                        }`}
                      >
                        <t.icon className="h-3 w-3" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Ton</label>
                  <div className="flex gap-1.5">
                    {TONES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTone(t.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                          tone === t.id
                            ? "brand-gradient text-white shadow-md shadow-indigo-500/20"
                            : "text-gray-500 hover:bg-white/60 bg-white/30"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Destinataire</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="M. Dupont"
                        className="w-full rounded-xl border border-gray-200/60 bg-white/40 pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 backdrop-blur-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Entreprise</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Google France"
                        className="w-full rounded-xl border border-gray-200/60 bg-white/40 pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 backdrop-blur-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Poste visé</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Développeur Full-Stack"
                      className="w-full rounded-xl border border-gray-200/60 bg-white/40 pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 backdrop-blur-sm"
                    />
                  </div>
                </div>

                {/* Context */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Contexte</label>
                    <span className="text-[11px] text-gray-400">{context.length}/2000</span>
                  </div>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Décrivez la situation : pourquoi vous écrivez, votre profil, ce que vous attendez..."
                    maxLength={2000}
                    rows={6}
                    className="flex-1 w-full rounded-xl border border-gray-200/60 bg-white/40 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 resize-none outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 backdrop-blur-sm leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading || !context || context.trim().length < 20 || !session}
                  className="flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-5 py-3 text-sm font-bold text-white disabled:opacity-40 shadow-lg shadow-indigo-500/25"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Génération...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Générer l'email <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] ml-1">1 token</span></>
                  )}
                </button>
              </div>

              {/* Result */}
              <div className="glass-card rounded-3xl p-5 flex flex-col">
                <span className="text-sm font-bold text-gray-900 mb-3">Email généré</span>

                {result ? (
                  <div className="flex-1 flex flex-col gap-3">
                    {/* Subject */}
                    <div className="rounded-xl border border-gray-200/60 bg-white/40 px-4 py-3 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Objet</span>
                        <button
                          onClick={() => copyText(result.subject, "subject")}
                          className="flex items-center gap-1 rounded-lg bg-gray-100/80 px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-200/80"
                        >
                          {copiedSubject ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                          {copiedSubject ? "Copié" : "Copier"}
                        </button>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{result.subject}</p>
                    </div>

                    {/* Body */}
                    <div className="flex-1 rounded-xl border border-gray-200/60 bg-white/40 px-4 py-3 backdrop-blur-sm overflow-y-auto max-h-[400px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Corps</span>
                        <button
                          onClick={() => copyText(result.body, "body")}
                          className="flex items-center gap-1 rounded-lg bg-gray-100/80 px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-200/80"
                        >
                          {copiedBody ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                          {copiedBody ? "Copié" : "Copier"}
                        </button>
                      </div>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{result.body}</div>
                    </div>

                    {/* Tips */}
                    {result.tips && result.tips.length > 0 && (
                      <div className="rounded-xl border border-indigo-200/40 bg-indigo-50/30 px-4 py-3">
                        <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider mb-2 block">Conseils</span>
                        <ul className="space-y-1">
                          {result.tips.map((tip, i) => (
                            <li key={i} className="text-xs text-indigo-700/80 flex items-start gap-2">
                              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 rounded-xl border border-dashed border-gray-200/60 bg-white/20 flex items-center justify-center">
                    <div className="text-center p-8">
                      <Send className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-400">Votre email apparaîtra ici</p>
                      <p className="text-xs text-gray-300 mt-1">Remplissez le formulaire et cliquez sur Générer</p>
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
