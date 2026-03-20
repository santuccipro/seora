"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StructuredCV } from "@/lib/cv-types";
import {
  Download,
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Camera,
  Palette,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Globe,
  Briefcase,
  GraduationCap,
  Wrench,
  Languages,
  Heart,
  User,
  Sparkles,
} from "lucide-react";

const ACCENT_COLORS = [
  { name: "Indigo", value: "#4F46E5", bg: "#EEF2FF", light: "#E0E7FF" },
  { name: "Emerald", value: "#059669", bg: "#ECFDF5", light: "#D1FAE5" },
  { name: "Rose", value: "#E11D48", bg: "#FFF1F2", light: "#FFE4E6" },
  { name: "Slate", value: "#334155", bg: "#F8FAFC", light: "#F1F5F9" },
  { name: "Amber", value: "#D97706", bg: "#FFFBEB", light: "#FEF3C7" },
];

/* ─── Editable Text Component ─── */
function EditableText({
  value,
  onChange,
  className = "",
  multiline = false,
  placeholder = "Cliquer pour modifier...",
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);

  const handleBlur = () => {
    setEditing(false);
    const text = ref.current?.innerText || "";
    if (text !== value) onChange(text);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setEditing(true)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      style={style}
      className={`outline-none transition-all rounded px-0.5 -mx-0.5 ${
        editing
          ? "ring-2 ring-blue-300 bg-blue-50/50"
          : "hover:bg-gray-100/60 cursor-text"
      } ${!value ? "text-gray-400 italic" : ""} ${className}`}
      dangerouslySetInnerHTML={{ __html: value || placeholder }}
    />
  );
}

