"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { CV_SECTOR_LIST, CvSectorKey } from "@/lib/cv-criteria";
import { track, EVT } from "@/lib/analytics";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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
};

const STORAGE_KEY = "seora_cv_builder_draft_v1";

export default function CvBuilderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCv = searchParams.get("fromCv");
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<CvDraft>(EMPTY_DRAFT);
  const [polishing, setPolishing] = useState<string | null>(null); // key currently being polished by Claude
  const [generating, setGenerating] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Auth gate — redirect to signin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/cv-builder");
    }
  }, [status, router]);

  // Load draft — priority: fromCv prefill > server autosave > localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (fromCv) {
        setPrefilling(true);
        try {
          const res = await fetch(`/api/cv-build/prefill?cvAnalysisId=${fromCv}`);
          const data = await res.json();
          if (!cancelled && res.ok && data.draft) {
            setDraft(data.draft as CvDraft);
            toast.success("CV pré-rempli depuis ton analyse");
            setPrefilling(false);
            return;
          }
        } catch {
          // fall through
        }
        setPrefilling(false);
      }
      // Try server autosave
      try {
        const res = await fetch("/api/cv-drafts");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.draft) {
            setDraft(data.draft as CvDraft);
            return;
          }
        }
      } catch {
        // fall through
      }
      // Fallback: localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) setDraft(JSON.parse(raw));
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [fromCv]);

  // Persist draft — localStorage instantly, server debounced 3s
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch { /* ignore */ }
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
      } catch {
        setSaveState("idle");
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [draft, session]);

  const updateDraft = <K extends keyof CvDraft>(key: K, value: CvDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const canGoNext = useMemo(() => {
    switch (step) {
      case 1:
        return Boolean(draft.firstName && draft.lastName && draft.email);
      case 2:
        return true; // photo is optional
      case 3:
        return Boolean(draft.sector && draft.targetRole);
      case 4:
        return Boolean(draft.summary && draft.summary.length >= 40);
      case 5:
        return draft.experiences.length > 0;
      case 6:
        return draft.educations.length > 0;
      case 7:
        return draft.skills.length > 0 && draft.languages.length > 0;
      default:
        return true;
    }
  }, [step, draft]);

  const goNext = () => setStep((s) => {
    const next = Math.min(8, (s + 1) as Step) as Step;
    track(EVT.CV_WIZARD_STEP, { from: s, to: next, sector: draft.sector });
    return next;
  });
  const goPrev = () => setStep((s) => (Math.max(1, (s - 1) as Step)) as Step);

  // Claude polish helper
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
        if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
        return await res.json();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur Claude");
        return null;
      } finally {
        setPolishing(null);
      }
    },
    [draft.sector, draft.targetRole]
  );

  const polishSummary = async () => {
    if (!draft.summary.trim()) {
      toast.error("Écris d'abord ton résumé, Claude va le repaufiner");
      return;
    }
    const data = await polishField("summary", { text: draft.summary });
    if (data?.text) updateDraft("summary", data.text as string);
  };

  const polishBullet = async (expIdx: number, bulletIdx: number) => {
    const exp = draft.experiences[expIdx];
    if (!exp) return;
    const text = exp.bullets[bulletIdx];
    if (!text || !text.trim()) {
      toast.error("Écris d'abord un bullet, Claude le repaufinera");
      return;
    }
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
    if (!file.type.startsWith("image/")) {
      toast.error("Format image seulement");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateDraft("photoUrl", reader.result as string);
    reader.readAsDataURL(file);
  };

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/cv-build/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur génération");
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
    } finally {
      setGenerating(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const stepMeta: Record<Step, { icon: typeof User; title: string; hint: string }> = {
    1: { icon: User, title: "Tes coordonnées", hint: "On commence par le simple : qui tu es et où te joindre." },
    2: { icon: Camera, title: "Ta photo", hint: "Facultatif dans certains secteurs. Tu peux uploader ou passer." },
    3: { icon: Briefcase, title: "Ton secteur et poste visé", hint: "Fondamental : ça conditionne le style et les mots-clés." },
    4: { icon: Sparkles, title: "Ton accroche pro", hint: "2-3 phrases qui te résument. Claude peut repaufiner." },
    5: { icon: Briefcase, title: "Tes expériences", hint: "Une par une, avec impact chiffré. Claude reformule les bullets." },
    6: { icon: GraduationCap, title: "Tes formations", hint: "Diplômes, mentions, années." },
    7: { icon: Wrench, title: "Compétences + langues", hint: "Skills techniques + langues avec niveau CECRL." },
    8: { icon: FileDown, title: "Preview + génération PDF", hint: "Récap complet + télécharge ton CV pro." },
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
          <div className="flex items-center gap-1.5">
            {([1, 2, 3, 4, 5, 6, 7, 8] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-gradient-to-r from-emerald-500 to-teal-600" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
            <span>Étape {step} / 8</span>
            <span>{Math.round((step / 8) * 100)}%</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-3">
            {(() => {
              const Icon = stepMeta[step].icon;
              return <Icon className="h-3.5 w-3.5" />;
            })()}
            Étape {step}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{stepMeta[step].title}</h1>
          <p className="text-sm text-gray-500 mt-1">{stepMeta[step].hint}</p>
        </div>

        {/* Step body */}
        <div className="rounded-3xl bg-white shadow-xl border border-emerald-100 p-6 sm:p-8">
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Prénom *" value={draft.firstName} onChange={(v) => updateDraft("firstName", v)} placeholder="Marie" />
              <FieldInput label="Nom *" value={draft.lastName} onChange={(v) => updateDraft("lastName", v)} placeholder="Martin" />
              <FieldInput label="Email *" value={draft.email} onChange={(v) => updateDraft("email", v)} placeholder="marie.martin@email.com" type="email" />
              <FieldInput label="Téléphone" value={draft.phone} onChange={(v) => updateDraft("phone", v)} placeholder="06 12 34 56 78" />
              <FieldInput label="Ville" value={draft.city} onChange={(v) => updateDraft("city", v)} placeholder="Paris" />
              <FieldInput label="LinkedIn (url)" value={draft.linkedIn} onChange={(v) => updateDraft("linkedIn", v)} placeholder="linkedin.com/in/marie-martin" />
              <div className="sm:col-span-2">
                <FieldInput label="Portfolio / site perso (url)" value={draft.portfolio} onChange={(v) => updateDraft("portfolio", v)} placeholder="marie.dev" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center gap-6">
              <div className="h-40 w-40 rounded-3xl bg-emerald-50 border-2 border-dashed border-emerald-300 flex items-center justify-center overflow-hidden">
                {draft.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.photoUrl} alt="Ta photo" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-10 w-10 text-emerald-300" />
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 text-sm font-bold transition-colors">
                  <Camera className="h-4 w-4" />
                  Uploader une photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPhoto(f);
                    }}
                  />
                </label>
                <Link
                  href="/photo-pro"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white px-5 py-3 text-sm font-bold shadow-md hover:shadow-lg transition-shadow"
                >
                  <Sparkles className="h-4 w-4" />
                  Générer une photo pro IA (upsell)
                </Link>
              </div>
              <button onClick={() => updateDraft("photoUrl", null)} className="text-xs text-gray-400 hover:text-gray-900 underline">
                Continuer sans photo
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
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
              <FieldInput label="Poste visé *" value={draft.targetRole} onChange={(v) => updateDraft("targetRole", v)} placeholder="Ex : Analyste financier junior" />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <textarea
                value={draft.summary}
                onChange={(e) => updateDraft("summary", e.target.value)}
                rows={6}
                placeholder="Ex : Étudiant en Master 2 Finance à Dauphine, alternant en banque privée à la Société Générale, passionné par la gestion de patrimoine..."
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none transition-colors"
              />
              <div className="flex justify-between items-center">
                <p className="text-[11px] text-gray-500">{draft.summary.length} / 500 caractères — min. 40</p>
                <button
                  onClick={polishSummary}
                  disabled={polishing === "summary"}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 text-xs font-bold hover:shadow-lg transition-shadow disabled:opacity-50"
                >
                  {polishing === "summary" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  Repaufiner avec Claude
                </button>
              </div>
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
            />
          )}

          {step === 8 && (
            <CvPreview draft={draft} onDownload={generatePdf} generating={generating} />
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
          {step < 8 ? (
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

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
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

function ExperiencesEditor({
  experiences,
  setExperiences,
  polishing,
  onPolish,
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
                    title="Repaufiner ce bullet avec Claude"
                  >
                    {polishing === "bullet" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => {
                      const next = exp.bullets.filter((_, x) => x !== bi);
                      update(exp.id, { bullets: next.length ? next : [""] });
                    }}
                    className="rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 px-2.5 py-1.5 text-[10px]"
                    title="Retirer"
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

function EducationsEditor({
  educations,
  setEducations,
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

function SkillsLanguagesEditor({
  skills,
  setSkills,
  languages,
  setLanguages,
  interests,
  setInterests,
}: {
  skills: string[];
  setSkills: (s: string[]) => void;
  languages: LanguageEntry[];
  setLanguages: (l: LanguageEntry[]) => void;
  interests: string[];
  setInterests: (i: string[]) => void;
}) {
  const [skillDraft, setSkillDraft] = useState("");
  const [interestDraft, setInterestDraft] = useState("");
  const [langDraft, setLangDraft] = useState<{ name: string; level: LanguageEntry["level"] }>({ name: "", level: "B2" });

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block flex items-center gap-1">
          <Wrench className="h-3 w-3" /> Compétences techniques
        </label>
        <div className="flex gap-2 mb-2">
          <input
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && skillDraft.trim()) {
                setSkills([...skills, skillDraft.trim()]);
                setSkillDraft("");
              }
            }}
            placeholder="Excel avancé, Python, SQL, VBA..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            onClick={() => {
              if (skillDraft.trim()) {
                setSkills([...skills, skillDraft.trim()]);
                setSkillDraft("");
              }
            }}
            className="rounded-xl bg-emerald-500 text-white px-3 py-2"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-xs font-medium">
              {s}
              <button onClick={() => setSkills(skills.filter((_, x) => x !== i))} className="hover:text-emerald-950">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block flex items-center gap-1">
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
            {["A1", "A2", "B1", "B2", "C1", "C2", "Natif"].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
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
              <button onClick={() => setLanguages(languages.filter((x) => x.id !== l.id))} className="hover:text-teal-950">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block flex items-center gap-1">
          <Heart className="h-3 w-3" /> Centres d&apos;intérêt
        </label>
        <div className="flex gap-2 mb-2">
          <input
            value={interestDraft}
            onChange={(e) => setInterestDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && interestDraft.trim()) {
                setInterests([...interests, interestDraft.trim()]);
                setInterestDraft("");
              }
            }}
            placeholder="Trail, Bénévolat Croix-Rouge, Photo argentique..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-emerald-400"
          />
          <button
            onClick={() => {
              if (interestDraft.trim()) {
                setInterests([...interests, interestDraft.trim()]);
                setInterestDraft("");
              }
            }}
            className="rounded-xl bg-emerald-500 text-white px-3 py-2"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {interests.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium">
              {s}
              <button onClick={() => setInterests(interests.filter((_, x) => x !== i))} className="hover:text-gray-900">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CvPreview({ draft, onDownload, generating }: { draft: CvDraft; onDownload: () => void; generating: boolean }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-5">
        <p className="text-xs uppercase tracking-widest text-emerald-700 font-bold mb-3">Ton CV en un coup d&apos;œil</p>
        <div className="text-sm space-y-3">
          <div>
            <p className="font-bold text-gray-900 text-lg">{draft.firstName} {draft.lastName}</p>
            <p className="text-gray-600 text-xs">{draft.targetRole}</p>
            <p className="text-gray-500 text-xs">{[draft.email, draft.phone, draft.city].filter(Boolean).join(" · ")}</p>
          </div>
          {draft.summary && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Résumé</p>
              <p className="text-xs text-gray-700 leading-relaxed">{draft.summary}</p>
            </div>
          )}
          {draft.experiences.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Expériences ({draft.experiences.length})</p>
              {draft.experiences.map((e) => (
                <div key={e.id} className="mt-1">
                  <p className="text-xs font-semibold text-gray-800">{e.title} · {e.company}</p>
                  <p className="text-[10px] text-gray-500">{e.startDate} – {e.endDate || (e.current ? "en cours" : "")}</p>
                </div>
              ))}
            </div>
          )}
          {draft.skills.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Compétences</p>
              <p className="text-xs text-gray-700">{draft.skills.join(" · ")}</p>
            </div>
          )}
          {draft.languages.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Langues</p>
              <p className="text-xs text-gray-700">{draft.languages.map((l) => `${l.name} (${l.level})`).join(" · ")}</p>
            </div>
          )}
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
        Template adapté à ton secteur · Claude a repaufiné les bullets · Optimisé ATS
      </div>
    </div>
  );
}
