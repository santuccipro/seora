"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Copy,
  FileDown,
  Check,
  Sparkles,
} from "lucide-react";
import { CV_SECTOR_LIST, CvSectorKey } from "@/lib/cv-criteria";

type WizardStep = 1 | 2 | 3 | 4;
type Tone = "formal" | "modern" | "creative";

interface WizardData {
  // Step 1
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  sector: CvSectorKey;
  targetRole: string;
  companyName: string;
  tone: Tone;
  // Step 2
  motivation: string;
  companyValues: string;
  // Step 3
  experience1: string;
  experience2: string;
  experience3: string;
}

interface LetterResult {
  subject: string;
  paragraphs: string[];
  closing: string;
}

const TONE_OPTIONS: Array<{ value: Tone; label: string; emoji: string; desc: string }> = [
  { value: "formal", label: "Formel", emoji: "📋", desc: "Ton classique et professionnel" },
  { value: "modern", label: "Moderne", emoji: "⚡", desc: "Direct et percutant" },
  { value: "creative", label: "Créatif", emoji: "🎨", desc: "Accroche originale" },
];

const LOADING_STEPS = [
  "Analyse du secteur...",
  "Rédaction personnalisée...",
  "Finalisation...",
];

function assembleLetterText(result: LetterResult): string {
  const parts = [`Objet : ${result.subject}`, ""];
  for (const para of result.paragraphs) {
    parts.push(para, "");
  }
  parts.push(result.closing);
  return parts.join("\n");
}