/* ─── Main Editor Page ─── */
export default function CVEditorPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const analysisId = searchParams.get("id");

  const [cv, setCv] = useState<StructuredCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [accent, setAccent] = useState(ACCENT_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const cvRef = useRef<HTMLDivElement>(null);

  // Load structured CV data
  useEffect(() => {
    if (!analysisId) {
      toast.error("Aucune analyse trouvée");
      router.push("/app");
      return;
    }

    fetch("/api/cv-editor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.structuredCV) {
          setCv(data.structuredCV);
        } else {
          toast.error(data.error || "Erreur");
          router.push("/app");
        }
      })
      .catch(() => toast.error("Erreur réseau"))
      .finally(() => setLoading(false));
  }, [analysisId, router]);

  // Update helpers
  const updateHeader = useCallback(
    (field: string, value: string) => {
      setCv((prev) => prev ? { ...prev, header: { ...prev.header, [field]: value } } : prev);
    },
    []
  );

  const updateExperience = useCallback(
    (idx: number, field: string, value: string | string[]) => {
      setCv((prev) => {
        if (!prev) return prev;
        const exps = [...prev.experiences];
        exps[idx] = { ...exps[idx], [field]: value };
        return { ...prev, experiences: exps };
      });
    },
    []
  );

  const updateEducation = useCallback(
    (idx: number, field: string, value: string) => {
      setCv((prev) => {
        if (!prev) return prev;
        const edus = [...prev.education];
        edus[idx] = { ...edus[idx], [field]: value };
        return { ...prev, education: edus };
      });
    },
    []
  );

  const updateSkillItems = useCallback(
    (catIdx: number, items: string[]) => {
      setCv((prev) => {
        if (!prev) return prev;
        const skills = [...prev.skills];
        skills[catIdx] = { ...skills[catIdx], items };
        return { ...prev, skills };
      });
    },
    []
  );

  // Photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Resize to 300x300 max
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height, 300);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
        updateHeader("photoUrl", canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // PDF Export
  const handleExport = async () => {
    if (!cvRef.current) return;
    setExporting(true);
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = await import("jspdf");

      // Temporarily scroll to top and ensure full element is visible
      const el = cvRef.current;
      const originalScroll = window.scrollY;
      window.scrollTo(0, 0);

      // Wait a tick for scroll to settle
      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      window.scrollTo(0, originalScroll);

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "JPEG", 0, 0, w, h);
      const name = cv?.header
        ? `CV_${cv.header.firstName}_${cv.header.lastName}.pdf`
        : "CV_Seora.pdf";
      pdf.save(name);
      toast.success("CV exporté en PDF !");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Génération de ton CV amélioré...</p>
          <p className="mt-1 text-xs text-gray-400">L&apos;IA restructure et optimise ton contenu</p>
        </div>
      </div>
    );
  }

  if (!cv) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ─── Toolbar ─── */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/app")}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-gray-900">Éditeur de CV</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Color picker */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <div className="h-4 w-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: accent.value }} />
                <Palette className="h-3.5 w-3.5" />
              </button>
              {showColorPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg p-2 flex gap-1.5 z-50">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => { setAccent(c); setShowColorPicker(false); }}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        accent.name === c.name ? "border-gray-900 scale-110" : "border-white hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Photo upload */}
            <label className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors">
              <Camera className="h-3.5 w-3.5" />
              Photo
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all"
              style={{ backgroundColor: accent.value }}
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {exporting ? "Export..." : "Exporter PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* ─── CV Preview ─── */}
      <div className="py-8 px-4 flex justify-center">
        <div className="w-full max-w-[210mm] shadow-2xl shadow-gray-300/50 rounded-lg overflow-hidden">
          <div
            ref={cvRef}
            id="cv-preview"
            className="bg-white w-full"
            style={{ aspectRatio: "1/1.414", padding: "40px 44px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}
          >
            {/* Header */}
            <div className="flex gap-5 items-start mb-5">
              {/* Photo */}
              <div className="shrink-0">
                {cv.header.photoUrl ? (
                  <div className="relative group">
                    <img
                      src={cv.header.photoUrl}
                      alt="Photo"
                      className="w-20 h-20 rounded-full object-cover border-2"
                      style={{ borderColor: accent.value }}
                    />
                    <button
                      onClick={() => updateHeader("photoUrl", "")}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors group">
                    <Camera className="h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                )}
              </div>

              {/* Name & title */}
              <div className="flex-1 min-w-0">
                <div className="flex gap-2">
                  <EditableText
                    value={cv.header.firstName}
                    onChange={(v) => updateHeader("firstName", v)}
                    className="text-2xl font-bold text-gray-900 leading-tight"
                  />
                  <EditableText
                    value={cv.header.lastName}
                    onChange={(v) => updateHeader("lastName", v)}
                    className="text-2xl font-bold leading-tight"
                    style={{ color: accent.value }}
                  />
                </div>
                <EditableText
                  value={cv.header.title}
                  onChange={(v) => updateHeader("title", v)}
                  className="text-sm font-medium mt-1"
                  style={{ color: accent.value }}
                />

                {/* Contact row */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                  {cv.header.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" style={{ color: accent.value }} />
                      <EditableText value={cv.header.email} onChange={(v) => updateHeader("email", v)} className="text-xs" />
                    </span>
                  )}
                  {cv.header.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" style={{ color: accent.value }} />
                      <EditableText value={cv.header.phone} onChange={(v) => updateHeader("phone", v)} className="text-xs" />
                    </span>
                  )}
                  {cv.header.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" style={{ color: accent.value }} />
                      <EditableText value={cv.header.location} onChange={(v) => updateHeader("location", v)} className="text-xs" />
                    </span>
                  )}
                  {cv.header.linkedin && (
                    <span className="flex items-center gap-1">
                      <Linkedin className="h-3 w-3" style={{ color: accent.value }} />
                      <EditableText value={cv.header.linkedin} onChange={(v) => updateHeader("linkedin", v)} className="text-xs" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="h-0.5 rounded-full mb-4" style={{ backgroundColor: accent.value }} />

            {/* Summary */}
            {cv.summary && (
              <div className="mb-4">
                <SectionTitle icon={User} label="Profil" accent={accent.value} />
                <EditableText
                  value={cv.summary}
                  onChange={(v) => setCv((prev) => prev ? { ...prev, summary: v } : prev)}
                  className="text-xs text-gray-700 leading-relaxed"
                  multiline
                />
              </div>
            )}

            <div className="flex gap-6">
              {/* ─── Left column: Experiences + Education ─── */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Experiences */}
                {cv.experiences.length > 0 && (
                  <div>
                    <SectionTitle icon={Briefcase} label="Expériences" accent={accent.value} />
                    <div className="space-y-3">
                      {cv.experiences.map((exp, i) => (
                        <div key={exp.id} className="group relative">
                          <div className="flex items-baseline justify-between gap-2">
                            <EditableText
                              value={exp.position}
                              onChange={(v) => updateExperience(i, "position", v)}
                              className="text-xs font-bold text-gray-900"
                            />
                            <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                              <EditableText
                                value={`${exp.startDate} – ${exp.endDate}`}
                                onChange={(v) => {
                                  const parts = v.split("–").map((s) => s.trim());
                                  updateExperience(i, "startDate", parts[0] || "");
                                  updateExperience(i, "endDate", parts[1] || "");
                                }}
                                className="text-[10px] text-gray-400"
                              />
                            </span>
                          </div>
                          <EditableText
                            value={exp.company + (exp.location ? ` · ${exp.location}` : "")}
                            onChange={(v) => {
                              const parts = v.split("·").map((s) => s.trim());
                              updateExperience(i, "company", parts[0]);
                              if (parts[1]) updateExperience(i, "location", parts[1]);
                            }}
                            className="text-[10px] font-medium"
                            style={{ color: accent.value }}
                          />
                          <ul className="mt-1 space-y-0.5">
                            {exp.bullets.map((bullet, bi) => (
                              <li key={bi} className="flex gap-1.5 group/bullet">
                                <span className="text-[10px] mt-0.5 shrink-0" style={{ color: accent.value }}>●</span>
                                <EditableText
                                  value={bullet}
                                  onChange={(v) => {
                                    const newBullets = [...exp.bullets];
                                    newBullets[bi] = v;
                                    updateExperience(i, "bullets", newBullets);
                                  }}
                                  className="text-[10px] text-gray-700 leading-relaxed flex-1"
                                />
                                <button
                                  onClick={() => {
                                    const newBullets = exp.bullets.filter((_, j) => j !== bi);
                                    updateExperience(i, "bullets", newBullets);
                                  }}
                                  className="opacity-0 group-hover/bullet:opacity-100 text-red-400 hover:text-red-600 shrink-0"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => {
                              updateExperience(i, "bullets", [...exp.bullets, "Nouvelle réalisation..."]);
                            }}
                            className="mt-0.5 flex items-center gap-0.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: accent.value }}
                          >
                            <Plus className="h-3 w-3" /> Ajouter
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {cv.education.length > 0 && (
                  <div>
                    <SectionTitle icon={GraduationCap} label="Formation" accent={accent.value} />
                    <div className="space-y-2">
                      {cv.education.map((edu, i) => (
                        <div key={edu.id}>
                          <div className="flex items-baseline justify-between gap-2">
                            <EditableText
                              value={edu.degree}
                              onChange={(v) => updateEducation(i, "degree", v)}
                              className="text-xs font-bold text-gray-900"
                            />
                            <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                              {edu.startDate} – {edu.endDate}
                            </span>
                          </div>
                          <EditableText
                            value={edu.school}
                            onChange={(v) => updateEducation(i, "school", v)}
                            className="text-[10px] font-medium"
                            style={{ color: accent.value }}
                          />
                          {edu.description && (
                            <EditableText
                              value={edu.description}
                              onChange={(v) => updateEducation(i, "description", v)}
                              className="text-[10px] text-gray-500 mt-0.5"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Right column: Skills, Languages, Interests ─── */}
              <div className="w-[35%] shrink-0 space-y-4">
                {/* Skills */}
                {cv.skills.length > 0 && (
                  <div>
                    <SectionTitle icon={Wrench} label="Compétences" accent={accent.value} />
                    <div className="space-y-2">
                      {cv.skills.map((cat, ci) => (
                        <div key={ci}>
                          <EditableText
                            value={cat.category}
                            onChange={(v) => {
                              setCv((prev) => {
                                if (!prev) return prev;
                                const skills = [...prev.skills];
                                skills[ci] = { ...skills[ci], category: v };
                                return { ...prev, skills };
                              });
                            }}
                            className="text-[10px] font-bold text-gray-800"
                          />
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {cat.items.map((item, ii) => (
                              <span
                                key={ii}
                                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-medium group/skill"
                                style={{ backgroundColor: accent.light, color: accent.value }}
                              >
                                <EditableText
                                  value={item}
                                  onChange={(v) => {
                                    const newItems = [...cat.items];
                                    newItems[ii] = v;
                                    updateSkillItems(ci, newItems);
                                  }}
                                  className="text-[9px]"
                                />
                                <button
                                  onClick={() => updateSkillItems(ci, cat.items.filter((_, j) => j !== ii))}
                                  className="opacity-0 group-hover/skill:opacity-100"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                            <button
                              onClick={() => updateSkillItems(ci, [...cat.items, "Nouvelle"])}
                              className="rounded-full px-1.5 py-0.5 text-[9px] border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {cv.languages.length > 0 && (
                  <div>
                    <SectionTitle icon={Languages} label="Langues" accent={accent.value} />
                    <div className="space-y-1">
                      {cv.languages.map((lang, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <EditableText
                            value={lang.name}
                            onChange={(v) => {
                              setCv((prev) => {
                                if (!prev) return prev;
                                const langs = [...prev.languages];
                                langs[i] = { ...langs[i], name: v };
                                return { ...prev, languages: langs };
                              });
                            }}
                            className="text-[10px] text-gray-700"
                          />
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                            style={{ backgroundColor: accent.light, color: accent.value }}
                          >
                            {lang.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {cv.interests && cv.interests.length > 0 && (
                  <div>
                    <SectionTitle icon={Heart} label="Centres d'intérêt" accent={accent.value} />
                    <div className="flex flex-wrap gap-1">
                      {cv.interests.map((interest, i) => (
                        <span
                          key={i}
                          className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                          style={{ backgroundColor: accent.bg, color: accent.value }}
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section Title Component ─── */
function SectionTitle({
  icon: Icon,
  label,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>
        {label}
      </h3>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}
