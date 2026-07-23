"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ImageIcon,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";

// ─── Canvas crop helper ─────────────────────────────────────────────────────
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageSrc;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponible");
  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );
  return canvas.toDataURL("image/jpeg", 0.88);
}

// ─── CORS-safe loader ───────────────────────────────────────────────────────
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

async function toSafeDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  const res = await fetch(src, { mode: "cors" });
  if (!res.ok) throw new Error("Impossible de charger l'image");
  const blob = await res.blob();
  return blobToDataUrl(blob);
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;

// ─── Photo Pro IA types & options ───────────────────────────────────────────
type PhotoFond = "neutre" | "blanc" | "sombre" | "nature" | "bureau" | "colore";
type PhotoTonalite = "classique" | "chaleureux" | "decontracte" | "dynamique";
type PhotoPose = "face" | "trois_quarts" | "bras_croises";
type PhotoExpression = "souriant" | "neutre" | "serieux" | "confiant";
type PhotoTenue = "costume_noir" | "costume_gris" | "costume_bleu" | "chemise_blanche" | "polo" | "decontracte";

const FOND_OPTIONS: { id: PhotoFond; label: string; desc: string }[] = [
  { id: "neutre", label: "Gris neutre", desc: "LinkedIn" },
  { id: "blanc", label: "Blanc épuré", desc: "Studio" },
  { id: "sombre", label: "Sombre", desc: "Premium" },
  { id: "nature", label: "Nature", desc: "Outdoor" },
  { id: "bureau", label: "Bureau", desc: "Open space" },
  { id: "colore", label: "Coloré", desc: "Créatif" },
];

const TONALITE_OPTIONS: { id: PhotoTonalite; label: string; desc: string }[] = [
  { id: "classique", label: "Classique", desc: "Sérieux · corporate" },
  { id: "chaleureux", label: "Chaleureux", desc: "Souriant · accueillant" },
  { id: "decontracte", label: "Décontracté", desc: "Casual · startup" },
  { id: "dynamique", label: "Dynamique", desc: "Impactant · énergique" },
];

const POSE_OPTIONS: { id: PhotoPose; label: string; desc: string }[] = [
  { id: "face", label: "Face caméra", desc: "Classique frontale" },
  { id: "trois_quarts", label: "3/4 tourné", desc: "Légèrement de côté" },
  { id: "bras_croises", label: "Bras croisés", desc: "Posture de confiance" },
];

const EXPRESSION_OPTIONS: { id: PhotoExpression; label: string; desc: string }[] = [
  { id: "souriant", label: "Souriant", desc: "Sourire chaleureux" },
  { id: "neutre", label: "Neutre", desc: "Expression naturelle" },
  { id: "serieux", label: "Sérieux", desc: "Regard direct, fort" },
  { id: "confiant", label: "Confiant", desc: "Léger sourire, charisme" },
];

const TENUE_OPTIONS: { id: PhotoTenue; label: string; desc: string }[] = [
  { id: "costume_noir", label: "Costume noir", desc: "Executive · banque" },
  { id: "costume_gris", label: "Costume gris", desc: "Corporate classique" },
  { id: "costume_bleu", label: "Costume bleu", desc: "Business formel" },
  { id: "chemise_blanche", label: "Chemise blanche", desc: "Smart casual" },
  { id: "polo", label: "Polo", desc: "Casual pro" },
  { id: "decontracte", label: "Décontracté", desc: "Startup · créatif" },
];

const AI_LOADING_MSGS = [
  "Génération en cours… chaque photo est unique",
  "L'IA personnalise chaque photo avec ton style…",
  "4 photos haute qualité en cours…",
  "Tes photos arrivent bientôt…",
  "Finalisation…",
];

// ─── Types ──────────────────────────────────────────────────────────────────
interface Props {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
}

type Mode = "idle" | "cropping" | "done";

interface PhotoGeneration {
  id: string;
  imageUrls: string[];
  fond: string;
  tonalite: string;
  createdAt: string;
}

