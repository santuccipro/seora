"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { StructuredCV, CVTheme, CVThemeId } from "@/lib/cv-types";
import { CV_THEMES, getThemeForSector } from "@/lib/cv-types";
import {
  Download,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  X,
  Camera,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Briefcase,
  GraduationCap,
  Wrench,
  Languages,
  Heart,
  User,
  Sparkles,
  ChevronDown,
  Trash2,
  Palette,
  Check,
  Eye,
} from "lucide-react";
import ProgressBar from "@/components/cv-wizard/progress-bar";
import {
  StepContact,
  StepProfile,
  StepSkills,
  StepExperiences,
  StepEducation,
  StepLanguagesInterests,
  StepStyle,
  type CustomColors,
} from "@/components/cv-wizard/steps";

const TOTAL_STEPS = 7;

/* ─── Inline Editable Field (for preview/edit mode) ─── */
function EditField({
  value,
  onChange,
  className = "",
  multiline = false,
  placeholder = "Modifier...",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (ref.current && !active) {
      ref.current.innerText = value || placeholder;
    }
  }, [value, placeholder, active]);

  const handleBlur = () => {
    setActive(false);
    const text = ref.current?.innerText || "";
    if (text !== value) onChange(text);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setActive(true)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      className={`outline-none transition-all rounded-lg ${
        active
          ? "ring-2 ring-indigo-300 bg-indigo-50/50 px-2 py-1 -mx-2"
          : "hover:bg-gray-100/60 cursor-text px-0 py-0"
      } ${!value ? "text-gray-400 italic" : ""} ${className}`}
    />
  );
}