export default function CoverLetterWizardPage() {
  const { status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    sector: "generique",
    targetRole: "",
    companyName: "",
    tone: "formal",
    motivation: "",
    companyValues: "",
    experience1: "",
    experience2: "",
    experience3: "",
  });

  const [generating, setGenerating] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [result, setResult] = useState<LetterResult | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/cover-letter/wizard");
    }
  }, [status, router]);

  const set = <K extends keyof WizardData>(key: K, value: WizardData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  // Validate before advancing
  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return Boolean(data.firstName && data.lastName && data.targetRole && data.companyName);
      case 2:
        return data.motivation.trim().length >= 100;
      case 3:
        return Boolean(data.experience1.trim());
      default:
        return false;
    }
  };

  const goNext = () => {
    if (!canAdvance()) {
      if (step === 2 && data.motivation.trim().length < 100) {
        toast.error("Décris ta motivation en au moins 100 caractères");
      } else {
        toast.error("Remplis les champs obligatoires avant de continuer");
      }
      return;
    }
    const next = (step + 1) as WizardStep;
    setStep(next);
    if (next === 4) generateLetter();
  };

  const goPrev = () => setStep((s) => Math.max(1, s - 1) as WizardStep);

  const generateLetter = async () => {
    setGenerating(true);
    setLoadingStepIdx(0);
    setResult(null);

    // Animate loading steps
    const animate = async () => {
      const delays = [1800, 2200, 1500];
      for (let i = 0; i < delays.length; i++) {
        await new Promise((r) => setTimeout(r, delays[i]));
        setLoadingStepIdx(i + 1);
      }
    };

    const callApi = async () => {
      const keyExperiences = [data.experience1, data.experience2, data.experience3].filter(
        (e) => e.trim()
      );
      const res = await fetch("/api/cover-letter/wizard-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          sector: data.sector,
          targetRole: data.targetRole,
          companyName: data.companyName,
          companyValues: data.companyValues || undefined,
          motivation: data.motivation,
          keyExperiences,
          tone: data.tone,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Erreur génération");
      return json as LetterResult;
    };

    try {
      const [, letterResult] = await Promise.all([animate(), callApi()]);
      setResult(letterResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de génération");
      setStep(1);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(assembleLetterText(result));
    setCopied(true);
    toast.success("Lettre copiée !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    setDownloadingPdf(true);
    try {
      const coverLetter = assembleLetterText(result);
      const res = await fetch("/api/cover-letter/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverLetter,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          city: data.city,
          companyName: data.companyName,
          tone: data.tone === "formal" ? "finance" : data.tone === "modern" ? "startup" : "startup",
        }),
      });
      if (!res.ok) { toast.error("Erreur génération PDF"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LM_${data.companyName.replace(/\s+/g, "_") || "lettre"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF téléchargé !");
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header nav */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/cover-letter"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
            Rédiger ma lettre étape par étape
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center gap-1">
            {([1, 2, 3, 4] as WizardStep[]).map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  s <= step
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600"
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-500">
            <span>Étape {step} / 4</span>
            <span>{Math.round((step / 4) * 100)}%</span>
          </div>
        </div>

        {/* Step title */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Étape {step}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            {step === 1 && "Profil & Poste"}
            {step === 2 && "Motivation & Entreprise"}
            {step === 3 && "Tes atouts"}
            {step === 4 && "Génération & Résultat"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 1 && "Qui tu es et ce que tu vises."}
            {step === 2 && "Pourquoi toi, pourquoi eux."}
            {step === 3 && "Tes expériences clés à valoriser."}
            {step === 4 && "Ta lettre personnalisée, prête à envoyer."}
          </p>
        </div>

        {/* Step body */}
        <div className="rounded-3xl bg-white shadow-xl border border-indigo-100 p-6 sm:p-8">
          {/* ── STEP 1 ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <WField label="Prénom *" value={data.firstName} onChange={(v) => set("firstName", v)} placeholder="Marie" />
                <WField label="Nom *" value={data.lastName} onChange={(v) => set("lastName", v)} placeholder="Martin" />
                <WField label="Email" value={data.email} onChange={(v) => set("email", v)} placeholder="marie@email.com" type="email" />
                <WField label="Téléphone" value={data.phone} onChange={(v) => set("phone", v)} placeholder="06 12 34 56 78" />
                <WField label="Ville" value={data.city} onChange={(v) => set("city", v)} placeholder="Paris" />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Secteur</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CV_SECTOR_LIST.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => set("sector", s.key)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold border transition-colors text-left ${
                        data.sector === s.key
                          ? "bg-indigo-100 border-indigo-500 text-indigo-900"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <WField label="Poste visé *" value={data.targetRole} onChange={(v) => set("targetRole", v)} placeholder="Analyste financier junior" />
              <WField label="Entreprise cible *" value={data.companyName} onChange={(v) => set("companyName", v)} placeholder="Société Générale" />

              <div>
                <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3 block">Ton de la lettre</label>
                <div className="grid grid-cols-3 gap-3">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set("tone", t.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-4 transition-all ${
                        data.tone === t.value
                          ? "border-indigo-500 bg-indigo-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl">{t.emoji}</span>
                      <span className={`text-sm font-bold ${data.tone === t.value ? "text-indigo-800" : "text-gray-700"}`}>
                        {t.label}
                      </span>
                      <span className="text-[10px] text-gray-400 text-center">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">
                  Pourquoi tu veux ce poste ? *
                </label>
                <textarea
                  value={data.motivation}
                  onChange={(e) => set("motivation", e.target.value)}
                  rows={5}
                  placeholder="Ex : Je veux rejoindre cette équipe car je suis passionné par la gestion de patrimoine et j'ai développé des compétences en analyse financière lors de mon alternance..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none transition-colors"
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {data.motivation.length} caractères — min. 100 · Plus tu es précis, plus la lettre sera personnalisée
                </p>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">
                  Ce que tu sais de l&apos;entreprise / ses valeurs <span className="text-gray-400 normal-case font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={data.companyValues}
                  onChange={(e) => set("companyValues", e.target.value)}
                  rows={4}
                  placeholder="Ex : L'entreprise est reconnue pour son engagement RSE, sa culture d'innovation et ses programmes de développement interne..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none transition-colors"
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Plus tu es précis, plus la lettre sera personnalisée
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 3 ─────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                Remplis au moins un atout. Ces éléments seront intégrés dans ta lettre.<br />
                <span className="text-gray-400">Ex : J&apos;ai géré une équipe de 5 personnes sur un projet similaire</span>
              </p>

              {[
                { key: "experience1" as const, label: "Atout 1 *", required: true },
                { key: "experience2" as const, label: "Atout 2", required: false },
                { key: "experience3" as const, label: "Atout 3", required: false },
              ].map(({ key, label, required }) => (
                <div key={key}>
                  <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-1.5 block">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={data[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={
                      key === "experience1"
                        ? "Ex : Alternance en gestion de patrimoine chez SG (2 ans), suivi de 50 clients"
                        : key === "experience2"
                        ? "Ex : Maîtrise des outils Bloomberg et Excel avancé"
                        : "Ex : Capacité à travailler en équipe démontrée sur un projet international"
                    }
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-colors ${
                      required && !data[key].trim()
                        ? "border-orange-200 bg-orange-50 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        : "border-gray-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    }`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── STEP 4 ─────────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              {generating && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-indigo-400/20 animate-ping" />
                      <div className="relative h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Génération de ta lettre</p>
                      <p className="text-xs text-gray-400">Pour {data.companyName}</p>
                    </div>
                  </div>
                  {LOADING_STEPS.map((label, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 transition-all duration-700 ${
                        loadingStepIdx > i ? "opacity-100" : loadingStepIdx === i ? "opacity-70" : "opacity-25"
                      }`}
                    >
                      {loadingStepIdx > i ? (
                        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <Check className="h-4 w-4 text-green-500" />
                        </div>
                      ) : loadingStepIdx === i ? (
                        <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-full border-2 border-gray-200 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          loadingStepIdx > i
                            ? "text-gray-900 font-medium"
                            : loadingStepIdx === i
                            ? "text-gray-600"
                            : "text-gray-300"
                        }`}
                      >
                        {label}
                      </span>
                      {loadingStepIdx > i && (
                        <span className="text-[10px] text-green-500 font-medium ml-auto">Terminé</span>
                      )}
                    </div>
                  ))}
                  <div className="mt-4 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(((loadingStepIdx + 1) / 4) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {!generating && result && (
                <div className="space-y-5">
                  {/* Letter preview */}
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs uppercase tracking-widest text-indigo-700 font-bold">Ta lettre</p>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copié !" : "Copier"}
                      </button>
                    </div>
                    <div className="rounded-xl bg-white border border-indigo-100 p-5">
                      <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                        Objet : {result.subject}
                      </p>
                      <div className="space-y-3">
                        {result.paragraphs.map((para, i) => (
                          <p key={i} className="text-sm text-gray-700 leading-relaxed">
                            {para}
                          </p>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 mt-4 italic leading-relaxed border-t border-gray-100 pt-4">
                        {result.closing}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-4 text-sm font-bold shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50"
                  >
                    {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    {downloadingPdf ? "Génération PDF…" : "Télécharger en PDF"}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setResult(null); setStep(1); }}
                    className="w-full rounded-2xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Modifier les infos
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        {step < 4 && (
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Précédent
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-2.5 text-sm font-bold shadow-md hover:shadow-lg transition-shadow"
            >
              {step === 3 ? "Générer ma lettre" : "Suivant"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 4 && !generating && !result && (
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={goPrev}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function WField({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors"
      />
    </div>
  );
}