// ─── Component ──────────────────────────────────────────────────────────────
export function PhotoStep({ photoUrl, onPhotoChange }: Props) {
  const [mode, setMode] = useState<Mode>(photoUrl ? "done" : "idle");

  // Crop state
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropLoading, setCropLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // AI accordion state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSelfie, setAiSelfie] = useState<string | null>(null);
  const [aiSelfieFile, setAiSelfieFile] = useState<File | null>(null);
  const [aiDragOver, setAiDragOver] = useState(false);
  const aiSelfieRef = useRef<HTMLInputElement>(null);

  // Photo Pro IA criteria
  const [photoFond, setPhotoFond] = useState<PhotoFond>("neutre");
  const [photoTonalite, setPhotoTonalite] = useState<PhotoTonalite>("classique");
  const [photoPose, setPhotoPose] = useState<PhotoPose>("face");
  const [photoExpression, setPhotoExpression] = useState<PhotoExpression>("neutre");
  const [photoTenue, setPhotoTenue] = useState<PhotoTenue>("costume_noir");
  const [photoNotes, setPhotoNotes] = useState("");

  // AI generation state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProgressMsg, setAiProgressMsg] = useState(0);
  const [aiResultUrls, setAiResultUrls] = useState<string[] | null>(null);

  // Gallery state
  const [gallery, setGallery] = useState<PhotoGeneration[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  // ── Load past AI generations on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/photo-pro");
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { generations?: PhotoGeneration[] };
        if (!cancelled) setGallery(data.generations ?? []);
      } catch {
        // Silent — gallery is optional.
      } finally {
        if (!cancelled) setGalleryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Enter crop mode ──
  const startCropping = useCallback(
    async (src: string) => {
      setCropLoading(true);
      setMode("cropping");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      try {
        const safe = await toSafeDataUrl(src);
        setRawSrc(safe);
      } catch {
        toast.error("Impossible de charger cette image");
        setMode(photoUrl ? "done" : "idle");
      } finally {
        setCropLoading(false);
      }
    },
    [photoUrl],
  );

  // ── Main drop zone ──
  const onDrop = useCallback(
    (files: File[]) => {
      const f = files[0];
      if (!f) return;
      if (f.size > MAX_FILE_BYTES) {
        toast.error("Image trop lourde (max 8 Mo)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => { void startCropping(e.target?.result as string); };
      reader.readAsDataURL(f);
    },
    [startCropping],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
  });

  // ── Confirm crop ──
  const confirmCrop = async () => {
    if (!rawSrc || !croppedAreaPixels) return;
    setConfirming(true);
    try {
      const url = await getCroppedImg(rawSrc, croppedAreaPixels);
      onPhotoChange(url);
      setMode("done");
    } catch {
      toast.error("Erreur lors du recadrage");
    } finally {
      setConfirming(false);
    }
  };

  const cancelCrop = () => {
    setRawSrc(null);
    setMode(photoUrl ? "done" : "idle");
  };

  // ── AI selfie file handler ──
  const handleAiSelfieFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Format non supporté"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image trop lourde (max 10 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = (e) => setAiSelfie(e.target?.result as string);
    reader.readAsDataURL(file);
    setAiSelfieFile(file);
  };

  // ── Reset AI wizard ──
  const resetAiWizard = () => {
    setAiSelfie(null);
    setAiSelfieFile(null);
    setPhotoFond("neutre");
    setPhotoTonalite("classique");
    setPhotoPose("face");
    setPhotoExpression("neutre");
    setPhotoTenue("costume_noir");
    setPhotoNotes("");
    setAiProgress(0);
    setAiResultUrls(null);
  };

  // ── AI generate via Photo Pro IA API ──
  const handleAiGenerate = async () => {
    if (!aiSelfieFile) return;
    setAiGenerating(true);
    setAiProgress(0);
    setAiProgressMsg(0);
    setAiResultUrls(null);

    const start = Date.now();
    const progIv = setInterval(() => {
      const elapsed = Date.now() - start;
      setAiProgress(() => {
        if (elapsed < 44000) return (elapsed / 44000) * 85;
        return Math.min(98, (elapsed - 44000) * 0.04 / 300 + 85);
      });
    }, 300);
    const msgIv = setInterval(() => setAiProgressMsg((p) => (p + 1) % AI_LOADING_MSGS.length), 4000);

    try {
      const fd = new FormData();
      fd.append("photo", aiSelfieFile);
      fd.append("fond", photoFond);
      fd.append("tonalite", photoTonalite);
      fd.append("pose", photoPose);
      fd.append("expression", photoExpression);
      fd.append("tenue", photoTenue);
      if (photoNotes.trim()) fd.append("notes", photoNotes.trim());

      const res = await fetch("/api/photo-pro", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) { toast.error(data.error || "Pas assez de tokens"); return; }
      if (!res.ok) throw new Error(data.error || "Erreur de génération");
      setAiProgress(100);
      setTimeout(() => setAiResultUrls(data.urls ?? []), 400);
      toast.success("Photos générées !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de génération");
      setAiProgress(0);
    } finally {
      clearInterval(progIv);
      clearInterval(msgIv);
      setAiGenerating(false);
    }
  };

  // ─── RENDER: cropping ──────────────────────────────────────────────────────
  if (mode === "cropping") {
    return (
      <div className="flex flex-col gap-5">
        <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-gray-900">
          {cropLoading || !rawSrc ? (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
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
          )}
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomIn className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-emerald-200 accent-emerald-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={confirmCrop}
            disabled={cropLoading || !rawSrc || !croppedAreaPixels || confirming}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-md transition-shadow hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirming ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Recadrage…</>
            ) : (
              <><Check className="h-4 w-4" /> Valider le recadrage</>
            )}
          </button>
          <button
            type="button"
            onClick={cancelCrop}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-500 transition-colors hover:border-gray-300"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Annuler
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: done ──────────────────────────────────────────────────────────
  if (mode === "done" && photoUrl) {
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Ta photo"
            className="h-36 w-36 rounded-full border-4 border-white object-cover shadow-lg ring-2 ring-emerald-300"
          />
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 shadow">
            <Check className="h-4 w-4 text-white" />
          </div>
        </div>
        <p className="text-sm font-semibold text-gray-700">Photo ajoutée ✓</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => startCropping(photoUrl)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <ZoomIn className="h-3.5 w-3.5" /> Recadrer
          </button>
          <button
            type="button"
            onClick={() => { setRawSrc(null); setMode("idle"); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Changer
          </button>
          <button
            type="button"
            onClick={() => { onPhotoChange(null); setMode("idle"); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
          >
            <X className="h-3.5 w-3.5" /> Supprimer
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: idle ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Single drop zone */}
      <div
        {...getRootProps()}
        onClick={open}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
        }}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all ${
          isDragActive
            ? "scale-[1.01] border-emerald-500 bg-emerald-50"
            : "border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50/40"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
          {isDragActive ? (
            <ImagePlus className="h-7 w-7 text-emerald-500" />
          ) : (
            <Upload className="h-7 w-7 text-gray-400" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">
            {isDragActive ? "Lâche ta photo ici" : "Glisse ta photo ou clique pour parcourir"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Tu pourras la recadrer juste après · JPG, PNG, WEBP — max 8 Mo
          </p>
        </div>
      </div>

      {/* AI accordion */}
      <div className="overflow-hidden rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/60 to-rose-50/60">
        <button
          type="button"
          onClick={() => {
            if (aiOpen) resetAiWizard();
            setAiOpen((v) => !v);
          }}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-pink-50/60"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 shadow-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span>
              <span className="block text-sm font-bold text-gray-800">Générer avec l&apos;IA</span>
              <span className="block text-[11px] text-gray-500">
                Une photo pro à partir d&apos;un selfie · 2 tokens
              </span>
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${aiOpen ? "rotate-180" : ""}`}
          />
        </button>

        {aiOpen && (
          <>
            {/* ── Generating overlay ── */}
            {aiGenerating && (
              <div className="border-t border-pink-100 px-4 py-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500">
                      <Sparkles className="h-4 w-4 animate-pulse text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Génération IA en cours</p>
                      <p className="text-xs text-gray-400">4 photos haute qualité · ~45 secondes</p>
                    </div>
                    <span className="ml-auto text-sm font-bold text-pink-600">
                      {Math.round(aiProgress)}%
                    </span>
                  </div>
                  <div className="mb-4">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-300"
                        style={{ width: `${aiProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center rounded-xl border border-pink-200 bg-pink-50 px-3 py-2">
                    <p className="text-center text-sm font-medium text-pink-700">
                      {AI_LOADING_MSGS[aiProgressMsg]}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Result: 2×2 grid ── */}
            {!aiGenerating && aiResultUrls && (
              <div className="flex flex-col gap-3 border-t border-pink-100 px-4 py-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm font-bold text-gray-900">
                    {aiResultUrls.length} photo{aiResultUrls.length > 1 ? "s" : ""} générée{aiResultUrls.length > 1 ? "s" : ""} — clique pour importer
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {aiResultUrls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setAiOpen(false);
                        resetAiWizard();
                        void startCropping(url);
                      }}
                      className="group relative aspect-square overflow-hidden rounded-2xl border-2 border-transparent bg-gray-100 transition-all hover:border-emerald-400 hover:ring-2 hover:ring-emerald-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-emerald-600/20">
                        <div className="rounded-full bg-white p-1.5 opacity-0 shadow transition-opacity group-hover:opacity-100">
                          <Check className="h-4 w-4 text-emerald-600" />
                        </div>
                      </div>
                      <div className="absolute left-1.5 top-1.5 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                        #{i + 1}
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { setAiResultUrls(null); setAiSelfie(null); setAiSelfieFile(null); }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Générer un nouveau set
                </button>
              </div>
            )}

            {/* ── Selfie dropzone (no selfie yet) ── */}
            {!aiGenerating && !aiResultUrls && !aiSelfie && (
              <div className="border-t border-pink-100 px-4 py-4">
                <input
                  ref={aiSelfieRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAiSelfieFile(f); }}
                />
                <div
                  onDragOver={(e) => { e.preventDefault(); setAiDragOver(true); }}
                  onDragLeave={() => setAiDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setAiDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f) handleAiSelfieFile(f);
                  }}
                  onClick={() => aiSelfieRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 transition-colors ${
                    aiDragOver
                      ? "border-pink-500 bg-pink-50/60"
                      : "border-pink-200 hover:border-pink-400 hover:bg-pink-50/30"
                  }`}
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100">
                    <Upload className="h-5 w-5 text-pink-600" />
                  </div>
                  <p className="mb-1 text-base font-bold text-gray-900">
                    {aiDragOver ? "Lâche ton selfie ici" : "Glisse ton selfie ici"}
                  </p>
                  <p className="mb-4 text-xs text-gray-500">JPG, PNG, HEIC ou WEBP · Max 10 Mo</p>
                  <div className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md">
                    Parcourir mes fichiers
                  </div>
                </div>
              </div>
            )}

            {/* ── Criteria pickers (selfie uploaded) ── */}
            {!aiGenerating && !aiResultUrls && aiSelfie && (
              <div className="flex flex-col gap-3 border-t border-pink-100 px-4 py-4">
                <input
                  ref={aiSelfieRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAiSelfieFile(f); }}
                />

                {/* Selfie preview */}
                <div className="flex items-center gap-3 rounded-xl border border-pink-200 bg-pink-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={aiSelfie} alt="Selfie" className="h-14 w-14 rounded-lg object-cover shadow" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">Selfie prêt</p>
                    <p className="text-xs text-gray-500">Configure ton style ci-dessous</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => aiSelfieRef.current?.click()}
                    className="text-xs font-semibold text-gray-500 underline transition-colors hover:text-gray-900"
                  >
                    Changer
                  </button>
                </div>

                {/* Fond */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">Fond</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FOND_OPTIONS.map((s) => {
                      const active = photoFond === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setPhotoFond(s.id)}
                          className={`rounded-lg border px-2 py-1.5 text-left transition-all ${
                            active ? "border-pink-500 bg-pink-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <p className={`text-[10px] font-bold leading-tight ${active ? "text-pink-900" : "text-gray-800"}`}>{s.label}</p>
                          <p className={`text-[8px] leading-tight ${active ? "text-pink-400" : "text-gray-400"}`}>{s.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tenue */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">Tenue</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TENUE_OPTIONS.map((s) => {
                      const active = photoTenue === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setPhotoTenue(s.id)}
                          className={`rounded-lg border px-2 py-1.5 text-left transition-all ${
                            active ? "border-pink-500 bg-pink-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <p className={`text-[10px] font-bold leading-tight ${active ? "text-pink-900" : "text-gray-800"}`}>{s.label}</p>
                          <p className={`text-[8px] leading-tight ${active ? "text-pink-400" : "text-gray-400"}`}>{s.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tonalité */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">Tonalité</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TONALITE_OPTIONS.map((s) => {
                      const active = photoTonalite === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setPhotoTonalite(s.id)}
                          className={`rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                            active ? "border-pink-500 bg-pink-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <p className={`text-[10px] font-bold leading-tight ${active ? "text-pink-900" : "text-gray-800"}`}>{s.label}</p>
                          <p className={`text-[8px] leading-tight ${active ? "text-pink-400" : "text-gray-400"}`}>{s.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pose */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">Pose</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {POSE_OPTIONS.map((s) => {
                      const active = photoPose === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setPhotoPose(s.id)}
                          className={`rounded-lg border px-2 py-1.5 text-left transition-all ${
                            active ? "border-pink-500 bg-pink-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <p className={`text-[10px] font-bold leading-tight ${active ? "text-pink-900" : "text-gray-800"}`}>{s.label}</p>
                          <p className={`text-[8px] leading-tight ${active ? "text-pink-400" : "text-gray-400"}`}>{s.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expression */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">Expression</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EXPRESSION_OPTIONS.map((s) => {
                      const active = photoExpression === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setPhotoExpression(s.id)}
                          className={`rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                            active ? "border-pink-500 bg-pink-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <p className={`text-[10px] font-bold leading-tight ${active ? "text-pink-900" : "text-gray-800"}`}>{s.label}</p>
                          <p className={`text-[8px] leading-tight ${active ? "text-pink-400" : "text-gray-400"}`}>{s.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Précisions <span className="font-normal normal-case text-gray-400">(optionnel)</span>
                  </p>
                  <textarea
                    value={photoNotes}
                    onChange={(e) => setPhotoNotes(e.target.value)}
                    placeholder="Ex : lunettes, badge entreprise, couleur cravate..."
                    rows={2}
                    className="w-full resize-none rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs placeholder-gray-300 focus:border-pink-400 focus:outline-none"
                  />
                </div>

                {/* Generate */}
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition-shadow hover:shadow-xl"
                >
                  <Sparkles className="h-4 w-4" /> Générer ma photo pro
                </button>
                <p className="text-center text-[11px] text-gray-400">2 tokens · 4 photos HD · ~45 secondes</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Gallery of past AI generations */}
      {(galleryLoading || gallery.length > 0) && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
            <ImageIcon className="h-3.5 w-3.5" /> Tes photos générées
          </p>
          {galleryLoading ? (
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {gallery.flatMap((g) =>
                g.imageUrls.map((url, i) => (
                  <button
                    key={`${g.id}-${i}`}
                    type="button"
                    onClick={() => startCropping(url)}
                    className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 transition-all hover:border-emerald-400 hover:ring-2 hover:ring-emerald-200"
                    title="Utiliser cette photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Photo générée"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-emerald-600/0 opacity-0 transition-all group-hover:bg-emerald-600/30 group-hover:opacity-100">
                      <span className="rounded-full bg-white p-1 shadow">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      </span>
                    </span>
                  </button>
                )),
              )}
            </div>
          )}
        </div>
      )}

      {/* Skip */}
      <button
        type="button"
        onClick={() => onPhotoChange(null)}
        className="text-center text-xs text-gray-400 underline transition-colors hover:text-gray-600"
      >
        Continuer sans photo →
      </button>
    </div>
  );
}