/* ─── Section Card (preview editor) ─── */
function SectionCard({
  icon: Icon,
  title,
  accent,
  children,
  defaultOpen = true,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  accent: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: accent + "18" }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        <span className="text-sm font-semibold text-gray-900 flex-1">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*        PDF TEMPLATE RENDERER (hidden A4)       */
/* ═══════════════════════════════════════════════ */
function PDFTemplate({
  cv,
  theme,
  innerRef,
}: {
  cv: StructuredCV;
  theme: CVTheme;
  innerRef: React.Ref<HTMLDivElement>;
}) {
  const t = theme;
  const isRight = t.sidebarPosition === "right";

  const sectionHeading = (label: string) => (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.1em",
        color: t.headingColor,
        marginBottom: "10px",
        paddingBottom: t.sectionDivider === "line" ? "5px" : t.sectionDivider === "thick" ? "6px" : "4px",
        borderBottom:
          t.sectionDivider === "line"
            ? `1px solid ${t.borderColor}`
            : t.sectionDivider === "thick"
            ? `3px solid ${t.accentColor}`
            : t.sectionDivider === "dots"
            ? `2px dotted ${t.accentColor}`
            : "none",
      }}
    >
      {label}
    </div>
  );

  const sidebarHeading = (label: string) => (
    <div
      style={{
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        marginBottom: "10px",
        color: t.sidebarAccent,
      }}
    >
      {label}
    </div>
  );

  const tagBorderRadius =
    t.tagStyle === "pill" ? "999px" : t.tagStyle === "rounded" ? "6px" : "3px";

  /* ── SIDEBAR ── */
  const sidebar = (
    <div
      style={{
        width: "250px",
        flexShrink: 0,
        backgroundColor: t.sidebarBg,
        color: t.sidebarText,
        padding: "36px 22px 30px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "20px",
      }}
    >
      {/* Photo / Initials */}
      <div style={{ textAlign: "center" as const, marginBottom: "2px" }}>
        {cv.header.photoUrl ? (
          <img
            src={cv.header.photoUrl}
            alt=""
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              objectFit: "cover" as const,
              border: `3px solid ${t.sidebarAccent}`,
              margin: "0 auto",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              backgroundColor: t.sidebarTagBg,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 700,
              color: t.sidebarAccent,
              border: `2px solid ${t.sidebarAccent}`,
            }}
          >
            {cv.header.firstName?.[0]}
            {cv.header.lastName?.[0]}
          </div>
        )}
      </div>

      {/* Contact */}
      <div>
        {sidebarHeading("Contact")}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "7px" }}>
          {cv.header.email && (
            <div style={{ fontSize: "9px", display: "flex", alignItems: "center", gap: "7px", opacity: 0.9 }}>
              <span style={{ color: t.sidebarAccent, fontSize: "10px", width: "14px", textAlign: "center" as const }}>✉</span>
              {cv.header.email}
            </div>
          )}
          {cv.header.phone && (
            <div style={{ fontSize: "9px", display: "flex", alignItems: "center", gap: "7px", opacity: 0.9 }}>
              <span style={{ color: t.sidebarAccent, fontSize: "10px", width: "14px", textAlign: "center" as const }}>☎</span>
              {cv.header.phone}
            </div>
          )}
          {cv.header.location && (
            <div style={{ fontSize: "9px", display: "flex", alignItems: "center", gap: "7px", opacity: 0.9 }}>
              <span style={{ color: t.sidebarAccent, fontSize: "10px", width: "14px", textAlign: "center" as const }}>◉</span>
              {cv.header.location}
            </div>
          )}
          {cv.header.linkedin && (
            <div style={{ fontSize: "9px", display: "flex", alignItems: "center", gap: "7px", opacity: 0.9 }}>
              <span style={{ color: t.sidebarAccent, fontSize: "10px", width: "14px", textAlign: "center" as const, fontWeight: 700 }}>in</span>
              {cv.header.linkedin}
            </div>
          )}
        </div>
      </div>

      {/* Skills */}
      {cv.skills.length > 0 && (
        <div>
          {sidebarHeading("Compétences")}
          {cv.skills.map((cat, ci) => (
            <div key={ci} style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "9px", fontWeight: 600, marginBottom: "5px", opacity: 0.8 }}>
                {cat.category}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "3px" }}>
                {cat.items.map((item, ii) => (
                  <span
                    key={ii}
                    style={{
                      fontSize: "8px",
                      fontWeight: 500,
                      backgroundColor: t.sidebarTagBg,
                      borderRadius: tagBorderRadius,
                      padding: "3px 7px",
                      color: t.sidebarText,
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Languages */}
      {cv.languages.length > 0 && (
        <div>
          {sidebarHeading("Langues")}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "5px" }}>
            {cv.languages.map((lang, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", opacity: 0.9 }}>{lang.name}</span>
                <span
                  style={{
                    fontSize: "7.5px",
                    fontWeight: 600,
                    backgroundColor: t.sidebarTagBg,
                    borderRadius: tagBorderRadius,
                    padding: "2px 7px",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.03em",
                    color: t.sidebarAccent,
                  }}
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
          {sidebarHeading("Intérêts")}
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "3px" }}>
            {cv.interests.map((interest, i) => (
              <span
                key={i}
                style={{
                  fontSize: "8px",
                  backgroundColor: t.sidebarTagBg,
                  borderRadius: tagBorderRadius,
                  padding: "3px 7px",
                  color: t.sidebarText,
                  opacity: 0.85,
                }}
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ── MAIN CONTENT ── */
  const mainContent = (
    <div style={{ flex: 1, padding: "36px 30px 30px", backgroundColor: t.mainBg, overflow: "hidden" }}>
      {/* Name */}
      <div style={{ marginBottom: "6px" }}>
        {t.nameStyle === "stacked" ? (
          <>
            <div style={{ fontSize: "26px", fontWeight: 800, color: t.mainText, lineHeight: 1.1 }}>
              {cv.header.firstName}
            </div>
            <div style={{ fontSize: "26px", fontWeight: 800, color: t.accentColor, lineHeight: 1.1 }}>
              {cv.header.lastName}
            </div>
          </>
        ) : (
          <div style={{ fontSize: "26px", fontWeight: 800, lineHeight: 1.1 }}>
            <span style={{ color: t.mainText }}>{cv.header.firstName} </span>
            <span style={{ color: t.accentColor }}>{cv.header.lastName}</span>
          </div>
        )}
        <div
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: t.subTextColor,
            marginTop: "5px",
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
          }}
        >
          {cv.header.title}
        </div>
      </div>

      {/* Separator */}
      <div
        style={{
          height: t.sectionDivider === "thick" ? "3px" : "2px",
          background: `linear-gradient(90deg, ${t.accentColor}, transparent)`,
          marginBottom: "16px",
          borderRadius: "2px",
        }}
      />

      {/* Summary */}
      {cv.summary && (
        <div style={{ marginBottom: "16px" }}>
          {sectionHeading("Profil")}
          <div style={{ fontSize: "9.5px", color: t.subTextColor, lineHeight: 1.65 }}>{cv.summary}</div>
        </div>
      )}

      {/* Experiences */}
      {cv.experiences.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          {sectionHeading("Expériences Professionnelles")}
          {cv.experiences.map((exp, i) => (
            <div
              key={exp.id}
              style={{
                marginBottom: "12px",
                paddingLeft: t.borderLeftStyle ? "11px" : "0",
                borderLeft: t.borderLeftStyle
                  ? `2px solid ${i === 0 ? t.accentColor : t.borderColor}`
                  : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: t.mainText }}>{exp.position}</div>
                <div style={{ fontSize: "8.5px", color: t.subTextColor, whiteSpace: "nowrap" as const, marginLeft: "8px" }}>
                  {exp.startDate} – {exp.endDate}
                </div>
              </div>
              <div style={{ fontSize: "9px", fontWeight: 600, color: t.accentColor, marginTop: "1px" }}>
                {exp.company}
                {exp.location ? ` — ${exp.location}` : ""}
              </div>
              <ul style={{ margin: "4px 0 0 0", padding: 0, listStyle: "none" }}>
                {exp.bullets.map((b, bi) => (
                  <li
                    key={bi}
                    style={{
                      fontSize: "9px",
                      color: t.subTextColor,
                      lineHeight: 1.55,
                      paddingLeft: "10px",
                      position: "relative" as const,
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute" as const,
                        left: 0,
                        color: t.bulletColor,
                        fontSize: "5px",
                        top: "4px",
                      }}
                    >
                      ●
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {cv.education.length > 0 && (
        <div>
          {sectionHeading("Formation")}
          {cv.education.map((edu, i) => (
            <div
              key={edu.id}
              style={{
                marginBottom: "10px",
                paddingLeft: t.borderLeftStyle ? "11px" : "0",
                borderLeft: t.borderLeftStyle
                  ? `2px solid ${i === 0 ? t.accentColor : t.borderColor}`
                  : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: t.mainText }}>{edu.degree}</div>
                <div style={{ fontSize: "8.5px", color: t.subTextColor, marginLeft: "8px" }}>
                  {edu.startDate} – {edu.endDate}
                </div>
              </div>
              <div style={{ fontSize: "9px", fontWeight: 600, color: t.accentColor, marginTop: "1px" }}>
                {edu.school}
              </div>
              {edu.description && (
                <div style={{ fontSize: "9px", color: t.subTextColor, marginTop: "2px", lineHeight: 1.5 }}>
                  {edu.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={innerRef}
      style={{
        display: "none",
        width: "794px",
        height: "1123px",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", height: "100%", flexDirection: isRight ? "row-reverse" : "row" as "row" | "row-reverse" }}>
        {sidebar}
        {mainContent}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*        PREVIEW / INLINE EDITOR (post-wizard)   */
/* ═══════════════════════════════════════════════ */
function PreviewEditor({
  cv,
  setCv,
  theme,
  onExport,
  exporting,
  onBack,
}: {
  cv: StructuredCV;
  setCv: React.Dispatch<React.SetStateAction<StructuredCV>>;
  theme: CVTheme;
  onExport: () => void;
  exporting: boolean;
  onBack: () => void;
}) {
  const updateHeader = useCallback(
    (field: string, value: string) => {
      setCv((prev) => ({ ...prev, header: { ...prev.header, [field]: value } }));
    },
    [setCv]
  );

  const updateExperience = useCallback(
    (idx: number, field: string, value: string | string[]) => {
      setCv((prev) => {
        const exps = [...prev.experiences];
        exps[idx] = { ...exps[idx], [field]: value };
        return { ...prev, experiences: exps };
      });
    },
    [setCv]
  );

  const updateEducation = useCallback(
    (idx: number, field: string, value: string) => {
      setCv((prev) => {
        const edus = [...prev.education];
        edus[idx] = { ...edus[idx], [field]: value };
        return { ...prev, education: edus };
      });
    },
    [setCv]
  );

  const updateSkillItems = useCallback(
    (catIdx: number, items: string[]) => {
      setCv((prev) => {
        const skills = [...prev.skills];
        skills[catIdx] = { ...skills[catIdx], items };
        return { ...prev, skills };
      });
    },
    [setCv]
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height, 400);
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            {cv.header.photoUrl ? (
              <div className="relative group">
                <img
                  src={cv.header.photoUrl}
                  alt="Photo"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2"
                  style={{ borderColor: theme.accentColor }}
                />
                <button
                  onClick={() => updateHeader("photoUrl", "")}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors"
                style={{ borderColor: theme.accentColor + "60" }}
              >
                <Camera className="h-5 w-5" style={{ color: theme.accentColor + "80" }} />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-x-2">
              <EditField
                value={cv.header.firstName}
                onChange={(v) => updateHeader("firstName", v)}
                className="text-lg sm:text-xl font-bold text-gray-900"
              />
              <EditField
                value={cv.header.lastName}
                onChange={(v) => updateHeader("lastName", v)}
                className="text-lg sm:text-xl font-bold text-gray-900"
              />
            </div>
            <EditField
              value={cv.header.title}
              onChange={(v) => updateHeader("title", v)}
              className="text-sm text-gray-500 mt-1"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {cv.header.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accentColor }} />
              <EditField value={cv.header.email} onChange={(v) => updateHeader("email", v)} className="text-sm text-gray-600" />
            </div>
          )}
          {cv.header.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accentColor }} />
              <EditField value={cv.header.phone} onChange={(v) => updateHeader("phone", v)} className="text-sm text-gray-600" />
            </div>
          )}
          {cv.header.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accentColor }} />
              <EditField value={cv.header.location} onChange={(v) => updateHeader("location", v)} className="text-sm text-gray-600" />
            </div>
          )}
          {cv.header.linkedin && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Linkedin className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accentColor }} />
              <EditField value={cv.header.linkedin} onChange={(v) => updateHeader("linkedin", v)} className="text-sm text-gray-600" />
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {cv.summary && (
        <SectionCard icon={User} title="Profil" accent={theme.accentColor}>
          <EditField
            value={cv.summary}
            onChange={(v) => setCv((prev) => ({ ...prev, summary: v }))}
            className="text-sm text-gray-700 leading-relaxed"
            multiline
          />
        </SectionCard>
      )}

      {/* Experiences */}
      {cv.experiences.length > 0 && (
        <SectionCard icon={Briefcase} title="Expériences" accent={theme.accentColor}>
          <div className="space-y-5">
            {cv.experiences.map((exp, i) => (
              <div key={exp.id} className="relative">
                {i > 0 && <div className="absolute -top-3 left-0 right-0 h-px bg-gray-100" />}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <EditField
                      value={exp.position}
                      onChange={(v) => updateExperience(i, "position", v)}
                      className="text-sm font-semibold text-gray-900"
                    />
                    <EditField
                      value={exp.company + (exp.location ? ` · ${exp.location}` : "")}
                      onChange={(v) => {
                        const parts = v.split("·").map((s) => s.trim());
                        updateExperience(i, "company", parts[0]);
                        if (parts[1]) updateExperience(i, "location", parts[1]);
                      }}
                      className="text-xs font-medium mt-0.5"
                    />
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: theme.accentColor + "15", color: theme.accentColor }}
                  >
                    {exp.startDate} – {exp.endDate}
                  </span>
                </div>

                <div className="mt-2 space-y-1.5">
                  {exp.bullets.map((bullet, bi) => (
                    <div key={bi} className="flex gap-2 group items-start">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: theme.accentColor }}
                      />
                      <EditField
                        value={bullet}
                        onChange={(v) => {
                          const newBullets = [...exp.bullets];
                          newBullets[bi] = v;
                          updateExperience(i, "bullets", newBullets);
                        }}
                        className="text-sm text-gray-600 leading-relaxed flex-1"
                      />
                      <button
                        onClick={() => {
                          const newBullets = exp.bullets.filter((_, j) => j !== bi);
                          updateExperience(i, "bullets", newBullets);
                        }}
                        className="mt-0.5 text-gray-300 hover:text-red-500 shrink-0 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      updateExperience(i, "bullets", [...exp.bullets, "Nouvelle réalisation..."])
                    }
                    className="flex items-center gap-1 text-xs font-medium mt-1 transition-colors"
                    style={{ color: theme.accentColor }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un point
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Education */}
      {cv.education.length > 0 && (
        <SectionCard icon={GraduationCap} title="Formation" accent={theme.accentColor}>
          <div className="space-y-4">
            {cv.education.map((edu, i) => (
              <div key={edu.id}>
                {i > 0 && <div className="h-px bg-gray-100 mb-4" />}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <EditField
                      value={edu.degree}
                      onChange={(v) => updateEducation(i, "degree", v)}
                      className="text-sm font-semibold text-gray-900"
                    />
                    <EditField
                      value={edu.school}
                      onChange={(v) => updateEducation(i, "school", v)}
                      className="text-xs text-gray-500 mt-0.5"
                    />
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: theme.accentColor + "15", color: theme.accentColor }}
                  >
                    {edu.startDate} – {edu.endDate}
                  </span>
                </div>
                {edu.description && (
                  <EditField
                    value={edu.description}
                    onChange={(v) => updateEducation(i, "description", v)}
                    className="text-sm text-gray-500 mt-1"
                  />
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Skills */}
      {cv.skills.length > 0 && (
        <SectionCard icon={Wrench} title="Compétences" accent={theme.accentColor}>
          <div className="space-y-4">
            {cv.skills.map((cat, ci) => (
              <div key={ci}>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  {cat.category}
                </div>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((item, ii) => (
                    <span
                      key={ii}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium"
                      style={{
                        backgroundColor: theme.accentColor + "15",
                        color: theme.accentColor,
                      }}
                    >
                      {item}
                      <button
                        onClick={() => updateSkillItems(ci, cat.items.filter((_, j) => j !== ii))}
                        className="ml-0.5 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => updateSkillItems(ci, [...cat.items, "Nouvelle"])}
                    className="rounded-full px-3 py-1.5 text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                  >
                    + Ajouter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Languages */}
      {cv.languages.length > 0 && (
        <SectionCard icon={Languages} title="Langues" accent={theme.accentColor}>
          <div className="space-y-2">
            {cv.languages.map((lang, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-700">{lang.name}</span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: theme.accentColor + "15",
                    color: theme.accentColor,
                  }}
                >
                  {lang.level}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Interests */}
      {cv.interests && cv.interests.length > 0 && (
        <SectionCard icon={Heart} title="Centres d'intérêt" accent={theme.accentColor} defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {cv.interests.map((interest, i) => (
              <span
                key={i}
                className="rounded-full px-3 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: theme.accentColor + "12",
                  color: theme.accentColor,
                }}
              >
                {interest}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Action buttons */}
      <div className="pt-2 pb-8 space-y-3">
        <button
          onClick={onExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold text-white transition-all active:scale-[0.98] shadow-lg"
          style={{ backgroundColor: theme.accentColor }}
        >
          {exporting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Génération du PDF...
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              Télécharger le CV en PDF
            </>
          )}
        </button>
        <button
          onClick={onBack}
          className="w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Modifier dans le wizard
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*               MAIN EDITOR PAGE                 */
/* ═══════════════════════════════════════════════ */
export default function CVEditorPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const analysisId = searchParams.get("id");

  const [cv, setCv] = useState<StructuredCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<CVThemeId>("modern");
  const [customColors, setCustomColors] = useState<CustomColors>({
    sidebarBg: "",
    accentColor: "",
    sidebarAccent: "",
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardComplete, setWizardComplete] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const cvPrintRef = useRef<HTMLDivElement>(null);

  // Build effective theme (base + custom overrides)
  const baseTheme = CV_THEMES[selectedTheme];
  const theme: CVTheme = {
    ...baseTheme,
    ...(customColors.sidebarBg && { sidebarBg: customColors.sidebarBg }),
    ...(customColors.accentColor && {
      accentColor: customColors.accentColor,
      headingColor: customColors.accentColor,
      bulletColor: customColors.accentColor,
    }),
    ...(customColors.sidebarAccent && { sidebarAccent: customColors.sidebarAccent }),
  };

  /* ── Warn before leaving ── */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  /* ── Load structured CV ── */
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
          const detected = getThemeForSector(data.structuredCV.detectedTheme);
          setSelectedTheme(detected);
        } else {
          toast.error(data.error || "Erreur");
          router.push("/app");
        }
      })
      .catch(() => toast.error("Erreur réseau"))
      .finally(() => setLoading(false));
  }, [analysisId, router]);

  /* ── Update helpers ── */
  const updateHeader = useCallback(
    (field: string, value: string) => {
      setCv((prev) =>
        prev ? { ...prev, header: { ...prev.header, [field]: value } } : prev
      );
    },
    []
  );

  /* ── Navigation ── */
  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } else {
      setWizardComplete(true);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  /* ── PDF Export ── */
  const handleExport = async () => {
    if (!cvPrintRef.current) return;
    setExporting(true);
    try {
      const html2canvasModule = await import("html2canvas-pro");
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = await import("jspdf");

      const el = cvPrintRef.current;
      el.style.display = "block";
      el.style.position = "absolute";
      el.style.left = "-9999px";
      el.style.top = "0";

      await new Promise((r) => setTimeout(r, 250));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      el.style.display = "none";

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "JPEG", 0, 0, w, h);
      const name = cv?.header
        ? `CV_${cv.header.firstName}_${cv.header.lastName}.pdf`
        : "CV_Seora.pdf";
      pdf.save(name);
      toast.success("CV exporté !");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-6">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-indigo-50">
            <Sparkles className="h-7 w-7 animate-pulse text-indigo-600" />
          </div>
          <p className="text-base font-semibold text-gray-900">Génération en cours...</p>
          <p className="mt-1 text-sm text-gray-500">
            L&apos;IA restructure et optimise ton CV
          </p>
        </div>
      </div>
    );
  }

  if (!cv) return null;

  /* ── Slide animation variants ── */
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  /* ── Render current step ── */
  const renderStep = () => {
    const stepProps = { cv, setCv: setCv as React.Dispatch<React.SetStateAction<StructuredCV>>, updateHeader };

    switch (currentStep) {
      case 0:
        return <StepContact {...stepProps} />;
      case 1:
        return <StepProfile {...stepProps} />;
      case 2:
        return <StepSkills {...stepProps} />;
      case 3:
        return <StepExperiences {...stepProps} />;
      case 4:
        return <StepEducation {...stepProps} />;
      case 5:
        return <StepLanguagesInterests {...stepProps} />;
      case 6:
        return (
          <StepStyle
            cv={cv}
            selectedTheme={selectedTheme}
            setSelectedTheme={setSelectedTheme}
            customColors={customColors}
            setCustomColors={setCustomColors}
          />
        );
      default:
        return null;
    }
  };

  /* ── Wizard completed → show preview editor ── */
  if (wizardComplete) {
    return (
      <div className="min-h-screen bg-gray-50/80">
        {/* Sticky header */}
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/60">
          <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
            <button
              onClick={() => router.push("/app")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </button>

            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" style={{ color: theme.accentColor }} />
              <span className="text-sm font-bold text-gray-900">Aperçu & Édition</span>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all active:scale-95"
              style={{ backgroundColor: theme.accentColor }}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{exporting ? "Export..." : "PDF"}</span>
            </button>
          </div>
        </div>

        <PreviewEditor
          cv={cv}
          setCv={setCv as React.Dispatch<React.SetStateAction<StructuredCV>>}
          theme={theme}
          onExport={handleExport}
          exporting={exporting}
          onBack={() => setWizardComplete(false)}
        />

        {/* Hidden PDF template */}
        <PDFTemplate cv={cv} theme={theme} innerRef={cvPrintRef} />
      </div>
    );
  }

  /* ── Wizard mode ── */
  return (
    <div className="min-h-screen bg-gray-50/80 flex flex-col">
      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/60">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push("/app")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </button>

            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-bold text-gray-900">Éditeur CV</span>
            </div>

            <div className="w-16" /> {/* spacer */}
          </div>

          <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        </div>
      </div>

      {/* ─── Step Content ─── */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Bottom Navigation ─── */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/60">
        <div className="max-w-lg mx-auto px-4 py-4 flex gap-3">
          {currentStep > 0 && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={goPrev}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4" />
              Précédent
            </motion.button>
          )}

          <motion.button
            layout
            onClick={goNext}
            className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] shadow-lg ${
              currentStep === 0 ? "w-full" : "flex-1"
            }`}
            style={{
              background: `linear-gradient(135deg, #6366F1, #8B5CF6)`,
            }}
          >
            {currentStep === TOTAL_STEPS - 1 ? (
              <>
                <Eye className="h-4 w-4" />
                Voir mon CV
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Hidden PDF template */}
      <PDFTemplate cv={cv} theme={theme} innerRef={cvPrintRef} />
    </div>
  );
}
