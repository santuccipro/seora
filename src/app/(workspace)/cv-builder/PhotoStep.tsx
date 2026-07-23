"use client";

import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Camera,
  Check,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { PHOTO_STYLES } from "@/lib/photo-styles";

// ─── Canvas helper ────────────────────────────────────────────────────────────
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const img = new Image();
  img.src = imageSrc;
  await new Promise<void>((res) => { img.onload = () => res(); });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return canvas.toDataURL("image/jpeg", 0.88);
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
}

type Mode = "idle" | "cropping" | "ai-style" | "ai-generating" | "done";

// ─── Component ───────────────────────────────────────────────────────────────
export function PhotoStep({ photoUrl, onPhotoChange }: Props) {
  const [mode, setMode] = useState<Mode>(photoUrl ? "done" : "idle");
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aiPhoto, setAiPhoto] = useState<string | null>(null);
  const [aiStyle, setAiStyle] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Drop zone (idle + ai-style upload) ──
  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5 Mo"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (mode === "ai-style") {
        setAiPhoto(src);
      } else {
        setRawSrc(src);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setMode("cropping");
      }
    };
    reader.readAsDataURL(f);
  }, [mode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
    maxFiles: 1,
    noClick: true,
  });

  // ── Confirm crop ──
  const confirmCrop = async () => {
    if (!rawSrc || !croppedAreaPixels) return;
    try {
      const url = await getCroppedImg(rawSrc, croppedAreaPixels);
      onPhotoChange(url);
      setMode("done");
    } catch {
      toast.error("Erreur lors du recadrage");
    }
  };

  // ── AI generate ──
  const handleAiGenerate = async () => {
    if (!aiPhoto || !aiStyle) { toast.error("Sélectionne un style et uploade ta photo"); return; }
    setAiGenerating(true);
    try {
      const res = await fetch("/api/photo-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: aiPhoto, styleKey: aiStyle }),
      });
      const data = await res.json();
      if (res.status === 403) { toast.error("Pas assez de tokens"); return; }
      if (!res.ok) throw new Error(data.error || "Erreur");
      onPhotoChange(data.resultUrl);
      setMode("done");
      toast.success("Photo pro importée dans ton CV !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de génération");
    } finally {
      setAiGenerating(false);
    }
  };

  // ─── RENDER: done ──────────────────────────────────────────────────────────
  if (mode === "done" && photoUrl) {
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Ta photo" className="h-36 w-36 rounded-full object-cover shadow-lg border-4 border-white ring-2 ring-emerald-300" />
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 shadow">
            <Check className="h-4 w-4 text-white" />
          </div>
        </div>
        <p className="text-sm font-semibold text-gray-700">Photo ajoutée ✓</p>
        <div className="flex gap-3">
          <button
            onClick={() => { setRawSrc(null); setMode("idle"); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Changer
          </button>
          <button
            onClick={() => { onPhotoChange(null); setMode("idle"); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Supprimer
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: cropping ──────────────────────────────────────────────────────
  if (mode === "cropping" && rawSrc) {
    return (
      <div className="flex flex-col gap-5">
        <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-gray-900">
          <Cropper
            image={rawSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, px) => setCroppedAreaPixels(px)}
          />
        </div>
        <div className="flex items-center gap-3 px-1">
          <ZoomIn className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="range" min={1} max={3} step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-1.5 appearance-none rounded-full bg-emerald-200 accent-emerald-500 cursor-pointer"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={confirmCrop}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 text-sm font-bold shadow-md hover:shadow-lg transition-shadow"
          >
            <Check className="h-4 w-4" /> Valider le recadrage
          </button>
          <button
            onClick={() => setMode("idle")}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-500 hover:border-gray-300 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reprendre
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: ai-style / ai-generating ─────────────────────────────────────
  if (mode === "ai-style") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => setMode("idle")} className="text-gray-400 hover:text-gray-700 transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
          <p className="text-sm font-bold text-gray-800">Générer une photo pro avec l&apos;IA</p>
        </div>

        {/* Upload zone for AI */}
        <div
          {...getRootProps()}
          onClick={() => fileRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 cursor-pointer transition-all ${
            aiPhoto ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50/40"
          }`}
        >
          <input {...getInputProps()} ref={fileRef} />
          {aiPhoto ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={aiPhoto} alt="Ta photo" className="h-20 w-20 rounded-full object-cover shadow" />
              <p className="text-xs text-emerald-700 font-semibold">Photo prête — change-la si besoin</p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow">
                <Upload className="h-5 w-5 text-gray-500" />
              </div>
              <p className="text-sm text-gray-600 text-center">Glisse ou clique pour uploader<br /><span className="text-xs text-gray-400">Selfie ou photo existante</span></p>
            </>
          )}
        </div>

        {/* Style grid */}
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2">Choisis un style</p>
          <div className="grid grid-cols-2 gap-2">
            {PHOTO_STYLES.slice(0, 6).map((s) => (
              <button
                key={s.key}
                onClick={() => setAiStyle(s.key)}
                className={`text-left rounded-xl border p-3 transition-all ${
                  aiStyle === s.key ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="text-lg">{s.emoji}</span>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">{s.label}</p>
                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{s.description}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAiGenerate}
          disabled={!aiPhoto || !aiStyle || aiGenerating}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 text-sm font-bold shadow-md hover:shadow-lg transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {aiGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours…</> : <><Sparkles className="h-4 w-4" /> Générer et importer dans mon CV</>}
        </button>
        <p className="text-[11px] text-center text-gray-400">1 token · le résultat est importé directement dans ton CV</p>
      </div>
    );
  }

  // ─── RENDER: idle ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Main drop zone */}
      <div
        {...getRootProps()}
        onClick={() => fileRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all ${
          isDragActive ? "border-emerald-500 bg-emerald-50 scale-[1.01]" : "border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50/40"
        }`}
      >
        <input {...getInputProps()} ref={fileRef} />
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
          {isDragActive ? <ImagePlus className="h-7 w-7 text-emerald-500" /> : <Camera className="h-7 w-7 text-gray-400" />}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">{isDragActive ? "Lâche ta photo ici" : "Glisse ta photo ou clique pour parcourir"}</p>
          <p className="mt-1 text-xs text-gray-400">JPG, PNG, WEBP — max 5 Mo</p>
        </div>
      </div>

      {/* Two action cards */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <Upload className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-xs font-bold text-gray-700">Uploader ma photo</p>
          <p className="text-[11px] text-gray-400">Avec recadrage intégré</p>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onDrop([f]); }} />
        </label>

        <button
          onClick={() => setMode("ai-style")}
          className="flex flex-col items-center gap-2 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-rose-50 p-4 hover:border-pink-300 transition-all text-center"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-rose-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <p className="text-xs font-bold text-gray-700">Photo pro IA</p>
          <p className="text-[11px] text-gray-400">Générée &amp; importée direct</p>
        </button>
      </div>

      {/* Skip */}
      <button
        onClick={() => { onPhotoChange(null); }}
        className="text-xs text-gray-400 hover:text-gray-600 underline text-center transition-colors"
      >
        Continuer sans photo →
      </button>
    </div>
  );
}
