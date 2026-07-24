"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useAuthModal } from "@/components/auth/auth-context";
import { useDropzone } from "react-dropzone";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Download,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { PHOTO_STYLES, type PhotoStyle } from "@/lib/photo-styles";

type Step = "pick-style" | "upload" | "result";

const GENERATING_STEPS = [
  "Analyse du style sélectionné...",
  "Traitement de ta photo...",
  "Transformation professionnelle en cours...",
  "Application de l'éclairage studio...",
  "Finalisation HD...",
];

export default function PhotoStudioPage() {
  const { status } = useSession();
  const { openAuthModal } = useAuthModal();
  const [step, setStep] = useState<Step>("pick-style");
  const [selectedStyle, setSelectedStyle] = useState<PhotoStyle | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generatingStepIndex, setGeneratingStepIndex] = useState(0);

  // ── DROPZONE ──────────────────────────────────────────────
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Réduis la taille de ta photo (max 5 Mo)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedPhoto(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/heic": [".heic"],
    },
    maxFiles: 1,
    multiple: false,
  });

  // ── GENERATE ──────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!uploadedPhoto || !selectedStyle) return;

    if (uploadedPhoto.length > 5 * 1024 * 1024 * 1.37) {
      // base64 is ~1.37x larger than raw
      toast.error("Réduis la taille de ta photo (max 5 Mo)");
      return;
    }

    setGenerating(true);
    setGeneratingStepIndex(0);

    // Animate generating steps
    const stepInterval = setInterval(() => {
      setGeneratingStepIndex((prev) =>
        prev < GENERATING_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 8000);

    try {
      const res = await fetch("/api/photo-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: uploadedPhoto, styleKey: selectedStyle.key }),
      });

      const data = await res.json();
      if (res.status === 403) {
        toast.error("Plus assez de tokens. Achètes-en sur la page tokens.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Erreur de génération");

      setResultUrl(data.resultUrl);
      setStep("result");
      toast.success("Votre photo pro est prête !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la génération");
    } finally {
      clearInterval(stepInterval);
      setGenerating(false);
    }
  };

  // ── DOWNLOAD ──────────────────────────────────────────────
  const handleDownload = () => {
    if (!resultUrl) return;
    window.open(resultUrl, "_blank");
  };

  // ── RESET ─────────────────────────────────────────────────
  const resetToStylePicker = () => {
    setSelectedStyle(null);
    setResultUrl(null);
    setStep("pick-style");
    // keep uploadedPhoto so user can re-use the same photo
  };

  const resetAll = () => {
    setSelectedStyle(null);
    setUploadedPhoto(null);
    setResultUrl(null);
    setStep("pick-style");
  };

  // ── STEP 1: STYLE PICKER ──────────────────────────────────
  if (step === "pick-style") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pt-16 lg:pt-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  Photo Pro IA
                </h1>
                <p className="text-sm text-gray-500">
                  Transforme ton selfie en photo professionnelle
                </p>
              </div>
            </div>

            {/* Cross-link card */}
            <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-900">
                  Tu pourras ajouter ta photo directement à ton CV
                </p>
                <p className="text-xs text-indigo-600 mt-0.5">
                  Après génération, exporte vers le constructeur de CV
                </p>
              </div>
              <Link
                href="/cv-builder"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Mon CV
              </Link>
            </div>
          </div>

          {/* Style grid */}
          <p className="text-sm font-semibold text-gray-700 mb-4">
            Choisis ton secteur professionnel
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PHOTO_STYLES.map((style) => (
              <button
                key={style.key}
                onClick={() => {
                  setSelectedStyle(style);
                  setStep("upload");
                }}
                className="group relative rounded-2xl overflow-hidden text-left transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                style={{ background: style.bgGradient }}
              >
                <div className="p-4 pb-5">
                  <div className="text-3xl mb-3 leading-none">{style.emoji}</div>
                  <p className="text-sm font-bold text-white leading-tight mb-1">
                    {style.label}
                  </p>
                  <p className="text-[11px] text-white/70 leading-snug line-clamp-2">
                    {style.description}
                  </p>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-2xl" />
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            10 styles · Génération IA · Portrait HD
          </p>
        </div>
      </div>
    );
  }

  // ── STEP 2: UPLOAD ────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pt-16 lg:pt-8">
          {/* Back button */}
          <button
            onClick={() => setStep("pick-style")}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Changer de style
          </button>

          {/* Selected style preview */}
          {selectedStyle && (
            <div
              className="rounded-2xl p-4 mb-6 flex items-center gap-4"
              style={{ background: selectedStyle.bgGradient }}
            >
              <div className="text-4xl leading-none">{selectedStyle.emoji}</div>
              <div>
                <p className="text-base font-bold text-white">{selectedStyle.label}</p>
                <p className="text-xs text-white/70 mt-0.5">{selectedStyle.description}</p>
              </div>
              <button
                onClick={() => setStep("pick-style")}
                className="ml-auto text-[11px] font-semibold text-white/80 hover:text-white underline underline-offset-2 transition-colors"
              >
                Changer
              </button>
            </div>
          )}

          {/* Generating overlay */}
          {generating && (
            <div className="rounded-3xl bg-white shadow-xl border border-gray-100 p-8 mb-6">
              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  <div
                    className="h-20 w-20 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: selectedStyle?.bgGradient }}
                  >
                    <span className="text-4xl">{selectedStyle?.emoji}</span>
                  </div>
                  <div
                    className="absolute -inset-3 rounded-3xl border-2 border-indigo-300/40 animate-spin"
                    style={{ borderStyle: "dashed", animationDuration: "3s" }}
                  />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  <p className="text-sm font-semibold text-gray-800">
                    {GENERATING_STEPS[generatingStepIndex]}
                  </p>
                </div>
                <p className="text-xs text-gray-400">Cela prend en général 1 à 3 minutes</p>

                {/* Progress dots */}
                <div className="flex gap-1.5 mt-4">
                  {GENERATING_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        i <= generatingStepIndex
                          ? "w-6 bg-indigo-500"
                          : "w-1.5 bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upload zone (hidden while generating) */}
          {!generating && (
            <div className="rounded-3xl bg-white shadow-xl border border-gray-100 p-6 sm:p-8">
              {/* Photo preview */}
              {uploadedPhoto ? (
                <div className="flex flex-col items-center gap-5">
                  <img
                    src={uploadedPhoto}
                    alt="Ta photo"
                    className="h-40 w-40 rounded-full object-cover shadow-xl ring-4 ring-indigo-100"
                  />
                  <button
                    onClick={() => setUploadedPhoto(null)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
                  >
                    Changer de photo
                  </button>

                  <button
                    onClick={() => { if (status !== "authenticated") { openAuthModal(() => handleGenerate()); return; } handleGenerate(); }}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4" />
                    Générer ma photo pro
                  </button>
                  <p className="text-[11px] text-gray-400 text-center">
                    Génération IA haute qualité · portrait 1:1
                  </p>
                </div>
              ) : (
                /* Dropzone */
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl py-14 px-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-indigo-500 bg-indigo-50/60"
                      : "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                    <Upload className="h-6 w-6 text-indigo-600" />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                    {isDragActive
                      ? "Lâche ta photo ici"
                      : "Glisse ton selfie ici"}
                  </p>
                  <p className="text-xs text-gray-500 mb-5">
                    JPG, PNG, WEBP ou HEIC · Max 5 Mo
                  </p>
                  <div className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-shadow">
                    Parcourir mes fichiers
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tips */}
          {!generating && (
            <div className="mt-5 rounded-2xl bg-white border border-gray-200 p-5">
              <p className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                Conseils pour un meilleur résultat
              </p>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold mt-0.5">1.</span>
                  Prends ta photo avec un bon éclairage naturel ou face à une lampe
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold mt-0.5">2.</span>
                  Opte pour un fond neutre (mur blanc, porte…) derrière toi
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold mt-0.5">3.</span>
                  Ton visage doit être bien dégagé, cadré de face
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STEP 3: RESULT ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pt-16 lg:pt-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 mb-4">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-bold text-green-700">Photo générée avec succès !</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Ta photo pro est prête</h2>
          {selectedStyle && (
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1 mt-3"
              style={{ background: selectedStyle.bgGradient }}
            >
              <span className="text-base leading-none">{selectedStyle.emoji}</span>
              <span className="text-sm font-bold text-white">{selectedStyle.label}</span>
            </div>
          )}
        </div>

        {/* Result image */}
        <div className="rounded-3xl bg-white shadow-xl border border-gray-100 p-6 mb-5">
          {resultUrl && (
            <img
              src={resultUrl}
              alt="Photo professionnelle générée"
              className="w-full max-w-sm mx-auto rounded-2xl shadow-xl object-cover aspect-square"
            />
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-shadow"
          >
            <Download className="h-4 w-4" />
            Télécharger la photo
          </button>

          <Link
            href="/cv-builder?photo=studio"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:bg-emerald-700 transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            Utiliser pour mon CV
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={resetToStylePicker}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Autre style
            </button>
            <button
              onClick={resetAll}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Nouvelle photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
