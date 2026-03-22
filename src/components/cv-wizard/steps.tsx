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
  Move,
} from "lucide-react";
import type { StructuredCV, CVTheme, CVThemeId } from "@/lib/cv-types";
import { CV_THEMES } from "@/lib/cv-types";
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

/* ─── Photo editor with crop circle (Instagram-style) ─── */
const CROP_SIZE = 250; // crop circle diameter — large enough for mobile
const CROP_EXPORT = 400; // exported image resolution
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function getTouchDistance(t1: Touch, t2: Touch) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function PhotoEditor({
  photoUrl,
  onCrop,
  onRemove,
}: {
  photoUrl: string;
  onCrop: (dataUrl: string) => void;
  onRemove: () => void;
}) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgAspect, setImgAspect] = useState(1);

  // Refs for gesture state (no re-renders during drag)
  const dragState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });
  const pinchState = useRef({
    active: false,
    startDist: 0,
    startZoom: 1,
  });
  const currentZoom = useRef(MIN_ZOOM);
  const currentPos = useRef({ x: 0, y: 0 });

  const clampPosition = useCallback(
    (x: number, y: number, z: number) => {
      const imgW = CROP_SIZE * imgAspect * z;
      const imgH = CROP_SIZE * z;
      const maxX = Math.max(0, (imgW - CROP_SIZE) / 2);
      const maxY = Math.max(0, (imgH - CROP_SIZE) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [imgAspect],
  );

  const exportCrop = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_EXPORT;
    canvas.height = CROP_EXPORT;
    const ctx = canvas.getContext("2d")!;

    const z = currentZoom.current;
    const pos = currentPos.current;
    const displayH = CROP_SIZE * z;
    const scaleToNatural = img.naturalHeight / displayH;
    const cropNatural = CROP_SIZE * scaleToNatural;
    const cx = (img.naturalWidth - cropNatural) / 2 - pos.x * scaleToNatural;
    const cy = (img.naturalHeight - cropNatural) / 2 - pos.y * scaleToNatural;

    ctx.beginPath();
    ctx.arc(CROP_EXPORT / 2, CROP_EXPORT / 2, CROP_EXPORT / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, cx, cy, cropNatural, cropNatural, 0, 0, CROP_EXPORT, CROP_EXPORT);
    onCrop(canvas.toDataURL("image/jpeg", 0.85));
  }, [onCrop]);

  // ── Touch events (native) for pinch-to-zoom + drag ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        // Start pinch
        pinchState.current = {
          active: true,
          startDist: getTouchDistance(e.touches[0], e.touches[1]),
          startZoom: currentZoom.current,
        };
        dragState.current.active = false;
      } else if (e.touches.length === 1) {
        // Start drag
        dragState.current = {
          active: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          posX: currentPos.current.x,
          posY: currentPos.current.y,
        };
        pinchState.current.active = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (pinchState.current.active && e.touches.length === 2) {
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const ratio = dist / pinchState.current.startDist;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchState.current.startZoom * ratio));
        currentZoom.current = newZoom;
        const clamped = clampPosition(currentPos.current.x, currentPos.current.y, newZoom);
        currentPos.current = clamped;
        setZoom(newZoom);
        setPosition(clamped);
      } else if (dragState.current.active && e.touches.length === 1) {
        const dx = e.touches[0].clientX - dragState.current.startX;
        const dy = e.touches[0].clientY - dragState.current.startY;
        const clamped = clampPosition(
          dragState.current.posX + dx,
          dragState.current.posY + dy,
          currentZoom.current,
        );
        currentPos.current = clamped;
        setPosition(clamped);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        dragState.current.active = false;
        pinchState.current.active = false;
        exportCrop();
      } else if (e.touches.length === 1) {
        // Went from pinch to single finger — restart drag from current touch
        pinchState.current.active = false;
        dragState.current = {
          active: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          posX: currentPos.current.x,
          posY: currentPos.current.y,
        };
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [clampPosition, exportCrop]);

  // ── Mouse drag (desktop) ──
  const handleMouseDown = (e: React.MouseEvent) => {
    dragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      posX: currentPos.current.x,
      posY: currentPos.current.y,
    };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current.active) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      const clamped = clampPosition(
        dragState.current.posX + dx,
        dragState.current.posY + dy,
        currentZoom.current,
      );
      currentPos.current = clamped;
      setPosition(clamped);
    };
    const onMouseUp = () => {
      dragState.current.active = false;
      exportCrop();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleZoomChange = (newZoom: number) => {
    currentZoom.current = newZoom;
    const clamped = clampPosition(currentPos.current.x, currentPos.current.y, newZoom);
    currentPos.current = clamped;
    setZoom(newZoom);
    setPosition(clamped);
  };

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (img && img.naturalWidth) {
      const aspect = img.naturalWidth / img.naturalHeight;
      setImgAspect(aspect);
      // Auto-zoom so shortest side fills the crop circle
      const fitZoom = aspect >= 1 ? 1 : 1 / aspect;
      const initialZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitZoom));
      currentZoom.current = initialZoom;
      currentPos.current = { x: 0, y: 0 };
      setZoom(initialZoom);
      setPosition({ x: 0, y: 0 });
      // Auto-export initial crop
      setTimeout(() => exportCrop(), 50);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Crop container */}
        <div
          ref={containerRef}
          className="relative cursor-grab active:cursor-grabbing select-none overflow-hidden rounded-full"
          style={{
            width: CROP_SIZE,
            height: CROP_SIZE,
            touchAction: "none",
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Image layer */}
          <img
            ref={imgRef}
            src={photoUrl}
            alt="Photo"
            className="pointer-events-none select-none"
            style={{
              position: "absolute",
              height: `${zoom * 100}%`,
              width: "auto",
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            }}
            draggable={false}
            onLoad={handleImageLoad}
          />
          {/* Crop circle border + dark overlay outside */}
          <div
            className="absolute inset-0 rounded-full border-[3px] border-indigo-400 pointer-events-none"
            style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}
          />
        </div>
        {/* Remove button */}
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors z-10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Drag / pinch hint */}
      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        <Move className="h-3.5 w-3.5" /> Glisser pour repositionner
      </p>

      {/* Zoom slider — big and thumb-friendly */}
      <div className="flex items-center gap-3 w-full max-w-[280px] px-2">
        <ZoomIn className="h-5 w-5 text-gray-400 shrink-0" />
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.02}
          value={zoom}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
          onMouseUp={exportCrop}
          onTouchEnd={exportCrop}
          className="flex-1 h-2.5 accent-indigo-500 rounded-full"
          style={{ WebkitAppearance: "none", appearance: "none" }}
        />
        <span className="text-xs text-gray-400 w-10 text-right font-medium">
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*           STEP 1 — Contact Info                 */
/* ═══════════════════════════════════════════════ */
export function StepContact({ cv, updateHeader }: StepProps) {
  /* Keep raw (full-res) image for the photo editor, separate from cropped */
  const [rawPhoto, setRawPhoto] = useState<string>("");

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setRawPhoto(dataUrl);
      // Also do initial center crop for the CV
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
      img.src = dataUrl;
    };
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
        {cv.header.photoUrl || rawPhoto ? (
          <PhotoEditor
            photoUrl={rawPhoto || cv.header.photoUrl || ""}
            onCrop={(dataUrl) => updateHeader("photoUrl", dataUrl)}
            onRemove={() => {
              updateHeader("photoUrl", "");
              setRawPhoto("");
            }}
          />
        ) : (
          <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-indigo-300 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50/50 transition-colors">
            <Camera className="h-6 w-6 text-indigo-400 mb-1" />
            <span className="text-[10px] text-indigo-400 font-medium">Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
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

      <div className="grid grid-cols-2 gap-3">
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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

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
          onChange={(e) =>
            setCv((prev) => ({ ...prev, summary: e.target.value }))
          }
          rows={5}
          placeholder="Professionnel expérimenté avec 5+ ans d'expérience en..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <VoiceButton
          onRecordingComplete={(blob) => {
            setAudioBlob(blob);
            // TODO: Send to Whisper API for transcription
          }}
          label="Dicter mon profil"
        />
        {audioBlob && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            Audio enregistré ({(audioBlob.size / 1024).toFixed(0)} KB)
          </span>
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
            onRecordingComplete={() => {
              // TODO: transcribe and parse skills
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

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
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
                <span className="mt-3 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                <input
                  value={bullet}
                  onChange={(e) => {
                    const newBullets = [...exp.bullets];
                    newBullets[bi] = e.target.value;
                    updateExp(i, "bullets", newBullets);
                  }}
                  placeholder="Décris une réalisation..."
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-base placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
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
            onRecordingComplete={() => {
              // TODO: transcribe and fill description
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

          <div className="grid grid-cols-2 gap-3">
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

export function StepStyle({
  cv,
  selectedTheme,
  setSelectedTheme,
  customColors,
  setCustomColors,
}: StepStyleProps) {
  const allThemes = Object.values(CV_THEMES);
  const theme = CV_THEMES[selectedTheme];
  const [showCustom, setShowCustom] = useState(false);

  // Mini preview
  const previewTheme: CVTheme = {
    ...theme,
    sidebarBg: customColors.sidebarBg || theme.sidebarBg,
    accentColor: customColors.accentColor || theme.accentColor,
    sidebarAccent: customColors.sidebarAccent || theme.sidebarAccent,
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">Style & Personnalisation</h2>
        <p className="text-sm text-gray-400 mt-1">
          Choisis un thème et personnalise les couleurs
        </p>
      </div>

      {/* Theme grid */}
      <div className="grid grid-cols-2 gap-3">
        {allThemes.map((t) => (
          <button
            key={t.id}
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
            {selectedTheme === t.id && (
              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}

            {/* Mini preview */}
            <div className="flex rounded-lg overflow-hidden h-16 mb-2 shadow-sm">
              <div
                className="w-1/3"
                style={{ backgroundColor: t.sidebarBg }}
              >
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: t.sidebarAccent + "40" }}
                  />
                  <div
                    className="w-6 h-0.5 rounded"
                    style={{ backgroundColor: t.sidebarAccent + "60" }}
                  />
                </div>
              </div>
              <div className="flex-1 bg-white p-1.5">
                <div
                  className="w-8 h-1 rounded mb-1"
                  style={{ backgroundColor: t.accentColor }}
                />
                <div className="w-full h-0.5 rounded bg-gray-100 mb-1" />
                <div className="w-3/4 h-0.5 rounded bg-gray-100" />
              </div>
            </div>

            <div className="text-xs font-bold text-gray-900">{t.name}</div>
            <div className="text-[10px] text-gray-400 leading-tight mt-0.5">
              {t.description}
            </div>
          </button>
        ))}
      </div>

      {/* Custom color toggle */}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className="w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors py-2"
      >
        {showCustom ? "Masquer" : "Personnaliser les couleurs"}
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
          <div
            className="w-1/3 p-3 flex flex-col gap-2"
            style={{ backgroundColor: previewTheme.sidebarBg }}
          >
            <div
              className="w-8 h-8 rounded-full mx-auto"
              style={{ backgroundColor: previewTheme.sidebarAccent + "30", border: `2px solid ${previewTheme.sidebarAccent}` }}
            />
            <div className="space-y-1 mt-1">
              <div className="h-1 w-10 mx-auto rounded" style={{ backgroundColor: previewTheme.sidebarAccent + "60" }} />
              <div className="h-0.5 w-8 mx-auto rounded" style={{ backgroundColor: previewTheme.sidebarAccent + "40" }} />
            </div>
            <div className="flex flex-wrap gap-1 justify-center mt-auto">
              {["A", "B", "C"].map((s) => (
                <span
                  key={s}
                  className="text-[6px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: previewTheme.sidebarAccent + "20",
                    color: previewTheme.sidebarAccent,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-white p-3">
            <div className="text-xs font-bold" style={{ color: previewTheme.accentColor }}>
              {cv.header.firstName} {cv.header.lastName}
            </div>
            <div className="text-[8px] text-gray-400 mt-0.5">{cv.header.title}</div>
            <div
              className="h-0.5 rounded my-2"
              style={{ background: `linear-gradient(90deg, ${previewTheme.accentColor}, transparent)` }}
            />
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
