"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  Camera,
  User,
  Briefcase,
  GraduationCap,
  Languages,
  Wrench,
  Heart,
  Wand2,
  FileDown,
  Check,
  Plus,
  Trash2,
  Palette,
  RefreshCw,
  PenTool,
  Linkedin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { LinkedInExtract } from "@/app/api/cv-build/linkedin-import/route";
import { CV_SECTOR_LIST, CvSectorKey } from "@/lib/cv-criteria";
import { track, EVT } from "@/lib/analytics";
import { PhotoStep } from "./PhotoStep";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

interface Education {
  id: string;
  degree: string;
  school: string;
  location: string;
  startDate: string;
  endDate: string;
  mention?: string;
}

interface LanguageEntry {
  id: string;
  name: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Natif";
}

interface CvDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  linkedIn: string;
  portfolio: string;
  photoUrl: string | null;
  sector: CvSectorKey;
  targetRole: string;
  summary: string;
  experiences: Experience[];
  educations: Education[];
  skills: string[];
  languages: LanguageEntry[];
  interests: string[];
  customization: Record<string, string | boolean>;
  offerText: string;
  offerKeywords: string[];
}

const EMPTY_DRAFT: CvDraft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  linkedIn: "",
  portfolio: "",
  photoUrl: null,
  sector: "generique",
  targetRole: "",
  summary: "",
  experiences: [],
  educations: [],
  skills: [],
  languages: [],
  interests: [],
  customization: {},
  offerText: "",
  offerKeywords: [],
};

const STORAGE_KEY = "seora_cv_builder_draft_v2";

// ─── Customization schema (mirrors customize.ts) ─────────────────────────────
const CUSTOMIZATION_OPTIONS = [
  {
    id: "accent",
    label: "Couleur principale",
    type: "palette",
    options: [
      { value: "#1A1A2E", label: "Marine" },
      { value: "#7B1C2E", label: "Bordeaux" },
      { value: "#111111", label: "Noir" },
      { value: "#065F46", label: "Vert forêt" },
      { value: "#B91C1C", label: "Rouge" },
      { value: "#EA580C", label: "Orange" },
      { value: "#6D28D9", label: "Violet" },
      { value: "#B0892A", label: "Or" },
      { value: "#0F766E", label: "Teal" },
      { value: "#1D4ED8", label: "Bleu" },
    ],
  },
  {
    id: "font",
    label: "Police",
    type: "radio",
    options: [
      { value: "sans", label: "Sans-serif", desc: "Inter · Lu partout" },
      { value: "serif", label: "Serif", desc: "Garamond · Finance/Droit" },
      { value: "mixed", label: "Mixte", desc: "Titres serif + corps sans" },
    ],
  },
  {
    id: "background",
    label: "Fond",
    type: "palette",
    options: [
      { value: "#ffffff", label: "Blanc" },
      { value: "#FDFBF7", label: "Crème" },
      { value: "#F9FAFB", label: "Gris clair" },
      { value: "#0F172A", label: "Nuit" },
    ],
  },
  {
    id: "borderRadius",
    label: "Bords",
    type: "radio",
    options: [
      { value: "0px", label: "Carrés" },
      { value: "4px", label: "Légers" },
      { value: "8px", label: "Arrondis" },
      { value: "20px", label: "Pills" },
    ],
  },
  {
    id: "photoShape",
    label: "Photo",
    type: "radio",
    options: [
      { value: "50%", label: "Ronde" },
      { value: "4px", label: "Carrée" },
      { value: "none", label: "Sans" },
    ],
  },
  {
    id: "density",
    label: "Densité",
    type: "radio",
    options: [
      { value: "compact", label: "Compact" },
      { value: "standard", label: "Standard" },
      { value: "airy", label: "Aéré" },
    ],
  },
  {
    id: "nameSize",
    label: "Nom",
    type: "radio",
    options: [
      { value: "18pt", label: "Standard" },
      { value: "22pt", label: "Grand" },
      { value: "28pt", label: "Très grand" },
    ],
  },
  {
    id: "accentUsage",
    label: "Couleur",
    type: "radio",
    options: [
      { value: "minimal", label: "Discret" },
      { value: "medium", label: "Modéré" },
      { value: "rich", label: "Présent" },
    ],
  },
];

