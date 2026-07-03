"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Camera,
  ArrowLeft,
  Upload,
  Loader2,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

type Variant = "neutral" | "warm" | "corporate";
const VARIANT_META: Record<Variant, { label: string; hex: string; ring: string }> = {
  neutral: { label: "Neutre", hex: "#F1F5F9", ring: "ring-slate-300" },
  warm: { label: "Chaud", hex: "#FEF3C7", ring: "ring-amber-300" },
  corporate: { label: "Corporate", hex: "#0F172A", ring: "ring-slate-800" },
};

export default function PhotoProPage() {
  const { status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState<{ name: string; file: File; preview: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    originalUrl: string;
    transformedUrls: Record<string, string>;
  } | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant>("neutral");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/photo-pro");
    }
  }, [status, router]);

  useEffect(() => {
    // Restore file from sessionStorage if user uploaded from landing
    const data = sessionStorage.getItem("seora_photo_file");
    const name = sessionStorage.getItem("seora_photo_filename");
    if (data && name && !uploaded) {
      try {
        const [meta, base64] = data.split(",");
        const mime = meta.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], name, { type: mime });
        setUploaded({ name, file, preview: data });
      } catch (e) {
        console.error(e);
      }
      sessionStorage.removeItem("seora_photo_file");
      sessionStorage.removeItem("seora_photo_filename");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Format non supporté (JPG, PNG, HEIC, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image trop lourde (max 10 Mo)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUploaded({ name: file.name, file, preview: reader.result as string });
    reader.readAsDataURL(file);
    setResult(null);
  };

  const runTransform = async () => {
    if (!uploaded) return;
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append("photo", uploaded.file);
      const res = await fetch("/api/photo-pro", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur transformation");
      setResult(data);
      toast.success("Photo pro générée ✨");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setProcessing(false);
    }
  };

  const download = async (url: string, variant: Variant) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `seora-photo-pro-${variant}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      toast.error("Téléchargement échoué");
    }
  };

  const resetAll = () => {
    setUploaded(null);
    setResult(null);
    setSelectedVariant("neutral");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/25 mb-4">
            <Camera className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Photo Pro IA
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Selfie → photo professionnelle en 15 secondes · Fond neutre, retouche IA, HD.
          </p>
        </div>

        {/* Processing */}
        {processing && (
          <div className="rounded-3xl bg-white shadow-xl border border-pink-100 p-8 mb-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
                  <Camera className="h-9 w-9 text-white" />
                </div>
                <div
                  className="absolute -inset-3 rounded-3xl border-2 border-pink-300/40 animate-spin"
                  style={{ borderStyle: "dashed", animationDuration: "3s" }}
                />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                <p className="text-sm font-semibold text-gray-800">
                  Retouche IA en cours...
                </p>
              </div>
              <p className="text-xs text-gray-500">Détourage · Fond neutre · Amélioration · Export HD</p>
            </div>
          </div>
        )}

        {/* Result */}
        {!processing && result && (
          <div className="space-y-5">
            {/* Variant selector */}
            <div className="rounded-3xl bg-white shadow-xl border border-pink-100 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Choisis ton fond</h2>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {(Object.keys(VARIANT_META) as Variant[]).map(v => {
                  const meta = VARIANT_META[v];
                  const active = selectedVariant === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setSelectedVariant(v)}
                      className={`rounded-2xl p-3 border-2 transition-all ${
                        active
                          ? "border-pink-500 bg-pink-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`h-16 w-full rounded-xl mb-2 ring-2 ring-offset-2 ${meta.ring}`}
                        style={{ backgroundColor: meta.hex }}
                      />
                      <p className={`text-xs font-bold ${active ? "text-pink-900" : "text-gray-700"}`}>
                        {meta.label}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Preview large */}
              <div className="rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src={result.transformedUrls[selectedVariant] ?? result.transformedUrls[`fallback${selectedVariant.charAt(0).toUpperCase()}${selectedVariant.slice(1)}`]}
                  alt="Photo pro générée"
                  className="w-full aspect-square object-cover"
                  onError={(e) => {
                    // Fallback if background removal add-on failed
                    const t = e.currentTarget;
                    const key = `fallback${selectedVariant.charAt(0).toUpperCase()}${selectedVariant.slice(1)}`;
                    if (result.transformedUrls[key] && t.src !== result.transformedUrls[key]) {
                      t.src = result.transformedUrls[key];
                    }
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-3xl bg-white shadow-xl border border-pink-100 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Télécharger</h2>
              <button
                onClick={() => download(
                  result.transformedUrls[selectedVariant] ?? result.transformedUrls[`fallback${selectedVariant.charAt(0).toUpperCase()}${selectedVariant.slice(1)}`],
                  selectedVariant
                )}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-pink-500/25 hover:shadow-xl transition-shadow"
              >
                <Download className="h-4 w-4" />
                Télécharger la version {VARIANT_META[selectedVariant].label}
              </button>
              <button
                onClick={resetAll}
                className="w-full mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 py-2 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retoucher un autre selfie
              </button>
            </div>
          </div>
        )}

        {/* Upload */}
        {!processing && !result && (
          <div className="rounded-3xl bg-white shadow-xl border border-pink-100 p-6 sm:p-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            {uploaded ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-pink-50 border border-pink-200 p-4 flex items-center gap-4">
                  <img
                    src={uploaded.preview}
                    alt={uploaded.name}
                    className="h-16 w-16 rounded-xl object-cover shadow-md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{uploaded.name}</p>
                    <p className="text-xs text-gray-500">
                      {(uploaded.file.size / 1024).toFixed(1)} Ko · Prêt à traiter
                    </p>
                  </div>
                  <button
                    onClick={() => setUploaded(null)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900"
                  >
                    Changer
                  </button>
                </div>

                <button
                  onClick={runTransform}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-pink-500/25 hover:shadow-xl transition-shadow"
                >
                  <Sparkles className="h-4 w-4" />
                  Transformer en photo pro
                </button>

                <p className="text-center text-[11px] text-gray-400">
                  1 token · Résultat en ~15 secondes
                </p>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl py-14 sm:py-20 px-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-pink-500 bg-pink-50/60"
                    : "border-pink-200 hover:border-pink-400"
                }`}
              >
                <div className="h-14 w-14 rounded-2xl bg-pink-100 flex items-center justify-center mb-4">
                  <Upload className="h-6 w-6 text-pink-600" />
                </div>
                <p className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                  {dragOver ? "Lâchez votre selfie ici" : "Glissez votre selfie ici"}
                </p>
                <p className="text-xs text-gray-500 mb-5">JPG, PNG, HEIC ou WEBP · Max 10 Mo</p>
                <div className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold shadow-md shadow-pink-500/25 hover:shadow-lg transition-shadow">
                  Parcourir mes fichiers
                </div>
              </div>
            )}
          </div>
        )}

        {/* Features */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <CheckCircle2 className="h-4 w-4 text-pink-500 mb-2" />
            <p className="text-xs font-bold text-gray-900">Fond neutre</p>
            <p className="text-[11px] text-gray-500 mt-1">Détourage automatique + 3 fonds au choix</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <CheckCircle2 className="h-4 w-4 text-pink-500 mb-2" />
            <p className="text-xs font-bold text-gray-900">Retouche IA</p>
            <p className="text-[11px] text-gray-500 mt-1">Correction luminosité + netteté + peau</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <CheckCircle2 className="h-4 w-4 text-pink-500 mb-2" />
            <p className="text-xs font-bold text-gray-900">Export HD</p>
            <p className="text-[11px] text-gray-500 mt-1">800×800 · qualité optimale · téléchargement direct</p>
          </div>
        </div>
      </div>
    </div>
  );
}
