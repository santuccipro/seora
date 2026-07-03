"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  X,
  Plus,
  Trash2,
  Check,
  Globe,
  Palette,
  ZoomIn,
  Loader2,
} from "lucide-react";
import type { StructuredCV, CVTheme, CVThemeId, CVLayoutId } from "@/lib/cv-types";
import { CV_THEMES, CV_LAYOUTS, getRecommendedThemes } from "@/lib/cv-types";
import VoiceButton from "./voice-button";

/* ─── Shared types ─── */
type UpdateHeader = (field: string, value: string) => void;
type SetCv = React.Dispatch<React.SetStateAction<StructuredCV>>;

interface StepProps {
  cv: StructuredCV;
  setCv: SetCv;
  updateHeader: UpdateHeader;
}

/* ─── Shared input component (text-base = 16px to prevent iOS zoom) ─── */
function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  required,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  required?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all ${
            icon ? "pl-10" : ""
          }`}
        />
      </div>
      {children}
    </div>
  );
}

/* ─── Email suggestions component ─── */
const EMAIL_DOMAINS = ["@gmail.com", "@outlook.com", "@yahoo.fr", "@hotmail.fr", "@icloud.com"];

function EmailSuggestions({ value, onSelect }: { value: string; onSelect: (email: string) => void }) {
  if (!value || value.includes("@")) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {EMAIL_DOMAINS.map((domain) => (
        <button
          key={domain}
          type="button"
          onClick={() => onSelect(value + domain)}
          className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all"
        >
          {domain}
        </button>
      ))}
    </div>
  );
}

/* ─── Phone formatting helper ─── */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Format as pairs: 06 12 34 56 78
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

/* ─── Photo editor with crop (react-easy-crop) ─── */
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

const CROP_EXPORT = 400;

function PhotoEditor({
  photoUrl,
  onCrop,
  onRemove,
}: {
  photoUrl: string;
  onCrop: (dataUrl: string, shape: "round" | "rect") => void;
  onRemove: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [shape, setShape] = useState<"round" | "rect">("round");
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = photoUrl;
    await new Promise((resolve) => { image.onload = resolve; });

    const canvas = document.createElement("canvas");
    canvas.width = CROP_EXPORT;
    canvas.height = CROP_EXPORT;
    const ctx = canvas.getContext("2d")!;

    if (shape === "round") {
      ctx.beginPath();
      ctx.arc(CROP_EXPORT / 2, CROP_EXPORT / 2, CROP_EXPORT / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }
    ctx.drawImage(
      image,
      croppedAreaPixels.x, croppedAreaPixels.y,
      croppedAreaPixels.width, croppedAreaPixels.height,
      0, 0, CROP_EXPORT, CROP_EXPORT,
    );
    onCrop(canvas.toDataURL("image/jpeg", 0.85), shape);
  }, [croppedAreaPixels, photoUrl, onCrop, shape]);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Shape toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
        <button
          type="button"
          onClick={() => setShape("round")}
          className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${shape === "round" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400"}`}
        >
          Rond
        </button>
        <button
          type="button"
          onClick={() => setShape("rect")}
          className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${shape === "rect" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400"}`}
        >
          Carré
        </button>
      </div>

      {/* Crop area */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ height: 280 }}>
        <Cropper
          image={photoUrl}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape={shape}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { borderRadius: 16 },
            mediaStyle: {},
            cropAreaStyle: { border: "3px solid rgba(99,102,241,0.8)" },
          }}
        />
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-3 w-full max-w-[280px]">
        <ZoomIn className="h-4 w-4 text-gray-400 shrink-0" />
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="flex-1 h-1.5 accent-indigo-500 rounded-full"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Annuler
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all"
        >
          <Check className="h-3.5 w-3.5" />
          Valider
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*           STEP 1 — Contact Info                 */
/* ═══════════════════════════════════════════════ */
export function StepContact({ cv, updateHeader, cvOriginalImage, extractingPhoto }: StepProps & { cvOriginalImage?: string | null; extractingPhoto?: boolean }) {
  const [rawPhoto, setRawPhoto] = useState<string>("");
  const [photoShape, setPhotoShape] = useState<"round" | "rect">("round");

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRawPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">Informations de contact</h2>
        <p className="text-sm text-gray-400 mt-1">Comment peut-on te joindre ?</p>
      </div>

      {/* Photo with zoom/drag editor */}
      <div className="flex justify-center">
        {rawPhoto ? (
          <PhotoEditor
            photoUrl={rawPhoto}
            onCrop={(dataUrl, s) => { updateHeader("photoUrl", dataUrl); setPhotoShape(s); setRawPhoto(""); }}
            onRemove={() => {
              updateHeader("photoUrl", "");
              setRawPhoto("");
            }}
          />
        ) : cv.header.photoUrl ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className={`w-28 h-28 overflow-hidden border-3 border-indigo-400 shadow-lg ${photoShape === "rect" ? "rounded-2xl" : "rounded-full"}`}>
                <img src={cv.header.photoUrl} alt="Photo" className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={() => { updateHeader("photoUrl", ""); }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRawPhoto(cv.header.photoUrl || "")}
                className="text-[11px] text-indigo-500 underline hover:text-indigo-700"
              >
                Recadrer
              </button>
              <span className="text-gray-300">·</span>
              <label className="text-[11px] text-gray-400 underline cursor-pointer hover:text-indigo-500">
                Changer la photo
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
          </div>
        ) : (
          <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-indigo-300 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50/50 transition-colors">
            <Camera className="h-6 w-6 text-indigo-400 mb-1" />
            <span className="text-[10px] text-indigo-400 font-medium">Photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Prénom"
          value={cv.header.firstName}
          onChange={(v) => updateHeader("firstName", v)}
          placeholder="Jean"
          required
        />
        <Input
          label="Nom"
          value={cv.header.lastName}
          onChange={(v) => updateHeader("lastName", v)}
          placeholder="Dupont"
          required
        />
      </div>

      <Input
        label="Titre / Poste"
        value={cv.header.title}
        onChange={(v) => updateHeader("title", v)}
        placeholder="Développeur Full-Stack"
        required
      />

      <Input
        label="Email"
        value={cv.header.email}
        onChange={(v) => updateHeader("email", v)}
        placeholder="jean@email.com"
        type="email"
        required
      >
        <EmailSuggestions
          value={cv.header.email}
          onSelect={(email) => updateHeader("email", email)}
        />
      </Input>
      <Input
        label="Téléphone"
        value={formatPhone(cv.header.phone)}
        onChange={(v) => updateHeader("phone", formatPhone(v))}
        placeholder="06 12 34 56 78"
        type="tel"
      />

      <Input
        label="Localisation"
        value={cv.header.location}
        onChange={(v) => updateHeader("location", v)}
        placeholder="Paris, France"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="LinkedIn"
          value={cv.header.linkedin || ""}
          onChange={(v) => updateHeader("linkedin", v)}
          placeholder="linkedin.com/in/..."
        />
        <Input
          label="Site web"
          value={cv.header.website || ""}
          onChange={(v) => updateHeader("website", v)}
          placeholder="monsite.fr"
          icon={<Globe className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*           STEP 2 — Profile / Summary            */
/* ═══════════════════════════════════════════════ */
export function StepProfile({ cv, setCv }: StepProps) {

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">Profil professionnel</h2>
        <p className="text-sm text-gray-400 mt-1">
          Résume ton parcours en quelques lignes — ou dicte-le !
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Résumé
        </label>
        <textarea
          value={cv.summary || ""}
          onChange={(e) => {
            setCv((prev) => ({ ...prev, summary: e.target.value }));
            // Auto-resize
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          ref={(el) => {
            // Auto-resize on mount
            if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
          }}
          rows={3}
          placeholder="Professionnel expérimenté avec 5+ ans d'expérience en..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all resize-none overflow-hidden"
        />
      </div>

      <div className="flex items-center gap-3">
        <VoiceButton
          context="profile"
          onTranscription={(text) => {
            setCv({ ...cv, summary: text });
          }}
          label="Dicter mon profil"
        />
        {cv.summary && (
          <>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <Check className="h-3.5 w-3.5" />
              Profil renseigné
            </span>
            <button type="button" onClick={() => setCv({ ...cv, summary: "" })} className="ml-auto text-gray-300 hover:text-red-400 transition-colors" title="Effacer">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4">
        <p className="text-xs text-indigo-600 leading-relaxed">
          <strong>Astuce :</strong> Parle naturellement de ton parcours.
          L&apos;IA reformulera ton enregistrement en texte professionnel.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*           STEP 3 — Skills                       */
/* ═══════════════════════════════════════════════ */
export function StepSkills({ cv, setCv }: StepProps) {
  const [newSkill, setNewSkill] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [newCategory, setNewCategory] = useState("");

  const addSkill = (catIdx: number) => {
    if (!newSkill.trim()) return;
    setCv((prev) => {
      const skills = [...prev.skills];
      skills[catIdx] = { ...skills[catIdx], items: [...skills[catIdx].items, newSkill.trim()] };
      return { ...prev, skills };
    });
    setNewSkill("");
  };

  const removeSkill = (catIdx: number, itemIdx: number) => {
    setCv((prev) => {
      const skills = [...prev.skills];
      skills[catIdx] = {
        ...skills[catIdx],
        items: skills[catIdx].items.filter((_, i) => i !== itemIdx),
      };
      return { ...prev, skills };
    });
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    setCv((prev) => ({
      ...prev,
      skills: [...prev.skills, { category: newCategory.trim(), items: [] }],
    }));
    setNewCategory("");
  };

  const removeCategory = (catIdx: number) => {
    setCv((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== catIdx),
    }));
    if (activeCategory >= cv.skills.length - 1) {
      setActiveCategory(Math.max(0, cv.skills.length - 2));
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">Compétences</h2>
        <p className="text-sm text-gray-400 mt-1">
          Ajoute tes compétences par catégorie
        </p>
      </div>

      {/* Category tabs */}
      {cv.skills.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {cv.skills.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(i)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeCategory === i
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.category}
              <span className="ml-1.5 opacity-60">({cat.items.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Active category skills */}
      {cv.skills.length > 0 && cv.skills[activeCategory] && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <input
              value={cv.skills[activeCategory].category}
              onChange={(e) => {
                const idx = activeCategory;
                setCv((prev) => {
                  const skills = [...prev.skills];
                  skills[idx] = { ...skills[idx], category: e.target.value };
                  return { ...prev, skills };
                });
              }}
              className="text-base font-bold text-gray-700 bg-transparent border-none outline-none focus:ring-0 p-0"
            />
            <button
              onClick={() => removeCategory(activeCategory)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {cv.skills[activeCategory].items.map((item, ii) => (
              <span
                key={ii}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                {item}
                <button
                  onClick={() => removeSkill(activeCategory, ii)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add skill input */}
          <div className="flex gap-2">
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill(activeCategory);
                }
              }}
              placeholder="Ajouter une compétence..."
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-base placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
            />
            <button
              onClick={() => addSkill(activeCategory)}
              className="rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <VoiceButton
            context="skills"
            onTranscription={(text) => {
              // Parse comma/newline separated skills and add to first category
              const newSkills = text.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
              if (newSkills.length > 0 && cv.skills.length > 0) {
                const updated = [...cv.skills];
                updated[0] = { ...updated[0], items: [...updated[0].items, ...newSkills] };
                setCv({ ...cv, skills: updated });
              }
            }}
            label="Dicter mes compétences"
          />
        </div>
      )}

      {/* Add category */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex gap-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory();
              }
            }}
            placeholder="Nouvelle catégorie (ex: Outils, Soft Skills...)"
            className="flex-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all"
          />
          <button
            onClick={addCategory}
            className="rounded-xl border border-dashed border-gray-300 text-gray-500 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            + Catégorie
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*           STEP 4 — Experiences                  */
/* ═══════════════════════════════════════════════ */
export function StepExperiences({ cv, setCv }: StepProps) {
  const addExperience = () => {
    setCv((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        {
          id: crypto.randomUUID(),
          position: "",
          company: "",
          location: "",
          startDate: "",
          endDate: "",
          bullets: [""],
        },
      ],
    }));
  };

  const removeExperience = (idx: number) => {
    setCv((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== idx),
    }));
  };

  const updateExp = (idx: number, field: string, value: string | string[]) => {
    setCv((prev) => {
      const exps = [...prev.experiences];
      exps[idx] = { ...exps[idx], [field]: value };
      return { ...prev, experiences: exps };
    });
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">Expériences professionnelles</h2>
        <p className="text-sm text-gray-400 mt-1">
          Décris ton parcours — tu peux aussi le dicter
        </p>
      </div>

      {cv.experiences.map((exp, i) => (
        <div
          key={exp.id}
          className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
              Expérience {i + 1}
            </span>
            <button
              onClick={() => removeExperience(i)}
              className="text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Poste"
              value={exp.position}
              onChange={(v) => updateExp(i, "position", v)}
              placeholder="Chef de projet"
              required
            />
            <Input
              label="Entreprise"
              value={exp.company}
              onChange={(v) => updateExp(i, "company", v)}
              placeholder="Entreprise SAS"
              required
            />
          </div>

          <Input
            label="Lieu"
            value={exp.location || ""}
            onChange={(v) => updateExp(i, "location", v)}
            placeholder="Paris, France"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Date début"
              value={exp.startDate}
              onChange={(v) => updateExp(i, "startDate", v)}
              placeholder="Jan 2020"
            />
            <Input
              label="Date fin"
              value={exp.endDate}
              onChange={(v) => updateExp(i, "endDate", v)}
              placeholder="Présent"
            />
          </div>

          {/* Bullets / Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Description
            </label>
            {exp.bullets.map((bullet, bi) => (
              <div key={bi} className="flex gap-2 mb-2">
                <span className="mt-3 h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                <textarea
                  value={bullet}
                  onChange={(e) => {
                    const newBullets = [...exp.bullets];
                    newBullets[bi] = e.target.value;
                    updateExp(i, "bullets", newBullets);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  ref={(el) => {
                    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
                  }}
                  rows={1}
                  placeholder="Décris une réalisation..."
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-base placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all resize-none overflow-hidden"
                />
                <button
                  onClick={() => {
                    const newBullets = exp.bullets.filter((_, j) => j !== bi);
                    updateExp(i, "bullets", newBullets.length ? newBullets : [""]);
                  }}
                  className="text-gray-300 hover:text-red-500 transition-colors mt-2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => updateExp(i, "bullets", [...exp.bullets, ""])}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter un point
            </button>
          </div>

          <VoiceButton
            context="experience"
            onTranscription={(text) => {
              const newBullets = text.split(/[.\n]+/).map(s => s.trim()).filter(s => s.length > 5);
              if (newBullets.length > 0) {
                updateExp(i, "bullets", [...exp.bullets.filter(b => b.trim()), ...newBullets]);
              }
            }}
            label="Dicter la description"
          />
        </div>
      ))}

      <button
        onClick={addExperience}
        className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm font-semibold text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Ajouter une expérience
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*           STEP 5 — Education                    */
/* ═══════════════════════════════════════════════ */
export function StepEducation({ cv, setCv }: StepProps) {
  const addEducation = () => {
    setCv((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: crypto.randomUUID(),
          school: "",
          degree: "",
          startDate: "",
          endDate: "",
          description: "",
        },
      ],
    }));
  };

  const removeEducation = (idx: number) => {
    setCv((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== idx),
    }));
  };

  const updateEdu = (idx: number, field: string, value: string) => {
    setCv((prev) => {
      const edus = [...prev.education];
      edus[idx] = { ...edus[idx], [field]: value };
      return { ...prev, education: edus };
    });
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">Formation</h2>
        <p className="text-sm text-gray-400 mt-1">
          Tes diplômes et certifications
        </p>
      </div>

      {cv.education.map((edu, i) => (
        <div
          key={edu.id}
          className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
              Formation {i + 1}
            </span>
            <button
              onClick={() => removeEducation(i)}
              className="text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <Input
            label="École / Établissement"
            value={edu.school}
            onChange={(v) => updateEdu(i, "school", v)}
            placeholder="Université Paris-Saclay"
            required
          />

          <Input
            label="Diplôme"
            value={edu.degree}
            onChange={(v) => updateEdu(i, "degree", v)}
            placeholder="Master en Informatique"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Date début"
              value={edu.startDate}
              onChange={(v) => updateEdu(i, "startDate", v)}
              placeholder="Sep 2018"
            />
            <Input
              label="Date fin"
              value={edu.endDate}
              onChange={(v) => updateEdu(i, "endDate", v)}
              placeholder="Juin 2020"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Description (optionnel)
            </label>
            <textarea
              value={edu.description || ""}
              onChange={(e) => updateEdu(i, "description", e.target.value)}
              rows={2}
              placeholder="Mention, spécialisation, projets notables..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all resize-none"
            />
          </div>
        </div>
      ))}

      <button
        onClick={addEducation}
        className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm font-semibold text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Ajouter une formation
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*           STEP 6 — Languages & Interests        */
/* ═══════════════════════════════════════════════ */
const LANGUAGE_LEVELS = ["Natif", "Courant", "Avancé", "Intermédiaire", "Débutant"];

export function StepLanguagesInterests({ cv, setCv }: StepProps) {
  const [newInterest, setNewInterest] = useState("");

  const addLanguage = () => {
    setCv((prev) => ({
      ...prev,
      languages: [...prev.languages, { name: "", level: "Intermédiaire" }],
    }));
  };

  const removeLanguage = (idx: number) => {
    setCv((prev) => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== idx),
    }));
  };

  const updateLanguage = (idx: number, field: "name" | "level", value: string) => {
    setCv((prev) => {
      const langs = [...prev.languages];
      langs[idx] = { ...langs[idx], [field]: value };
      return { ...prev, languages: langs };
    });
  };

  const addInterest = () => {
    if (!newInterest.trim()) return;
    setCv((prev) => ({
      ...prev,
      interests: [...(prev.interests || []), newInterest.trim()],
    }));
    setNewInterest("");
  };

  const removeInterest = (idx: number) => {
    setCv((prev) => ({
      ...prev,
      interests: (prev.interests || []).filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">Langues & Centres d&apos;intérêt</h2>
        <p className="text-sm text-gray-400 mt-1">
          La touche finale de ton profil
        </p>
      </div>

      {/* Languages */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <Globe className="h-4 w-4 text-indigo-500" />
          Langues
        </h3>

        {cv.languages.map((lang, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={lang.name}
              onChange={(e) => updateLanguage(i, "name", e.target.value)}
              placeholder="Français"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
            />
            <select
              value={lang.level}
              onChange={(e) => updateLanguage(i, "level", e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
            >
              {LANGUAGE_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeLanguage(i)}
              className="text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          onClick={addLanguage}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter une langue
        </button>
      </div>

      {/* Interests */}
      <div className="border-t border-gray-100 pt-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <Palette className="h-4 w-4 text-indigo-500" />
          Centres d&apos;intérêt
        </h3>

        <div className="flex flex-wrap gap-2">
          {(cv.interests || []).map((interest, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100"
            >
              {interest}
              <button
                onClick={() => removeInterest(i)}
                className="hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInterest();
              }
            }}
            placeholder="Ajouter un intérêt..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-base placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
          />
          <button
            onClick={addInterest}
            className="rounded-xl bg-violet-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors active:scale-95"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*           STEP 7 — Style & Customization        */
/* ═══════════════════════════════════════════════ */
interface StepStyleProps {
  cv: StructuredCV;
  selectedTheme: CVThemeId;
  setSelectedTheme: (id: CVThemeId) => void;
  customColors: CustomColors;
  setCustomColors: (colors: CustomColors) => void;
}

export interface CustomColors {
  sidebarBg: string;
  accentColor: string;
  sidebarAccent: string;
}

/* ═══════════════════════════════════════════════ */
/*           STEP 7 — Layout (Disposition)         */
/* ═══════════════════════════════════════════════ */
export function StepLayout({
  selectedLayout,
  setSelectedLayout,
}: {
  selectedLayout: CVLayoutId;
  setSelectedLayout: (id: CVLayoutId) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">Disposition du CV</h2>
        <p className="text-sm text-gray-400 mt-1">Choisis la structure qui te correspond</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CV_LAYOUTS.map((layout) => {
          const active = selectedLayout === layout.id;
          return (
            <button
              key={layout.id}
              type="button"
              onClick={() => setSelectedLayout(layout.id)}
              className={`relative rounded-2xl border-2 p-3 text-left transition-all ${
                active
                  ? "border-indigo-500 bg-indigo-50/50 shadow-md shadow-indigo-500/10 scale-[1.02]"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              {active && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Mini layout preview */}
              <div className="w-full aspect-[3/4] rounded-lg overflow-hidden border border-gray-200/60 mb-2.5 bg-gray-50">
                {layout.id === "sidebar-left" && (
                  <div className="flex h-full">
                    <div className="w-[35%] bg-gray-700 p-2 flex flex-col gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-gray-500 mx-auto" />
                      <div className="h-1 bg-gray-500 rounded w-3/4 mx-auto" />
                      <div className="h-0.5 bg-gray-500/40 rounded w-full mt-1" />
                      <div className="h-0.5 bg-gray-500/40 rounded w-4/5" />
                      <div className="h-0.5 bg-gray-500/40 rounded w-full mt-1" />
                      <div className="h-0.5 bg-gray-500/40 rounded w-3/5" />
                    </div>
                    <div className="flex-1 p-2 flex flex-col gap-1.5">
                      <div className="h-2 bg-gray-300 rounded w-2/3" />
                      <div className="h-1 bg-gray-200 rounded w-1/2" />
                      <div className="h-0.5 bg-gray-100 rounded w-full mt-1" />
                      <div className="h-0.5 bg-gray-100 rounded w-full" />
                      <div className="h-0.5 bg-gray-100 rounded w-4/5" />
                      <div className="h-1.5 bg-gray-200 rounded w-1/3 mt-1" />
                      <div className="h-0.5 bg-gray-100 rounded w-full" />
                      <div className="h-0.5 bg-gray-100 rounded w-full" />
                    </div>
                  </div>
                )}
                {layout.id === "sidebar-right" && (
                  <div className="flex h-full">
                    <div className="flex-1 p-2 flex flex-col gap-1.5">
                      <div className="h-2 bg-gray-300 rounded w-2/3" />
                      <div className="h-1 bg-gray-200 rounded w-1/2" />
                      <div className="h-0.5 bg-gray-100 rounded w-full mt-1" />
                      <div className="h-0.5 bg-gray-100 rounded w-full" />
                      <div className="h-0.5 bg-gray-100 rounded w-4/5" />
                      <div className="h-1.5 bg-gray-200 rounded w-1/3 mt-1" />
                      <div className="h-0.5 bg-gray-100 rounded w-full" />
                      <div className="h-0.5 bg-gray-100 rounded w-full" />
                    </div>
                    <div className="w-[35%] bg-gray-700 p-2 flex flex-col gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-gray-500 mx-auto" />
                      <div className="h-1 bg-gray-500 rounded w-3/4 mx-auto" />
                      <div className="h-0.5 bg-gray-500/40 rounded w-full mt-1" />
                      <div className="h-0.5 bg-gray-500/40 rounded w-4/5" />
                      <div className="h-0.5 bg-gray-500/40 rounded w-full mt-1" />
                      <div className="h-0.5 bg-gray-500/40 rounded w-3/5" />
                    </div>
                  </div>
                )}
                {layout.id === "top-header" && (
                  <div className="flex flex-col h-full">
                    <div className="bg-gray-700 p-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-500 shrink-0" />
                      <div className="flex-1">
                        <div className="h-1.5 bg-gray-400 rounded w-2/3 mb-1" />
                        <div className="h-0.5 bg-gray-500/50 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="flex flex-1">
                      <div className="w-[40%] p-1.5 flex flex-col gap-1 border-r border-gray-200">
                        <div className="h-1 bg-gray-300 rounded w-2/3" />
                        <div className="h-0.5 bg-gray-100 rounded w-full" />
                        <div className="h-0.5 bg-gray-100 rounded w-4/5" />
                        <div className="h-1 bg-gray-300 rounded w-1/2 mt-1" />
                        <div className="h-0.5 bg-gray-100 rounded w-full" />
                      </div>
                      <div className="flex-1 p-1.5 flex flex-col gap-1">
                        <div className="h-1 bg-gray-300 rounded w-1/2" />
                        <div className="h-0.5 bg-gray-100 rounded w-full" />
                        <div className="h-0.5 bg-gray-100 rounded w-full" />
                        <div className="h-0.5 bg-gray-100 rounded w-3/4" />
                        <div className="h-1 bg-gray-300 rounded w-1/3 mt-1" />
                        <div className="h-0.5 bg-gray-100 rounded w-full" />
                      </div>
                    </div>
                  </div>
                )}
                {layout.id === "minimal" && (
                  <div className="flex flex-col h-full p-2 gap-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-gray-300 shrink-0" />
                      <div className="flex-1">
                        <div className="h-2 bg-gray-300 rounded w-1/2 mb-0.5" />
                        <div className="h-0.5 bg-gray-200 rounded w-1/3" />
                      </div>
                    </div>
                    <div className="h-px bg-gray-200 my-0.5" />
                    <div className="h-0.5 bg-gray-100 rounded w-full" />
                    <div className="h-0.5 bg-gray-100 rounded w-full" />
                    <div className="h-0.5 bg-gray-100 rounded w-4/5" />
                    <div className="h-1.5 bg-gray-200 rounded w-1/4 mt-1" />
                    <div className="h-0.5 bg-gray-100 rounded w-full" />
                    <div className="h-0.5 bg-gray-100 rounded w-full" />
                    <div className="h-0.5 bg-gray-100 rounded w-3/5" />
                    <div className="h-1.5 bg-gray-200 rounded w-1/4 mt-1" />
                    <div className="h-0.5 bg-gray-100 rounded w-full" />
                    <div className="h-0.5 bg-gray-100 rounded w-4/5" />
                  </div>
                )}
              </div>

              <p className="text-sm font-bold text-gray-900">{layout.name}</p>
              <p className="text-[11px] text-gray-400 leading-snug mt-0.5">{layout.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*           STEP 8 — Colors (Thème couleur)       */
/* ═══════════════════════════════════════════════ */
export function StepStyle({
  cv,
  selectedTheme,
  setSelectedTheme,
  customColors,
  setCustomColors,
  detectedTheme,
}: StepStyleProps & { detectedTheme?: string }) {
  const theme = CV_THEMES[selectedTheme];
  const [showCustom, setShowCustom] = useState(false);
  const [styleNote, setStyleNote] = useState("");

  // Get recommended vs other themes
  const { recommended, others } = getRecommendedThemes(detectedTheme);

  // Mini preview
  const previewTheme: CVTheme = {
    ...theme,
    sidebarBg: customColors.sidebarBg || theme.sidebarBg,
    accentColor: customColors.accentColor || theme.accentColor,
    sidebarAccent: customColors.sidebarAccent || theme.sidebarAccent,
  };

  const ThemeCard = ({ t, badge }: { t: CVTheme; badge?: string }) => (
    <button
      onClick={() => {
        setSelectedTheme(t.id);
        setCustomColors({ sidebarBg: "", accentColor: "", sidebarAccent: "" });
      }}
      className={`relative rounded-2xl border-2 p-3 text-left transition-all ${
        selectedTheme === t.id
          ? "border-indigo-500 shadow-lg scale-[1.02]"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {badge && (
        <div className="absolute -top-2 left-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
          {badge}
        </div>
      )}
      {selectedTheme === t.id && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Mini preview */}
      <div className="flex rounded-lg overflow-hidden h-16 mb-2 shadow-sm">
        <div className="w-1/3" style={{ backgroundColor: t.sidebarBg }}>
          <div className="flex flex-col items-center justify-center h-full gap-1">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.sidebarAccent + "40" }} />
            <div className="w-6 h-0.5 rounded" style={{ backgroundColor: t.sidebarAccent + "60" }} />
          </div>
        </div>
        <div className="flex-1 bg-white p-1.5">
          <div className="w-8 h-1 rounded mb-1" style={{ backgroundColor: t.accentColor }} />
          <div className="w-full h-0.5 rounded bg-gray-100 mb-1" />
          <div className="w-3/4 h-0.5 rounded bg-gray-100" />
        </div>
      </div>

      <div className="text-xs font-bold text-gray-900">{t.name}</div>
      <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{t.description}</div>
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">Style & Personnalisation</h2>
        <p className="text-sm text-gray-400 mt-1">
          On te recommande un style adapté à ton profil
        </p>
      </div>

      {/* Recommended themes */}
      <div>
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
          Recommandé pour toi
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recommended.map((id, i) => (
            <ThemeCard key={id} t={CV_THEMES[id]} badge={i === 0 ? "Recommandé" : "Compatible"} />
          ))}
        </div>
      </div>

      {/* Other themes */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Autres styles
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {others.map((id) => (
            <ThemeCard key={id} t={CV_THEMES[id]} />
          ))}
        </div>
      </div>

      {/* Free-form style description */}
      <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-4">
        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1.5">
          Décris le style que tu veux
        </p>
        <p className="text-[10px] text-indigo-400 mb-2">
          Dis-nous ce que tu imagines — on adaptera le design
        </p>
        <textarea
          value={styleNote}
          onChange={(e) => {
            setStyleNote(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          rows={2}
          placeholder="Ex: Je veux un CV sobre et élégant pour la banque, avec des tons bleu foncé..."
          className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all resize-none overflow-hidden"
        />
        <div className="mt-2">
          <VoiceButton
            context="style"
            onTranscription={(text) => {
              setStyleNote(prev => prev ? prev + " " + text : text);
            }}
            label="Dicter mes préférences"
          />
        </div>
      </div>

      {/* Custom color toggle */}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className="w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors py-2"
      >
        {showCustom ? "Masquer les couleurs" : "Personnaliser les couleurs"}
      </button>

      {showCustom && (
        <div className="space-y-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <ColorPicker
            label="Couleur sidebar"
            value={customColors.sidebarBg || previewTheme.sidebarBg}
            onChange={(v) => setCustomColors({ ...customColors, sidebarBg: v })}
          />
          <ColorPicker
            label="Couleur accent"
            value={customColors.accentColor || previewTheme.accentColor}
            onChange={(v) => setCustomColors({ ...customColors, accentColor: v })}
          />
          <ColorPicker
            label="Accent sidebar (tags)"
            value={customColors.sidebarAccent || previewTheme.sidebarAccent}
            onChange={(v) => setCustomColors({ ...customColors, sidebarAccent: v })}
          />
          <button
            onClick={() => setCustomColors({ sidebarBg: "", accentColor: "", sidebarAccent: "" })}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Réinitialiser les couleurs
          </button>
        </div>
      )}

      {/* Large preview */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1 bg-gray-50">
          Aperçu
        </div>
        <div className="flex h-40">
          <div className="w-1/3 p-3 flex flex-col gap-2" style={{ backgroundColor: previewTheme.sidebarBg }}>
            <div className="w-8 h-8 rounded-full mx-auto" style={{ backgroundColor: previewTheme.sidebarAccent + "30", border: `2px solid ${previewTheme.sidebarAccent}` }} />
            <div className="space-y-1 mt-1">
              <div className="h-1 w-10 mx-auto rounded" style={{ backgroundColor: previewTheme.sidebarAccent + "60" }} />
              <div className="h-0.5 w-8 mx-auto rounded" style={{ backgroundColor: previewTheme.sidebarAccent + "40" }} />
            </div>
            <div className="flex flex-wrap gap-1 justify-center mt-auto">
              {["A", "B", "C"].map((s) => (
                <span key={s} className="text-[6px] px-1.5 py-0.5 rounded" style={{ backgroundColor: previewTheme.sidebarAccent + "20", color: previewTheme.sidebarAccent }}>{s}</span>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-white p-3">
            <div className="text-xs font-bold" style={{ color: previewTheme.accentColor }}>{cv.header.firstName} {cv.header.lastName}</div>
            <div className="text-[8px] text-gray-400 mt-0.5">{cv.header.title}</div>
            <div className="h-0.5 rounded my-2" style={{ background: `linear-gradient(90deg, ${previewTheme.accentColor}, transparent)` }} />
            <div className="space-y-1">
              <div className="h-1 w-full rounded bg-gray-100" />
              <div className="h-1 w-3/4 rounded bg-gray-100" />
              <div className="h-1 w-5/6 rounded bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 bg-transparent"
        />
        <span className="text-xs text-gray-400 font-mono w-16">{value}</span>
      </div>
    </div>
  );
}