export default function CvBuilderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCv = searchParams.get("fromCv");
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<CvDraft>(EMPTY_DRAFT);
  const [polishing, setPolishing] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // LinkedIn import
  const [linkedinPanelOpen, setLinkedinPanelOpen] = useState(false);
  const [linkedinText, setLinkedinText] = useState("");
  const [linkedinImporting, setLinkedinImporting] = useState(false);

  // Auth gate
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/cv-builder");
    }
  }, [status, router]);

  // Load draft
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (fromCv) {
        setPrefilling(true);
        try {
          const res = await fetch(`/api/cv-build/prefill?cvAnalysisId=${fromCv}`);
          const data = await res.json();
          if (!cancelled && res.ok && data.draft) {
            setDraft({ ...EMPTY_DRAFT, ...data.draft });
            toast.success("CV pré-rempli depuis ton analyse");
            setPrefilling(false);
            return;
          }
        } catch { /* fall through */ }
        setPrefilling(false);
      }
      try {
        const res = await fetch("/api/cv-drafts");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.draft) {
            setDraft({ ...EMPTY_DRAFT, ...data.draft });
            return;
          }
        }
      } catch { /* fall through */ }
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) setDraft({ ...EMPTY_DRAFT, ...JSON.parse(raw) });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [fromCv]);

  // Persist draft
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
  }, [draft]);

  useEffect(() => {
    if (!session) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await fetch("/api/cv-drafts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft }),
        });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } catch { setSaveState("idle"); }
    }, 3000);
    return () => clearTimeout(t);
  }, [draft, session]);

  const updateDraft = <K extends keyof CvDraft>(key: K, value: CvDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const setCustomization = (id: string, value: string | boolean) => {
    setDraft((d) => ({ ...d, customization: { ...d.customization, [id]: value } }));
  };

  const canGoNext = useMemo(() => {
    switch (step) {
      case 1: return Boolean(draft.firstName && draft.lastName && draft.email);
      case 2: return true;
      case 3: return Boolean(draft.sector && draft.targetRole);
      case 4: return Boolean(draft.summary && draft.summary.length >= 40);
      case 5: return draft.experiences.length > 0;
      case 6: return draft.educations.length > 0;
      case 7: return draft.skills.length > 0 && draft.languages.length > 0;
      case 8: return true;
      default: return true;
    }
  }, [step, draft]);

  const goNext = () => setStep((s) => {
    const next = Math.min(9, (s + 1) as Step) as Step;
    track(EVT.CV_WIZARD_STEP, { from: s, to: next, sector: draft.sector });
    if (next === 9) loadPreview();
    return next;
  });
  const goPrev = () => setStep((s) => (Math.max(1, (s - 1) as Step)) as Step);

  const loadPreview = async () => {
    setPreviewLoading(true);
    setPreviewHtml(null);
    try {
      const res = await fetch("/api/cv-build/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        const html = await res.text();
        setPreviewHtml(html);
      }
    } catch { /* ignore — fallback to text preview */ }
    setPreviewLoading(false);
  };

  const polishField = useCallback(
    async (kind: "summary" | "bullet", payload: Record<string, unknown>) => {
      setPolishing(kind);
      track(EVT.CV_WIZARD_POLISH, { kind, sector: draft.sector });
      try {
        const res = await fetch("/api/cv-build/polish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, sector: draft.sector, targetRole: draft.targetRole, ...payload }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          let msg = "Erreur Claude";
          try { msg = JSON.parse(text).error ?? msg; } catch { /* empty body */ }
          throw new Error(msg);
        }
        return await res.json();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur Claude");
        return null;
      } finally { setPolishing(null); }
    },
    [draft.sector, draft.targetRole]
  );

  const polishSummary = async () => {
    const seedText = draft.summary.trim() ||
      `Candidat : ${draft.firstName || "Prénom"} ${draft.lastName || "Nom"}, poste visé : ${draft.targetRole || "non précisé"}, secteur : ${draft.sector}.`;
    const data = await polishField("summary", { text: seedText });
    if (data?.text) updateDraft("summary", data.text as string);
  };

  const polishBullet = async (expIdx: number, bulletIdx: number) => {
    const exp = draft.experiences[expIdx];
    if (!exp) return;
    const text = exp.bullets[bulletIdx];
    if (!text?.trim()) { toast.error("Écris d'abord le bullet"); return; }
    const data = await polishField("bullet", { text, role: exp.title, company: exp.company });
    if (data?.text) {
      const nextExps = [...draft.experiences];
      const nextBullets = [...exp.bullets];
      nextBullets[bulletIdx] = data.text as string;
      nextExps[expIdx] = { ...exp, bullets: nextBullets };
      updateDraft("experiences", nextExps);
    }
  };

  const uploadPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Format image seulement"); return; }
    const reader = new FileReader();
    reader.onload = () => updateDraft("photoUrl", reader.result as string);
    reader.readAsDataURL(file);
  };

  const importFromLinkedIn = async () => {
    if (!linkedinText.trim() || linkedinText.trim().length < 50) {
      toast.error("Colle un texte LinkedIn plus long (min 50 caractères)");
      return;
    }
    setLinkedinImporting(true);
    try {
      const res = await fetch("/api/cv-build/linkedin-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedinText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Erreur" }));
        throw new Error((data as { error?: string }).error ?? "Erreur import");
      }
      const extract = await res.json() as LinkedInExtract;

      // Merge into draft — only overwrite non-empty extracted fields
      setDraft((d) => {
        const merged = { ...d };
        if (extract.firstName) merged.firstName = extract.firstName;
        if (extract.lastName) merged.lastName = extract.lastName;
        if (extract.city) merged.city = extract.city;
        if (extract.linkedin) merged.linkedIn = extract.linkedin;
        if (extract.role) merged.targetRole = extract.role;
        if (extract.summary) merged.summary = extract.summary;
        if (extract.skills?.length) merged.skills = [...new Set([...d.skills, ...extract.skills])];
        if (extract.experiences?.length) {
          merged.experiences = extract.experiences.map((e, i) => ({
            id: `li_exp_${i}_${Date.now()}`,
            title: e.title ?? "",
            company: e.company ?? "",
            location: e.location ?? "",
            startDate: e.startDate ?? "",
            endDate: e.endDate ?? "",
            current: /présent|en cours|present|current/i.test(e.endDate ?? ""),
            bullets: e.description ? [e.description] : [""],
          }));
        }
        if (extract.educations?.length) {
          merged.educations = extract.educations.map((edu, i) => ({
            id: `li_edu_${i}_${Date.now()}`,
            degree: edu.degree ?? "",
            school: edu.school ?? "",
            location: edu.location ?? "",
            startDate: edu.startDate ?? "",
            endDate: edu.endDate ?? "",
            mention: "",
          }));
        }
        if (extract.languages?.length) {
          const mapped: LanguageEntry[] = extract.languages.map((l, i) => ({
            id: `li_lang_${i}_${Date.now()}`,
            name: l.name ?? "",
            level: (["A1","A2","B1","B2","C1","C2","Natif"].includes(l.level ?? "") ? l.level : "B2") as LanguageEntry["level"],
          }));
          merged.languages = mapped;
        }
        return merged;
      });
      toast.success("LinkedIn importé ! Vérifie les informations.");
      setLinkedinPanelOpen(false);
      setLinkedinText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur import LinkedIn");
    } finally {
      setLinkedinImporting(false);
    }
  };

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/cv-build/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let msg = "Erreur génération PDF";
        try { msg = JSON.parse(text).error ?? msg; } catch { /* empty/html body */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CV_${draft.lastName || "seora"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      track(EVT.CV_WIZARD_PDF, { sector: draft.sector, hasPhoto: Boolean(draft.photoUrl) });
      toast.success("CV PDF généré ✨");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally { setGenerating(false); }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const stepMeta: Record<Step, { icon: typeof User; title: string; hint: string }> = {
    1: { icon: User, title: "Tes coordonnées", hint: "Prénom, nom, email, téléphone, ville." },
    2: { icon: Camera, title: "Ta photo", hint: "Facultatif selon ton secteur." },
    3: { icon: Briefcase, title: "Ton secteur et poste visé", hint: "Conditionne le template et les mots-clés du secteur." },
    4: { icon: Sparkles, title: "Ton accroche pro", hint: "2-3 phrases percutantes. L'IA peut l'améliorer pour toi." },
    5: { icon: Briefcase, title: "Tes expériences", hint: "Avec impact chiffré. L'IA reformule les bullets." },
    6: { icon: GraduationCap, title: "Tes formations", hint: "Diplômes, mentions, années." },
    7: { icon: Wrench, title: "Compétences + langues", hint: "Skills techniques + langues avec niveau CECRL." },
    8: { icon: Palette, title: "Personnalise ton CV", hint: "Couleur, police, fond, bords, densité — à toi de jouer." },
    9: { icon: FileDown, title: "Preview + génération PDF", hint: "Aperçu en direct + téléchargement." },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div className="text-[10px] uppercase tracking-widest font-bold">
            {prefilling ? (
              <span className="inline-flex items-center gap-1 text-emerald-700"><Loader2 className="h-3 w-3 animate-spin" /> Pré-remplissage…</span>
            ) : saveState === "saving" ? (
              <span className="inline-flex items-center gap-1 text-gray-400"><Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde…</span>
            ) : saveState === "saved" ? (
              <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" /> Sauvegardé</span>
            ) : (
              <span className="text-gray-300">Autosave activé</span>
            )}
          </div>
        </div>

        {/* Progress rail */}
        <div className="mb-8">
          <div className="flex items-center gap-1">
            {([1, 2, 3, 4, 5, 6, 7, 8, 9] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-gradient-to-r from-emerald-500 to-teal-600" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
            <span>Étape {step} / 9</span>
            <span>{Math.round((step / 9) * 100)}%</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-3">
            {(() => { const Icon = stepMeta[step].icon; return <Icon className="h-3.5 w-3.5" />; })()}
            Étape {step}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{stepMeta[step].title}</h1>
          <p className="text-sm text-gray-500 mt-1">{stepMeta[step].hint}</p>
        </div>

        {/* Step body */}
        <div className="rounded-3xl bg-white shadow-xl border border-emerald-100 p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              {/* LinkedIn import panel */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setLinkedinPanelOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    Importer depuis LinkedIn
                  </span>
                  {linkedinPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {linkedinPanelOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-indigo-100 pt-3">
                    <p className="text-xs text-indigo-600">
                      Ouvre ton profil LinkedIn, sélectionne tout le texte de la page (Ctrl+A) et colle-le ici.
                    </p>
                    <textarea
                      value={linkedinText}
                      onChange={(e) => setLinkedinText(e.target.value)}
                      rows={5}
                      placeholder="Colle ici le texte de ton profil LinkedIn (Résumé, Expériences, Formation...)"
                      className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={importFromLinkedIn}
                      disabled={linkedinImporting || linkedinText.trim().length < 50}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {linkedinImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {linkedinImporting ? "Import en cours…" : "Importer"}
                    </button>
                  </div>
                )}
              </div>

              {/* Existing fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldInput label="Prénom *" value={draft.firstName} onChange={(v) => updateDraft("firstName", v)} placeholder="Marie" />
                <FieldInput label="Nom *" value={draft.lastName} onChange={(v) => updateDraft("lastName", v)} placeholder="Martin" />
                <FieldInput label="Email *" value={draft.email} onChange={(v) => updateDraft("email", v)} placeholder="marie.martin@email.com" type="email" />
                <FieldInput label="Téléphone" value={draft.phone} onChange={(v) => updateDraft("phone", v)} placeholder="06 12 34 56 78" />
                <FieldInput label="Ville" value={draft.city} onChange={(v) => updateDraft("city", v)} placeholder="Paris" />
                <FieldInput label="LinkedIn (url)" value={draft.linkedIn} onChange={(v) => updateDraft("linkedIn", v)} placeholder="linkedin.com/in/marie-martin" />
                <div className="sm:col-span-2">
                  <FieldInput label="Portfolio / site perso" value={draft.portfolio} onChange={(v) => updateDraft("portfolio", v)} placeholder="marie.dev" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <PhotoStep
              photoUrl={draft.photoUrl}
              onPhotoChange={(url) => updateDraft("photoUrl", url)}
            />
          )}

          {step === 3 && (
            <div className="space-y-5">
              <OfferAnalyzer
                offerText={draft.offerText}
                offerKeywords={draft.offerKeywords}
                onResult={(sector, jobTitle, keywords, offerText) => {
                  updateDraft("sector", sector as CvSectorKey);
                  updateDraft("targetRole", jobTitle);
                  updateDraft("offerKeywords", keywords);
                  updateDraft("offerText", offerText);
                }}
              />
              <div>
                <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Secteur cible *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CV_SECTOR_LIST.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => updateDraft("sector", s.key)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold border transition-colors text-left ${
                        draft.sector === s.key
                          ? "bg-emerald-100 border-emerald-500 text-emerald-900"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <FieldInput label="Poste visé *" value={draft.targetRole} onChange={(v) => updateDraft("targetRole", v)} placeholder="Analyste financier junior" />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {/* IA generate / improve CTA */}
              <div className="rounded-2xl bg-gradient-to-r from-pink-50 to-violet-50 border border-pink-100 p-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 shadow-sm">
                  <Wand2 className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">
                    {draft.summary.trim() ? "L'IA retravaille ton accroche" : "L'IA écrit ton accroche à ta place"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {draft.summary.trim()
                      ? "Elle la rend plus percutante, ATS-friendly et adaptée à ton secteur."
                      : "Clique ci-dessous — elle génère 2-3 phrases pro à partir de ton profil, sans rien écrire."}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 italic">
                    Ex : &quot;Business developer avec 5 ans d&apos;expérience en SaaS B2B. Spécialisé en acquisition grand compte, j&apos;ai dépassé mes objectifs de 35 % en 2023. Orienté résultats, je cherche à rejoindre une scale-up ambitieuse.&quot;
                  </p>
                </div>
                <button
                  onClick={polishSummary}
                  disabled={polishing === "summary"}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-white px-4 py-2 text-xs font-bold shadow hover:shadow-md transition-shadow disabled:opacity-50"
                >
                  {polishing === "summary" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {draft.summary.trim() ? "Améliorer" : "Générer"}
                </button>
              </div>

              {/* Textarea */}
              <textarea
                value={draft.summary}
                onChange={(e) => updateDraft("summary", e.target.value)}
                rows={6}
                placeholder="Décris-toi en 2-3 phrases : ton expérience, ta spécialité, et ce que tu apportes. L'IA peut aussi le faire pour toi →"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 resize-none transition-colors"
              />
              <p className="text-[11px] text-gray-400">{draft.summary.length} / 500 caractères — min. 40</p>
            </div>
          )}

          {step === 5 && (
            <ExperiencesEditor
              experiences={draft.experiences}
              setExperiences={(exps) => updateDraft("experiences", exps)}
              polishing={polishing}
              onPolish={polishBullet}
            />
          )}

          {step === 6 && (
            <EducationsEditor
              educations={draft.educations}
              setEducations={(edu) => updateDraft("educations", edu)}
            />
          )}

          {step === 7 && (
            <SkillsLanguagesEditor
              skills={draft.skills}
              setSkills={(s) => updateDraft("skills", s)}
              languages={draft.languages}
              setLanguages={(l) => updateDraft("languages", l)}
              interests={draft.interests}
              setInterests={(i) => updateDraft("interests", i)}
              offerKeywords={draft.offerKeywords}
            />
          )}

          {step === 8 && (
            <CustomizationStep
              choices={draft.customization}
              onChange={setCustomization}
            />
          )}

          {step === 9 && (
            <CvPreview
              draft={draft}
              previewHtml={previewHtml}
              previewLoading={previewLoading}
              onRefreshPreview={loadPreview}
              onDownload={generatePdf}
              generating={generating}
            />
          )}
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={goPrev}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </button>
          {step < 9 ? (
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 text-sm font-bold shadow-md hover:shadow-lg transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continuer
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={generatePdf}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 text-sm font-bold shadow-md hover:shadow-lg transition-shadow disabled:opacity-40"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Télécharger mon CV PDF
            </button>
          )}
        </div>

        {!session && (
          <p className="text-center text-xs text-gray-400 mt-6">
            Ton brouillon est sauvegardé localement dans ton navigateur.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldInput({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
      />
    </div>
  );
}

// ─── Experiences ──────────────────────────────────────────────────────────────

function ExperiencesEditor({
  experiences, setExperiences, polishing, onPolish,
}: {
  experiences: Experience[];
  setExperiences: (e: Experience[]) => void;
  polishing: string | null;
  onPolish: (expIdx: number, bulletIdx: number) => void;
}) {
  const add = () =>
    setExperiences([
      ...experiences,
      { id: crypto.randomUUID(), title: "", company: "", location: "", startDate: "", endDate: "", current: false, bullets: [""] },
    ]);
  const remove = (id: string) => setExperiences(experiences.filter((e) => e.id !== id));
  const update = (id: string, patch: Partial<Experience>) =>
    setExperiences(experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-4">
      {experiences.map((exp, i) => (
        <div key={exp.id} className="rounded-2xl border border-gray-200 p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Expérience {i + 1}</p>
            <button onClick={() => remove(exp.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Supprimer
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <FieldInput label="Poste" value={exp.title} onChange={(v) => update(exp.id, { title: v })} placeholder="Analyste financier" />
            <FieldInput label="Entreprise" value={exp.company} onChange={(v) => update(exp.id, { company: v })} placeholder="Société Générale" />
            <FieldInput label="Ville" value={exp.location} onChange={(v) => update(exp.id, { location: v })} placeholder="Paris" />
            <div className="grid grid-cols-2 gap-2">
              <FieldInput label="Début" value={exp.startDate} onChange={(v) => update(exp.id, { startDate: v })} placeholder="Sept 2024" />
              <FieldInput label="Fin" value={exp.endDate} onChange={(v) => update(exp.id, { endDate: v })} placeholder="En cours" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Missions (bullets)</p>
            {exp.bullets.map((b, bi) => (
              <div key={bi} className="flex gap-2">
                <textarea
                  value={b}
                  onChange={(e) => {
                    const next = [...exp.bullets];
                    next[bi] = e.target.value;
                    update(exp.id, { bullets: next });
                  }}
                  rows={2}
                  placeholder="Ex : Réalisé le reporting mensuel du portefeuille clients (30 M€ d'encours)"
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none transition-colors"
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onPolish(i, bi)}
                    disabled={polishing === "bullet"}
                    className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-2.5 py-1.5 text-[10px] font-bold hover:shadow-md transition-shadow disabled:opacity-50"
                    title="Améliorer avec l'IA"
                  >
                    {polishing === "bullet" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => {
                      const next = exp.bullets.filter((_, x) => x !== bi);
                      update(exp.id, { bullets: next.length ? next : [""] });
                    }}
                    className="rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 px-2.5 py-1.5 text-[10px]"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => update(exp.id, { bullets: [...exp.bullets, ""] })}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Ajouter un bullet
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="w-full rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 py-3 text-sm font-bold text-emerald-700 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" /> Ajouter une expérience
      </button>
    </div>
  );
}

// ─── Educations ───────────────────────────────────────────────────────────────

function EducationsEditor({
  educations, setEducations,
}: {
  educations: Education[];
  setEducations: (e: Education[]) => void;
}) {
  const add = () =>
    setEducations([
      ...educations,
      { id: crypto.randomUUID(), degree: "", school: "", location: "", startDate: "", endDate: "", mention: "" },
    ]);
  const remove = (id: string) => setEducations(educations.filter((e) => e.id !== id));
  const update = (id: string, patch: Partial<Education>) =>
    setEducations(educations.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-4">
      {educations.map((edu, i) => (
        <div key={edu.id} className="rounded-2xl border border-gray-200 p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Formation {i + 1}</p>
            <button onClick={() => remove(edu.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Supprimer
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldInput label="Diplôme" value={edu.degree} onChange={(v) => update(edu.id, { degree: v })} placeholder="Master Gestion de Patrimoine" />
            <FieldInput label="Établissement" value={edu.school} onChange={(v) => update(edu.id, { school: v })} placeholder="Financia Business School" />
            <FieldInput label="Ville" value={edu.location} onChange={(v) => update(edu.id, { location: v })} placeholder="Paris" />
            <FieldInput label="Mention" value={edu.mention ?? ""} onChange={(v) => update(edu.id, { mention: v })} placeholder="Bien / Très Bien" />
            <FieldInput label="Début" value={edu.startDate} onChange={(v) => update(edu.id, { startDate: v })} placeholder="2024" />
            <FieldInput label="Fin" value={edu.endDate} onChange={(v) => update(edu.id, { endDate: v })} placeholder="2026" />
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="w-full rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 py-3 text-sm font-bold text-emerald-700 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" /> Ajouter une formation
      </button>
    </div>
  );
}

// ─── Offer Analyzer ──────────────────────────────────────────────────────────

function OfferAnalyzer({
  offerText,
  offerKeywords,
  onResult,
}: {
  offerText: string;
  offerKeywords: string[];
  onResult: (sector: string, jobTitle: string, keywords: string[], offerText: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(offerText);
  const [analyzing, setAnalyzing] = useState(false);
  const analyzed = offerKeywords.length > 0;

  const handleAnalyze = async () => {
    if (!text.trim() || text.length < 50) {
      toast.error("Colle le texte complet de l'offre (min. 50 caractères)");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/cv-build/analyze-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerText: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'analyse");
      onResult(data.sector, data.jobTitle, data.keywords, text);
      setOpen(false);
      toast.success("Offre analysée — secteur et poste auto-remplis !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-violet-50/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-indigo-50/60 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span>
            <span className="block text-sm font-bold text-gray-800">
              {analyzed ? "Offre analysée ✓" : "Analyser une offre d'emploi"}
            </span>
            <span className="block text-[11px] text-gray-500">
              {analyzed
                ? `${offerKeywords.length} compétences clés extraites — gratuit`
                : "Colle l'offre → secteur et mots-clés auto-remplis — gratuit"}
            </span>
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {analyzed && !open && (
        <div className="border-t border-indigo-100 px-4 pb-3 pt-2 flex flex-wrap gap-1.5">
          {offerKeywords.map((kw) => (
            <span key={kw} className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
              {kw}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="border-t border-indigo-100 px-4 py-4 flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Colle ici le texte complet de l'offre d'emploi (description du poste, missions, profil recherché, compétences requises…)"
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || !text.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Analyser avec l&apos;IA →</>
            )}
          </button>
          <p className="text-center text-[11px] text-gray-400">
            Gratuit · Extrait secteur, intitulé de poste et compétences clés · Aucun token débité
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Skills + Languages ───────────────────────────────────────────────────────

function SkillsLanguagesEditor({
  skills, setSkills, languages, setLanguages, interests, setInterests, offerKeywords = [],
}: {
  skills: string[];
  setSkills: (s: string[]) => void;
  languages: LanguageEntry[];
  setLanguages: (l: LanguageEntry[]) => void;
  interests: string[];
  setInterests: (i: string[]) => void;
  offerKeywords?: string[];
}) {
  const [skillDraft, setSkillDraft] = useState("");
  const [interestDraft, setInterestDraft] = useState("");
  const [langDraft, setLangDraft] = useState<{ name: string; level: LanguageEntry["level"] }>({ name: "", level: "B2" });

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 flex items-center gap-1">
          <Wrench className="h-3 w-3" /> Compétences techniques
        </label>
        {offerKeywords.filter((kw) => !skills.includes(kw)).length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
              Compétences clés de ton offre — clique pour ajouter
            </p>
            <div className="flex flex-wrap gap-1.5">
              {offerKeywords
                .filter((kw) => !skills.includes(kw))
                .map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setSkills([...skills, kw])}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    + {kw}
                  </button>
                ))}
            </div>
          </div>
        )}
        <div className="flex gap-2 mb-2">
          <input
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && skillDraft.trim()) { setSkills([...skills, skillDraft.trim()]); setSkillDraft(""); }
            }}
            placeholder="Excel avancé, Python, SQL..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            onClick={() => { if (skillDraft.trim()) { setSkills([...skills, skillDraft.trim()]); setSkillDraft(""); } }}
            className="rounded-xl bg-emerald-500 text-white px-3 py-2"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-xs font-medium">
              {s}
              <button onClick={() => setSkills(skills.filter((_, x) => x !== i))} className="hover:text-emerald-950">×</button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 flex items-center gap-1">
          <Languages className="h-3 w-3" /> Langues
        </label>
        <div className="flex gap-2 mb-2">
          <input
            value={langDraft.name}
            onChange={(e) => setLangDraft({ ...langDraft, name: e.target.value })}
            placeholder="Anglais"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <select
            value={langDraft.level}
            onChange={(e) => setLangDraft({ ...langDraft, level: e.target.value as LanguageEntry["level"] })}
            className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm outline-none focus:border-emerald-400"
          >
            {["A1", "A2", "B1", "B2", "C1", "C2", "Natif"].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button
            onClick={() => {
              if (langDraft.name.trim()) {
                setLanguages([...languages, { id: crypto.randomUUID(), name: langDraft.name.trim(), level: langDraft.level }]);
                setLangDraft({ name: "", level: "B2" });
              }
            }}
            className="rounded-xl bg-emerald-500 text-white px-3 py-2"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {languages.map((l) => (
            <span key={l.id} className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 rounded-full px-3 py-1 text-xs font-medium">
              {l.name} · {l.level}
              <button onClick={() => setLanguages(languages.filter((x) => x.id !== l.id))} className="hover:text-teal-950">×</button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 flex items-center gap-1">
          <Heart className="h-3 w-3" /> Centres d&apos;intérêt
        </label>
        <div className="flex gap-2 mb-2">
          <input
            value={interestDraft}
            onChange={(e) => setInterestDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && interestDraft.trim()) { setInterests([...interests, interestDraft.trim()]); setInterestDraft(""); }
            }}
            placeholder="Trail, Bénévolat, Photo..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-emerald-400"
          />
          <button
            onClick={() => { if (interestDraft.trim()) { setInterests([...interests, interestDraft.trim()]); setInterestDraft(""); } }}
            className="rounded-xl bg-emerald-500 text-white px-3 py-2"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {interests.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium">
              {s}
              <button onClick={() => setInterests(interests.filter((_, x) => x !== i))} className="hover:text-gray-900">×</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Customization step ───────────────────────────────────────────────────────

function CustomizationStep({
  choices,
  onChange,
}: {
  choices: Record<string, string | boolean>;
  onChange: (id: string, value: string | boolean) => void;
}) {
  const DEFAULTS: Record<string, string> = {
    accent: "#1A1A2E",
    font: "sans",
    background: "#ffffff",
    borderRadius: "0px",
    photoShape: "50%",
    density: "standard",
    nameSize: "22pt",
    accentUsage: "medium",
  };

  const get = (id: string) => choices[id] ?? DEFAULTS[id] ?? "";

  return (
    <div className="space-y-6">
      {CUSTOMIZATION_OPTIONS.map((opt) => (
        <div key={opt.id}>
          <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">{opt.label}</label>
          {opt.type === "palette" ? (
            <div className="flex flex-wrap gap-2">
              {opt.options.map((o) => (
                <button
                  key={String(o.value)}
                  onClick={() => onChange(opt.id, o.value)}
                  title={o.label}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    get(opt.id) === o.value ? "ring-2 ring-offset-2 ring-emerald-500 scale-110" : "border-gray-300"
                  }`}
                  style={{ background: String(o.value) === "#ffffff" ? "#f3f4f6" : String(o.value) }}
                >
                  {get(opt.id) === o.value && (
                    <Check className="h-3 w-3 mx-auto" style={{ color: String(o.value) === "#ffffff" || String(o.value) === "#FDFBF7" || String(o.value) === "#F9FAFB" ? "#111" : "#fff" }} />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {opt.options.map((o) => (
                <button
                  key={String(o.value)}
                  onClick={() => onChange(opt.id, o.value)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    get(opt.id) === o.value
                      ? "bg-emerald-100 border-emerald-500 text-emerald-900"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {o.label}
                  {"desc" in o && o.desc && <span className="text-[10px] text-gray-400 ml-1 hidden sm:inline">· {o.desc}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Preview step ─────────────────────────────────────────────────────────────

function CvPreview({
  draft,
  previewHtml,
  previewLoading,
  onRefreshPreview,
  onDownload,
  generating,
}: {
  draft: CvDraft;
  previewHtml: string | null;
  previewLoading: boolean;
  onRefreshPreview: () => void;
  onDownload: () => void;
  generating: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (previewHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml]);

  return (
    <div className="space-y-5">
      {/* Live preview */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-emerald-700 font-bold">Aperçu live</p>
          <button
            onClick={onRefreshPreview}
            disabled={previewLoading}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${previewLoading ? "animate-spin" : ""}`} />
            Rafraîchir
          </button>
        </div>
        <div className="rounded-2xl border border-emerald-100 overflow-hidden bg-gray-50" style={{ height: "500px" }}>
          {previewLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
          ) : previewHtml ? (
            <iframe
              ref={iframeRef}
              title="Aperçu CV"
              className="w-full h-full border-none"
              style={{ transform: "scale(0.58)", transformOrigin: "top left", width: "172%", height: "172%" }}
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
              <FileDown className="h-10 w-10" />
              <p className="text-sm">L&apos;aperçu se chargera automatiquement</p>
              <button
                onClick={onRefreshPreview}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold underline"
              >
                Charger l&apos;aperçu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Text recap */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4">
        <p className="text-xs uppercase tracking-widest text-emerald-700 font-bold mb-2">Récap</p>
        <div className="text-sm space-y-1">
          <p className="font-bold text-gray-900">{draft.firstName} {draft.lastName} · <span className="font-normal text-gray-600">{draft.targetRole}</span></p>
          <p className="text-gray-500 text-xs">{[draft.email, draft.phone, draft.city].filter(Boolean).join(" · ")}</p>
          <p className="text-gray-500 text-xs">{draft.experiences.length} expérience(s) · {draft.educations.length} formation(s) · {draft.skills.length} compétence(s)</p>
        </div>
      </div>

      <button
        onClick={onDownload}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-4 text-sm font-bold shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        {generating ? "Génération en cours..." : "Télécharger mon CV PDF"}
      </button>
      <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
        <Check className="h-3 w-3 text-emerald-500" />
        Template adapté à ton secteur · L'IA a retravaillé chaque ligne · Prêt à envoyer
      </div>

      {/* Cross-link cover letter */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-900">Complète ton dossier de candidature</p>
          <p className="text-xs text-emerald-700 mt-0.5">Génère une lettre de motivation assortie à ton CV — personnalisée selon le poste et l&apos;entreprise</p>
        </div>
        <Link
          href="/cover-letter"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-700 transition-colors"
        >
          <PenTool className="h-3.5 w-3.5" />
          Créer ma lettre
        </Link>
      </div>
    </div>
  );
}
