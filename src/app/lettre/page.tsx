"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  FileText,
  Building2,
  Globe,
  MapPin,
  Briefcase,
  Users,
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  ChevronRight,
  Lock,
  Mail,
  X,
  Coins,
  Upload,
  Zap,
  Search,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";

/* ─── Types ─── */
interface CoverLetterResult {
  coverLetter: string;
  tips: string[];
  companyInsights: string[];
  companyInfo: {
    name: string;
    description: string;
    sector: string;
    values: string[];
    products: string[];
    culture: string;
    size: string;
  };
}

interface CVAnalysis {
  id: string;
  fileName: string;
  score: number;
}

/* ─── Steps ─── */
const STEPS = [
  { id: 1, label: "Entreprise", icon: Building2 },
  { id: 2, label: "Poste", icon: Briefcase },
  { id: 3, label: "Votre profil", icon: Users },
  { id: 4, label: "Génération", icon: Sparkles },
] as const;

/* ═══════════════════════════════════════ */
/*           COVER LETTER PAGE             */
/* ═══════════════════════════════════════ */
export default function LettrePage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Step management
  const [step, setStep] = useState(1);

  // Form data
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companySector, setCompanySector] = useState("");
  const [companySize, setCompanySize] = useState("");

  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobType, setJobType] = useState("");
  const [jobLocation, setJobLocation] = useState("");

  const [selectedCV, setSelectedCV] = useState<string>("");
  const [cvList, setCvList] = useState<CVAnalysis[]>([]);
  const [tone, setTone] = useState("professionnel");
  const [strengths, setStrengths] = useState("");

  // Result
  const [result, setResult] = useState<CoverLetterResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<number | null>(null);

  // Auth modal
  const [showAuth, setShowAuth] = useState(false);

  // Fetch tokens + CV list
  useEffect(() => {
    if (session) {
      fetch("/api/tokens").then(r => r.json()).then(d => setTokens(d.tokens)).catch(() => {});
      fetch("/api/analyses").then(r => r.json()).then(d => {
        if (Array.isArray(d)) setCvList(d);
      }).catch(() => {});
    }
  }, [session]);

  /* ─── Generate ─── */
  const handleGenerate = async () => {
    if (!session) {
      setShowAuth(true);
      return;
    }

    if (!companyName || !jobDescription) {
      toast.error("Remplissez au minimum le nom de l'entreprise et la description du poste");
      return;
    }

    setLoading(true);

    // Build enriched job description with all form context
    const enrichedDescription = [
      jobDescription,
      jobTitle && `\nPoste: ${jobTitle}`,
      jobType && `\nType de contrat: ${jobType}`,
      jobLocation && `\nLocalisation: ${jobLocation}`,
      companyCity && `\nVille de l'entreprise: ${companyCity}`,
      companySector && `\nSecteur: ${companySector}`,
      companySize && `\nTaille entreprise: ${companySize}`,
      tone && `\nTon souhaité: ${tone}`,
      strengths && `\nPoints forts à mettre en avant: ${strengths}`,
    ].filter(Boolean).join("");

    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvAnalysisId: selectedCV || undefined,
          companyName,
          companyUrl: companyUrl || undefined,
          jobDescription: enrichedDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la génération");
        return;
      }

      setResult(data);
      setTokens(t => (t !== null ? t - 3 : null));
      setStep(4);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) return companyName.length > 0;
    if (step === 2) return jobDescription.length > 0;
    if (step === 3) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ═══ NAV ═══ */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">CV Master</span>
          </Link>

          <div className="flex items-center gap-3">
            {session && tokens !== null && (
              <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                <Coins className="h-3 w-3" />
                {tokens} token{tokens !== 1 ? "s" : ""}
              </div>
            )}
            <Link href="/app" className="text-sm text-gray-500 hover:text-gray-900">
              Retour à l&apos;app
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* ═══ HEADER ═══ */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Lettre de motivation IA
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Remplissez le formulaire, l&apos;IA recherche l&apos;entreprise et génère une lettre personnalisée.
          </p>
        </div>

        {/* ═══ STEPPER ═══ */}
        {!result && (
          <div className="mb-10 flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => s.id <= step && setStep(s.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                    step === s.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : step > s.id
                      ? "bg-indigo-50 text-indigo-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.id}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══ STEP 1: ENTREPRISE ═══ */}
        {step === 1 && !result && (
          <div className="animate-fade-up space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">L&apos;entreprise cible</h2>
                  <p className="text-xs text-gray-500">L&apos;IA va scraper leur site pour personnaliser la lettre</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Nom de l&apos;entreprise <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ex: L'Oréal, Google, BNP Paribas..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Site web de l&apos;entreprise
                    <span className="ml-1 text-gray-400 font-normal">(recommandé pour de meilleurs résultats)</span>
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      value={companyUrl}
                      onChange={(e) => setCompanyUrl(e.target.value)}
                      placeholder="https://www.entreprise.com"
                      className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Ville</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={companyCity}
                        onChange={(e) => setCompanyCity(e.target.value)}
                        placeholder="Paris"
                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Secteur</label>
                    <select
                      value={companySector}
                      onChange={(e) => setCompanySector(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
                    >
                      <option value="">Sélectionner...</option>
                      <option>Tech / IT</option>
                      <option>Finance / Banque</option>
                      <option>Santé / Pharma</option>
                      <option>Commerce / Retail</option>
                      <option>Industrie</option>
                      <option>Consulting</option>
                      <option>Marketing / Communication</option>
                      <option>Éducation</option>
                      <option>BTP / Immobilier</option>
                      <option>Luxe / Mode</option>
                      <option>Énergie</option>
                      <option>Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Taille</label>
                    <select
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
                    >
                      <option value="">Sélectionner...</option>
                      <option>Startup (1-50)</option>
                      <option>PME (50-250)</option>
                      <option>ETI (250-5000)</option>
                      <option>Grande entreprise (5000+)</option>
                    </select>
                  </div>
                </div>
              </div>

              {companyUrl && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-emerald-600" />
                  <p className="text-xs text-emerald-700">L&apos;IA va analyser le site pour extraire les valeurs, la culture et les projets de l&apos;entreprise</p>
                </div>
              )}
            </div>

            <StepNav step={1} canGoNext={canGoNext()} onNext={() => setStep(2)} />
          </div>
        )}

        {/* ═══ STEP 2: POSTE ═══ */}
        {step === 2 && !result && (
          <div className="animate-fade-up space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Le poste visé</h2>
                  <p className="text-xs text-gray-500">Plus vous donnez de détails, plus la lettre sera pertinente</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Intitulé du poste</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="ex: Développeur Full Stack, Chef de projet marketing..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Type de contrat</label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
                    >
                      <option value="">Sélectionner...</option>
                      <option>CDI</option>
                      <option>CDD</option>
                      <option>Stage</option>
                      <option>Alternance</option>
                      <option>Freelance</option>
                      <option>Intérim</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Localisation du poste</label>
                    <input
                      type="text"
                      value={jobLocation}
                      onChange={(e) => setJobLocation(e.target.value)}
                      placeholder="Paris, Remote, Hybride..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Description du poste / offre d&apos;emploi <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Collez ici l'offre d'emploi complète ou décrivez le poste en détail (missions, compétences recherchées, etc.)"
                    rows={8}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    {jobDescription.length > 0 ? `${jobDescription.length} caractères` : "Copiez-collez l'annonce depuis LinkedIn, Indeed, etc."}
                  </p>
                </div>
              </div>
            </div>

            <StepNav step={2} canGoNext={canGoNext()} onPrev={() => setStep(1)} onNext={() => setStep(3)} />
          </div>
        )}

        {/* ═══ STEP 3: PROFIL ═══ */}
        {step === 3 && !result && (
          <div className="animate-fade-up space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Votre profil</h2>
                  <p className="text-xs text-gray-500">Optionnel — enrichit la personnalisation de la lettre</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* CV selection */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Lier un CV analysé
                    <span className="ml-1 text-gray-400 font-normal">(votre lettre sera basée sur votre CV)</span>
                  </label>
                  {cvList.length > 0 ? (
                    <div className="space-y-2">
                      {cvList.map((cv) => (
                        <button
                          key={cv.id}
                          onClick={() => setSelectedCV(cv.id === selectedCV ? "" : cv.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                            selectedCV === cv.id
                              ? "border-indigo-300 bg-indigo-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{cv.fileName}</p>
                            <p className="text-[11px] text-gray-400">Score: {cv.score}/100</p>
                          </div>
                          {selectedCV === cv.id && (
                            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                      <Upload className="mx-auto h-5 w-5 text-gray-300 mb-1" />
                      <p className="text-xs text-gray-400">
                        Aucun CV analysé.{" "}
                        <Link href="/app" className="text-indigo-600 font-medium hover:underline">
                          Analysez votre CV d&apos;abord
                        </Link>
                      </p>
                    </div>
                  )}
                </div>

                {/* Tone */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Ton de la lettre</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { value: "professionnel", label: "Professionnel" },
                      { value: "dynamique", label: "Dynamique" },
                      { value: "créatif", label: "Créatif" },
                      { value: "formel", label: "Formel" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                          tone === t.value
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Points forts à mettre en avant
                    <span className="ml-1 text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <textarea
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    placeholder="ex: 5 ans d'expérience en React, bilingue anglais, management d'équipe de 10 personnes..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Summary before generation */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <Info className="h-4 w-4 text-indigo-600" />
                Récapitulatif
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-400">Entreprise</p>
                  <p className="font-medium text-gray-900">{companyName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Poste</p>
                  <p className="font-medium text-gray-900">{jobTitle || "Non spécifié"}</p>
                </div>
                <div>
                  <p className="text-gray-400">CV lié</p>
                  <p className="font-medium text-gray-900">
                    {selectedCV ? cvList.find(c => c.id === selectedCV)?.fileName || "Oui" : "Non"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Ton</p>
                  <p className="font-medium text-gray-900 capitalize">{tone}</p>
                </div>
              </div>
            </div>

            {/* Generate button */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => session ? handleGenerate() : setShowAuth(true)}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Recherche entreprise + génération...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Générer ma lettre de motivation</span>
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">3 tokens</span>
                  </>
                )}
              </button>
              <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-gray-600">
                ← Retour
              </button>
            </div>

            {loading && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="space-y-3">
                  <LoadingStep done={true} label="Recherche de l'entreprise sur le web" />
                  <LoadingStep done={false} active={true} label="Analyse des valeurs et de la culture" />
                  <LoadingStep done={false} label="Croisement avec votre profil" />
                  <LoadingStep done={false} label="Rédaction de la lettre personnalisée" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 4: RESULTS ═══ */}
        {result && (
          <div className="animate-fade-up space-y-5">
            {/* Company research results */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
                <Search className="h-4 w-4 text-indigo-600" />
                Recherche entreprise — {result.companyInfo.name}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InfoPill label="Secteur" value={result.companyInfo.sector} />
                <InfoPill label="Taille" value={result.companyInfo.size} />
                <InfoPill label="Valeurs" value={result.companyInfo.values.slice(0, 2).join(", ")} />
                <InfoPill label="Culture" value={result.companyInfo.culture.slice(0, 50) + "..."} />
              </div>

              {result.companyInsights.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Insights utilisés</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.companyInsights.map((insight, i) => (
                      <span key={i} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] text-indigo-700">
                        {insight}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* The letter */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Votre lettre de motivation</h3>
                <CopyButton text={result.coverLetter} />
              </div>
              <div className="rounded-xl bg-gray-50 p-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 font-[system-ui]">
                {result.coverLetter}
              </div>
            </div>

            {/* Tips */}
            {result.tips.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Conseils
                </h3>
                <ul className="space-y-1.5">
                  {result.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => {
                  setResult(null);
                  setStep(1);
                  setCompanyName("");
                  setCompanyUrl("");
                  setJobDescription("");
                  setJobTitle("");
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Nouvelle lettre
              </button>
              <Link
                href="/app"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
              >
                Retour à l&apos;app
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ═══ AUTH MODAL ═══ */}
      {showAuth && !session && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAuth(false)} />
          <div className="relative w-full max-w-md animate-scale-in rounded-2xl bg-white p-8 shadow-2xl">
            <button onClick={() => setShowAuth(false)} className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
            <div className="text-center mb-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                <Lock className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">Connectez-vous</h3>
              <p className="mt-1 text-sm text-gray-500">3 tokens offerts à l&apos;inscription</p>
            </div>
            <AuthForm onSuccess={() => { setShowAuth(false); window.location.reload(); }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════ SUB-COMPONENTS ═══════ */

function StepNav({ step, canGoNext, onPrev, onNext }: {
  step: number;
  canGoNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      {onPrev ? (
        <button onClick={onPrev} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
      ) : <div />}
      {onNext && (
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
        >
          Suivant <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function LoadingStep({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
        done ? "bg-emerald-100" : active ? "bg-indigo-100" : "bg-gray-100"
      }`}>
        {done ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        ) : active ? (
          <Loader2 className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-gray-300" />
        )}
      </div>
      <p className={`text-sm ${done ? "text-emerald-700" : active ? "text-indigo-700 font-medium" : "text-gray-400"}`}>
        {label}
      </p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2.5">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-medium text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

function AuthForm({ onSuccess }: { onSuccess: () => void }) {
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Prénom" required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
      <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {loading ? "Connexion..." : "Continuer gratuitement"}
      </button>
    </form>
  );
}
