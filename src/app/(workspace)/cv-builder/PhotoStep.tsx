"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  ArrowLeft,
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
import { PHOTO_STYLES, type PhotoStyle } from "@/lib/photo-styles";

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

const GENERATING_STEPS = [
  "Analyse du style sélectionné...",
  "Traitement de ta photo...",
  "Transformation professionnelle en cours...",
  "Application de l'éclairage studio...",
  "Finalisation HD...",
];

// ─── Types ──────────────────────────────────────────────────────────────────
interface Props {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
}

type Mode = "idle" | "cropping" | "done";
type AiWizardStep = "pick-style" | "upload" | "result";

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
  const [aiWizardStep, setAiWizardStep] = useState<AiWizardStep>("pick-style");
  const [aiSelectedStyle, setAiSelectedStyle] = useState<PhotoStyle | null>(null);
  const [aiSelfie, setAiSelfie] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenStepIndex, setAiGenStepIndex] = useState(0);
  const [aiResultUrl, setAiResultUrl] = useState<string | null>(null);

  // Gallery state
  const [gallery, setGallery] = useState<PhotoGeneration[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  // ── Load the user's past AI generations on mount ──
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
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Enter crop mode with any image source ──
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
      reader.onload = (e) => {
        const src = e.target?.result as string;
        void startCropping(src);
      };
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

  // ── AI selfie drop zone ──
  const onAiSelfieDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Réduis la taille de ta photo (max 5 Mo)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setAiSelfie(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const {
    getRootProps: getAiRootProps,
    getInputProps: getAiInputProps,
    isDragActive: isAiDragActive,
  } = useDropzone({
    onDrop: onAiSelfieDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/heic": [".heic"],
    },
    maxFiles: 1,
    multiple: false,
  });

  // ── Confirm crop → produce data URL and commit ──
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

  // ── Reset AI wizard ──
  const resetAiWizard = () => {
    setAiWizardStep("pick-style");
    setAiSelectedStyle(null);
    setAiSelfie(null);
    setAiResultUrl(null);
    setAiGenStepIndex(0);
  };

  // ── AI: generate → route result through crop modal ──
  const handleAiGenerate = async () => {
    if (!aiSelfie || !aiSelectedStyle) return;
    setAiGenerating(true);
    setAiGenStepIndex(0);

    const stepInterval = setInterval(() => {
      setAiGenStepIndex((prev) =>
        prev < GENERATING_STEPS.length - 1 ? prev + 1 : prev,
      );
    }, 8000);

    try {
      const res = await fetch("/api/photo-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: aiSelfie, styleKey: aiSelectedStyle.key }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        toast.error(data.error || "Pas assez de tokens");
        return;
      }
      if (!res.ok || !data.resultUrl) {
        throw new Error(data.error || "Erreur de génération");
      }
      setAiResultUrl(data.resultUrl as string);
      setAiWizardStep("result");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de génération");
    } finally {
      clearInterval(stepInterval);
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
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Recadrage…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Valider le recadrage
              </>
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
            onClick={() => {
              setRawSrc(null);
              setMode("idle");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Changer
          </button>
          <button
            type="button"
            onClick={() => {
              onPhotoChange(null);
              setMode("idle");
            }}
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
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
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
            {/* ── Wizard step: pick-style ── */}
            {aiWizardStep === "pick-style" && (
              <div className="border-t border-pink-100 px-4 py-4">
                <p className="mb-4 text-sm font-semibold text-gray-700">
                  Choisis ton secteur professionnel
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {PHOTO_STYLES.map((style) => (
                    <button
                      key={style.key}
                      type="button"
                      onClick={() => {
                        setAiSelectedStyle(style);
                        setAiWizardStep("upload");
                      }}
                      className="group relative overflow-hidden rounded-2xl text-left transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      style={{ background: style.bgGradient }}
                    >
                      <div className="p-4 pb-5">
                        <div className="mb-3 text-3xl leading-none">{style.emoji}</div>
                        <p className="mb-1 text-sm font-bold leading-tight text-white">
                          {style.label}
                        </p>
                        <p className="line-clamp-2 text-[11px] leading-snug text-white/70">
                          {style.description}
                        </p>
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-white/0 transition-colors group-hover:bg-white/10" />
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs text-gray-400">
                  10 styles · Génération IA · Portrait HD
                </p>
              </div>
            )}

            {/* ── Wizard step: upload ── */}
            {aiWizardStep === "upload" && (
              <div className="flex flex-col gap-4 border-t border-pink-100 px-4 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setAiWizardStep("pick-style");
                    setAiSelfie(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Changer de style
                </button>

                {aiSelectedStyle && (
                  <div
                    className="flex items-center gap-4 rounded-2xl p-4"
                    style={{ background: aiSelectedStyle.bgGradient }}
                  >
                    <div className="text-4xl leading-none">{aiSelectedStyle.emoji}</div>
                    <div>
                      <p className="text-base font-bold text-white">{aiSelectedStyle.label}</p>
                      <p className="mt-0.5 text-xs text-white/70">{aiSelectedStyle.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiWizardStep("pick-style")}
                      className="ml-auto text-[11px] font-semibold text-white/80 underline underline-offset-2 transition-colors hover:text-white"
                    >
                      Changer
                    </button>
                  </div>
                )}

                {aiGenerating && (
                  <div className="rounded-2xl border border-gray-100 bg-white p-6">
                    <div className="flex flex-col items-center">
                      <div className="relative mb-4">
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
                          style={{ background: aiSelectedStyle?.bgGradient }}
                        >
                          <span className="text-3xl">{aiSelectedStyle?.emoji}</span>
                        </div>
                        <div
                          className="absolute -inset-3 animate-spin rounded-3xl border-2 border-indigo-300/40"
                          style={{ borderStyle: "dashed", animationDuration: "3s" }}
                        />
                      </div>
                      <div className="mb-2 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                        <p className="text-sm font-semibold text-gray-800">
                          {GENERATING_STEPS[aiGenStepIndex]}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400">Cela prend en général 1 à 3 minutes</p>
                      <div className="mt-3 flex gap-1.5">
                        {GENERATING_STEPS.map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              i <= aiGenStepIndex ? "w-6 bg-indigo-500" : "w-1.5 bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!aiGenerating && (
                  <div className="rounded-2xl border border-gray-100 bg-white p-5">
                    {aiSelfie ? (
                      <div className="flex flex-col items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={aiSelfie}
                          alt="Ta photo"
                          className="h-32 w-32 rounded-full object-cover shadow-xl ring-4 ring-indigo-100"
                        />
                        <button
                          type="button"
                          onClick={() => setAiSelfie(null)}
                          className="text-xs font-semibold text-gray-500 underline underline-offset-2 transition-colors hover:text-gray-900"
                        >
                          Changer de photo
                        </button>
                        <button
                          type="button"
                          onClick={handleAiGenerate}
                          disabled={aiGenerating}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-md transition-shadow hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Sparkles className="h-4 w-4" />
                          Générer ma photo pro
                        </button>
                        <p className="text-[11px] text-gray-400">
                          Génération IA haute qualité · portrait 1:1
                        </p>
                      </div>
                    ) : (
                      <div
                        {...getAiRootProps()}
                        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 transition-colors ${
                          isAiDragActive
                            ? "border-indigo-500 bg-indigo-50/60"
                            : "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30"
                        }`}
                      >
                        <input {...getAiInputProps()} />
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
                          <Upload className="h-5 w-5 text-indigo-600" />
                        </div>
                        <p className="mb-1 text-base font-bold text-gray-900">
                          {isAiDragActive ? "Lâche ton selfie ici" : "Glisse ton selfie ici"}
                        </p>
                        <p className="mb-4 text-xs text-gray-500">
                          JPG, PNG, WEBP ou HEIC · Max 5 Mo
                        </p>
                        <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-shadow hover:shadow-lg">
                          Parcourir mes fichiers
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!aiGenerating && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-900">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                      Conseils pour un meilleur résultat
                    </p>
                    <ul className="space-y-1.5 text-xs text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 font-bold text-indigo-500">1.</span>
                        Prends ta photo avec un bon éclairage naturel ou face à une lampe
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 font-bold text-indigo-500">2.</span>
                        Opte pour un fond neutre (mur blanc, porte…) derrière toi
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 font-bold text-indigo-500">3.</span>
                        Ton visage doit être bien dégagé, cadré de face
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ── Wizard step: result ── */}
            {aiWizardStep === "result" && (
              <div className="flex flex-col gap-4 border-t border-pink-100 px-4 py-4">
                <div className="text-center">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-bold text-green-700">
                      Photo générée avec succès !
                    </span>
                  </div>
                </div>
                {aiResultUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={aiResultUrl}
                    alt="Photo pro générée"
                    className="mx-auto h-40 w-40 rounded-full object-cover shadow-xl ring-4 ring-indigo-100"
                  />
                )}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={async () => {
                      const url = aiResultUrl;
                      setAiOpen(false);
                      resetAiWizard();
                      if (url) await startCropping(url);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg"
                  >
                    <Check className="h-4 w-4" />
                    Importer dans mon CV
                  </button>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAiWizardStep("pick-style");
                        setAiResultUrl(null);
                      }}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      Autre style
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiWizardStep("upload");
                        setAiResultUrl(null);
                      }}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Réessayer
                    </button>
                  </div>
                </div>
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
                <div
                  key={i}
                  className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-gray-100"
                />
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
