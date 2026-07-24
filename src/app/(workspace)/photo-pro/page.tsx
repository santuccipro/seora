"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/components/auth/auth-context";
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
  Briefcase,
  Award,
  Trees,
  Building2,
  Palette,
  X,
  ZoomIn,
  Shirt,
} from "lucide-react";

type PhotoFond = "neutre" | "blanc" | "sombre" | "nature" | "bureau" | "colore";
type PhotoTonalite = "classique" | "chaleureux" | "decontracte" | "dynamique";
type PhotoPose = "face" | "trois_quarts" | "bras_croises";
type PhotoExpression = "souriant" | "neutre" | "serieux" | "confiant";
type PhotoTenue = "costume_noir" | "costume_gris" | "costume_bleu" | "chemise_blanche" | "polo" | "decontracte";

const FOND_OPTIONS: { id: PhotoFond; label: string; desc: string; icon: React.ElementType; bg: string; iconColor: string }[] = [
  { id: "neutre", label: "Gris neutre", desc: "LinkedIn",   icon: Briefcase, bg: "from-slate-100 to-slate-200",    iconColor: "text-slate-600" },
  { id: "blanc",  label: "Blanc épuré", desc: "Studio",     icon: Camera,    bg: "from-gray-50 to-gray-100",       iconColor: "text-gray-500"  },
  { id: "sombre", label: "Sombre",      desc: "Premium",    icon: Award,     bg: "from-gray-700 to-gray-900",      iconColor: "text-amber-400" },
  { id: "nature", label: "Nature",      desc: "Outdoor",    icon: Trees,     bg: "from-green-100 to-emerald-200",  iconColor: "text-green-600" },
  { id: "bureau", label: "Bureau",      desc: "Open space", icon: Building2, bg: "from-sky-50 to-blue-100",        iconColor: "text-blue-500"  },
  { id: "colore", label: "Coloré",      desc: "Créatif",    icon: Palette,   bg: "from-pink-100 to-rose-200",      iconColor: "text-pink-500"  },
];

const TONALITE_OPTIONS: { id: PhotoTonalite; label: string; desc: string }[] = [
  { id: "classique",   label: "Classique",   desc: "Sérieux · corporate"    },
  { id: "chaleureux",  label: "Chaleureux",  desc: "Souriant · accueillant" },
  { id: "decontracte", label: "Décontracté", desc: "Casual · startup"       },
  { id: "dynamique",   label: "Dynamique",   desc: "Impactant · énergique"  },
];

const POSE_OPTIONS: { id: PhotoPose; label: string; desc: string }[] = [
  { id: "face",         label: "Face caméra",  desc: "Classique frontale"  },
  { id: "trois_quarts", label: "3/4 tourné",   desc: "Légèrement de côté"  },
  { id: "bras_croises", label: "Bras croisés", desc: "Posture de confiance" },
];

const EXPRESSION_OPTIONS: { id: PhotoExpression; label: string; desc: string }[] = [
  { id: "souriant",  label: "Souriant",   desc: "Sourire chaleureux"  },
  { id: "neutre",    label: "Neutre",     desc: "Expression naturelle" },
  { id: "serieux",   label: "Sérieux",    desc: "Regard direct, fort"  },
  { id: "confiant",  label: "Confiant",   desc: "Léger sourire, charisme" },
];

const TENUE_OPTIONS: { id: PhotoTenue; label: string; desc: string }[] = [
  { id: "costume_noir",    label: "Costume noir",       desc: "Executive · banque" },
  { id: "costume_gris",    label: "Costume gris",       desc: "Corporate classique" },
  { id: "costume_bleu",    label: "Costume bleu marine", desc: "Business formel" },
  { id: "chemise_blanche", label: "Chemise blanche",    desc: "Smart casual" },
  { id: "polo",            label: "Polo",               desc: "Casual pro" },
  { id: "decontracte",     label: "Décontracté",        desc: "Startup · créatif" },
];

const LOADING_MSGS = [
  "✨ Génération en cours… chaque photo est unique",
  "📄 Pendant ce temps, tu peux préparer ton CV →",
  "🎯 L'IA personnalise chaque photo avec ton style…",
  "💼 Prépare aussi ta lettre de motivation sur Seora",
  "⚡ Tes 4 photos arrivent bientôt…",
  "🎤 Tu peux aussi simuler ton entretien ici !",
];

export default function PhotoProPage() {
  const { data: session, status } = useSession();
  const { openAuthModal } = useAuthModal();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState<{ name: string; file: File; preview: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [fakeLoading, setFakeLoading] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState(0);
  const [result, setResult] = useState<{ urls: string[]; tokensLeft?: number } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; imageUrls: string[]; fond: string; tonalite: string; createdAt: string }[]>([]);
  const [photoFond, setPhotoFond] = useState<PhotoFond>("neutre");
  const [photoTonalite, setPhotoTonalite] = useState<PhotoTonalite>("classique");
  const [photoPose, setPhotoPose] = useState<PhotoPose>("face");
  const [photoExpression, setPhotoExpression] = useState<PhotoExpression>("neutre");
  const [photoTenue, setPhotoTenue] = useState<PhotoTenue>("costume_noir");
  const [photoNotes, setPhotoNotes] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number>(0);
  const [tokens, setTokens] = useState<number | null>(null);

  // Fetch user token balance
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/tokens").then(r => r.json()).then(d => { if (typeof d.tokens === "number") setTokens(d.tokens); }).catch(() => {});
    }
  }, [status]);

  // Close lightbox on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxUrl(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const startProgressSim = () => {
    setGlobalProgress(0);
    const FAST_DURATION = 44000; // 0→85% in 44s
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed < FAST_DURATION) {
        // Fast phase: 0 → 85% over 44s
        setGlobalProgress((elapsed / FAST_DURATION) * 85);
      } else {
        // Slow phase: 85 → 98% very slowly (0.01%/300ms ≈ never reaches 98 before API responds)
        setGlobalProgress(p => Math.min(98, p + 0.04));
      }
    }, 300);
    return iv;
  };

  useEffect(() => {
    const data = sessionStorage.getItem("seora_photo_file");
    const name = sessionStorage.getItem("seora_photo_filename");
    const autorun = sessionStorage.getItem("seora_photo_autorun");
    const fond = (sessionStorage.getItem("seora_photo_fond") as PhotoFond | null) ?? "neutre";
    const tonalite = (sessionStorage.getItem("seora_photo_tonalite") as PhotoTonalite | null) ?? "classique";
    const pose = (sessionStorage.getItem("seora_photo_pose") as PhotoPose | null) ?? "face";
    const expression = (sessionStorage.getItem("seora_photo_expression") as PhotoExpression | null) ?? "neutre";
    const tenue = (sessionStorage.getItem("seora_photo_tenue") as PhotoTenue | null) ?? "costume_noir";
    const notes = sessionStorage.getItem("seora_photo_notes") ?? "";

    if (data && name && !uploaded) {
      try {
        const [meta, base64] = data.split(",");
        const mime = meta.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], name, { type: mime });
        setUploaded({ name, file, preview: data });
        setPhotoFond(fond);
        setPhotoTonalite(tonalite);
        setPhotoPose(pose);
        setPhotoExpression(expression);
        setPhotoTenue(tenue);
        setPhotoNotes(notes);

        if (autorun === "1") {
          setProcessing(true);
          const iv = startProgressSim();
          const msgIvA = setInterval(() => setProgressMsg(p => (p + 1) % LOADING_MSGS.length), 4000);
          const fd = new FormData();
          fd.append("photo", file);
          fd.append("fond", fond);
          fd.append("tonalite", tonalite);
          fd.append("pose", pose);
          fd.append("expression", expression);
          fd.append("tenue", tenue);
          if (notes) fd.append("notes", notes);
          fetch("/api/photo-pro", { method: "POST", body: fd })
            .then((r) => r.json())
            .then((d) => {
              clearInterval(iv);
              clearInterval(msgIvA);
              if (d.error) throw new Error(d.error);
              setGlobalProgress(100);
              setTimeout(() => { setResult(d); toast.success("Photo pro générée ✨"); }, 400);
            })
            .catch((e) => { clearInterval(iv); clearInterval(msgIvA); setGlobalProgress(0); const msg = e instanceof Error ? e.message : "Erreur transformation"; toast.error(msg); setGenError(msg); })
            .finally(() => setProcessing(false));
        }
      } catch (e) {
        console.error(e);
      }
      sessionStorage.removeItem("seora_photo_file");
      sessionStorage.removeItem("seora_photo_filename");
      sessionStorage.removeItem("seora_photo_autorun");
      sessionStorage.removeItem("seora_photo_fond");
      sessionStorage.removeItem("seora_photo_tonalite");
      sessionStorage.removeItem("seora_photo_pose");
      sessionStorage.removeItem("seora_photo_expression");
      sessionStorage.removeItem("seora_photo_tenue");
      sessionStorage.removeItem("seora_photo_notes");
    }
    fetch("/api/photo-pro?limit=12")
      .then(r => r.json())
      .then(d => { if (d.generations) setHistory(d.generations); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Format non supporté (JPG, PNG, HEIC, WEBP)"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image trop lourde (max 10 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = () => setUploaded({ name: file.name, file, preview: reader.result as string });
    reader.readAsDataURL(file);
    setResult(null);
  };

  const handleTransformClick = () => {
    if (status !== "authenticated") {
      setFakeLoading(true);
      setTimeout(() => {
        setFakeLoading(false);
        openAuthModal(() => runTransform(), "photo");
      }, 3200);
      return;
    }
    runTransform();
  };

  const runTransform = async () => {
    if (!uploaded) return;
    setGenError(null);
    setProcessing(true);
    setGlobalProgress(0);
    setProgressMsg(0);

    const iv = startProgressSim();
    const msgIv = setInterval(() => { setProgressMsg(p => (p + 1) % LOADING_MSGS.length); }, 4000);

    try {
      const fd = new FormData();
      fd.append("photo", uploaded.file);
      fd.append("fond", photoFond);
      fd.append("tonalite", photoTonalite);
      fd.append("pose", photoPose);
      fd.append("expression", photoExpression);
      fd.append("tenue", photoTenue);
      if (photoNotes.trim()) fd.append("notes", photoNotes.trim());
      const res = await fetch("/api/photo-pro", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur transformation");
      clearInterval(iv);
      clearInterval(msgIv);
      setGlobalProgress(100);
      setTimeout(() => {
        setResult(data);
        if (typeof data.tokensLeft === "number") setTokens(data.tokensLeft);
        toast.success(`${data.urls?.length ?? 1} photos générées ✨`);
      }, 400);
      fetch("/api/photo-pro?limit=12").then(r => r.json()).then(d => { if (d.generations) setHistory(d.generations); }).catch(() => {});
    } catch (err) {
      clearInterval(iv);
      clearInterval(msgIv);
      setGlobalProgress(0);
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error(msg);
      setGenError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const downloadPhoto = async (url: string, index: number) => {
    try {
      const proxyUrl = `/api/photo-pro/download?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("proxy error");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `seora-photo-pro-${index + 1}.jpg`;
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
    setPhotoFond("neutre");
    setPhotoTonalite("classique");
    setPhotoPose("face");
    setPhotoExpression("neutre");
    setPhotoTenue("costume_noir");
    setPhotoNotes("");
    setGlobalProgress(0);
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
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-sm"
            >
              <X className="h-5 w-5" /> Fermer
            </button>
            <img
              src={lightboxUrl}
              alt={`Photo pro ${lightboxIdx + 1}`}
              className="w-full rounded-2xl shadow-2xl"
            />
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={() => downloadPhoto(lightboxUrl, lightboxIdx)}
                className="flex items-center gap-2 bg-white text-gray-900 font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg hover:bg-gray-100 transition-colors"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/25 mb-4">
            <Camera className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">Photo Pro IA</h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Selfie → 4 photos professionnelles · Génération IA haute qualité · ~45 secondes.
          </p>
        </div>

        {/* Processing — single global bar */}
        {(processing || fakeLoading) && (
          <div className="rounded-3xl bg-white shadow-xl border border-pink-100 p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md flex-shrink-0">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Génération IA en cours</p>
                <p className="text-xs text-gray-400">4 photos haute qualité · ~45 secondes</p>
              </div>
              <span className="ml-auto text-sm font-bold text-pink-600">{Math.round(globalProgress)}%</span>
            </div>
            <div className="mb-5">
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-300"
                  style={{ width: `${globalProgress}%` }}
                />
              </div>
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded-xl px-4 py-3 min-h-[3rem] flex items-center justify-center">
              <p className="text-center text-sm text-pink-700 font-medium transition-opacity duration-500">
                {LOADING_MSGS[progressMsg]}
              </p>
            </div>
          </div>
        )}

        {/* Result — 2×2 grid */}
        {!processing && !fakeLoading && result && (
          <div className="space-y-5 mb-8">
            <div className="rounded-3xl bg-white shadow-xl border border-pink-100 p-6 sm:p-8">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">
                    {result.urls.length} photo{result.urls.length > 1 ? "s" : ""} générée{result.urls.length > 1 ? "s" : ""} !
                  </h2>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-7">Appuie sur une photo pour l&apos;agrandir et la télécharger</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {result.urls.map((url, i) => (
                  <div
                    key={i}
                    className="relative group rounded-2xl overflow-hidden bg-gray-100 aspect-square cursor-pointer"
                    onClick={() => { setLightboxUrl(url); setLightboxIdx(i); }}
                  >
                    <img src={url} alt={`Photo pro ${i + 1}`} className="w-full h-full object-cover" />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Download button — always visible on mobile, hover on desktop */}
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadPhoto(url, i); }}
                      className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-gray-900 p-1.5 rounded-full shadow-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      title="Télécharger"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm text-xs font-bold text-gray-700 px-1.5 py-0.5 rounded-full">
                      #{i + 1}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={resetAll}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 py-2 transition-colors border border-gray-200 rounded-xl"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Générer un nouveau set
              </button>
              <p className="text-center text-[11px] text-gray-400 mt-2">
                Coûtera 2 tokens{tokens !== null ? ` · Solde actuel : ${tokens} token${tokens > 1 ? "s" : ""}` : ""}
              </p>
            </div>
          </div>
        )}

        {/* History */}
        {!processing && !fakeLoading && !result && history.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Tes générations récentes</h3>
            <div className="space-y-4">
              {history.map(gen => (
                <div key={gen.id} className="rounded-2xl bg-white border border-gray-200 p-4">
                  <p className="text-[10px] text-gray-400 mb-2">
                    {new Date(gen.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {gen.fond} · {gen.tonalite}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {gen.imageUrls.map((url, i) => (
                      <div
                        key={i}
                        className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100 cursor-pointer"
                        onClick={() => { setLightboxUrl(url); setLightboxIdx(i); }}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadPhoto(url, i); }}
                          className="absolute bottom-1 right-1 bg-white/90 text-gray-900 p-1 rounded-full shadow sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error retry banner */}
        {genError && !processing && !result && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
            <span className="text-red-500 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700">{genError}</p>
              <p className="text-xs text-red-500 mt-0.5">Tes tokens ont été remboursés automatiquement.</p>
            </div>
            <button
              onClick={() => { setGenError(null); if (uploaded) handleTransformClick(); }}
              className="rounded-xl bg-red-500 text-white text-xs font-bold px-3 py-1.5 hover:bg-red-600 transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Upload + picker */}
        {!processing && !fakeLoading && !result && (
          <div className="rounded-3xl bg-white shadow-xl border border-pink-100 p-6 sm:p-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {uploaded ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-pink-50 border border-pink-200 p-4 flex items-center gap-4">
                  <img src={uploaded.preview} alt={uploaded.name} className="h-16 w-16 rounded-xl object-cover shadow-md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{uploaded.name}</p>
                    <p className="text-xs text-gray-500">{(uploaded.file.size / 1024).toFixed(1)} Ko · Prêt à traiter</p>
                  </div>
                  <button onClick={() => setUploaded(null)} className="text-xs font-semibold text-gray-500 hover:text-gray-900">Changer</button>
                </div>

                <div className="space-y-3">
                  {/* Fond */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Ton fond</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {FOND_OPTIONS.map(s => {
                        const active = photoFond === s.id;
                        const Icon = s.icon;
                        return (
                          <button key={s.id} onClick={() => setPhotoFond(s.id)} className={`rounded-lg border transition-all text-left ${active ? "border-pink-500 bg-pink-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                            <div className="flex items-center gap-1.5 px-2 py-1.5">
                              <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br ${s.bg}`}>
                                <Icon className={`h-3.5 w-3.5 ${active ? "text-pink-500" : s.iconColor}`} strokeWidth={1.5} />
                              </div>
                              <div>
                                <p className={`text-[10px] font-bold leading-tight ${active ? "text-pink-900" : "text-gray-800"}`}>{s.label}</p>
                                <p className={`text-[8px] leading-tight ${active ? "text-pink-400" : "text-gray-400"}`}>{s.desc}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tenue */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                      <Shirt className="inline h-3 w-3 mr-1" />Ta tenue
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TENUE_OPTIONS.map(s => {
                        const active = photoTenue === s.id;
                        return (
                          <button key={s.id} onClick={() => setPhotoTenue(s.id)} className={`rounded-lg border px-2 py-1.5 text-left transition-all ${active ? "border-pink-500 bg-pink-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                            <p className={`text-[10px] font-bold leading-tight ${active ? "text-pink-900" : "text-gray-800"}`}>{s.label}</p>
                            <p className={`text-[8px] leading-tight ${active ? "text-pink-400" : "text-gray-400"}`}>{s.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tonalité */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tonalité</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TONALITE_OPTIONS.map(s => {
                        const active = photoTonalite === s.id;
                        return (
                          <button key={s.id} onClick={() => setPhotoTonalite(s.id)} className={`rounded-lg border px-2.5 py-1.5 text-left transition-all ${active ? "border-pink-500 bg-pink-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                            <p className={`text-[10px] font-bold leading-tight ${active ? "text-pink-900" : "text-gray-800"}`}>{s.label}</p>
                            <p className={`text-[8px] leading-tight ${active ? "text-pink-400" : "text-gray-400"}`}>{s.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pose */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pose</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {POSE_OPTIONS.map(s => {
                        const active = photoPose === s.id;
                        return (
                          <button key={s.id} onClick={() => setPhotoPose(s.id)} className={`rounded-lg border px-2 py-1.5 text-left transition-all ${active ? "border-pink-500 bg-pink-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                            <p className={`text-[10px] font-bold leading-tight ${active ? "text-pink-900" : "text-gray-800"}`}>{s.label}</p>
                            <p className={`text-[8px] leading-tight ${active ? "text-pink-400" : "text-gray-400"}`}>{s.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expression */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Expression</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {EXPRESSION_OPTIONS.map(s => {
                        const active = photoExpression === s.id;
                        return (
                          <button key={s.id} onClick={() => setPhotoExpression(s.id)} className={`rounded-lg border px-2.5 py-1.5 text-left transition-all ${active ? "border-pink-500 bg-pink-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                            <p className={`text-[10px] font-bold leading-tight ${active ? "text-pink-900" : "text-gray-800"}`}>{s.label}</p>
                            <p className={`text-[8px] leading-tight ${active ? "text-pink-400" : "text-gray-400"}`}>{s.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Précisions <span className="text-gray-400 font-normal normal-case">(optionnel)</span></p>
                    <textarea
                      value={photoNotes}
                      onChange={e => setPhotoNotes(e.target.value)}
                      placeholder="Ex : lunettes, badge entreprise, couleur cravate..."
                      rows={2}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:border-pink-400 placeholder-gray-300"
                    />
                  </div>
                </div>

                <button
                  onClick={handleTransformClick}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-pink-500/25 hover:shadow-xl transition-shadow"
                >
                  <Sparkles className="h-4 w-4" />
                  Générer ma photo pro
                </button>

                <p className="text-center text-[11px] text-gray-400">
                  2 tokens · 4 photos HD générées en parallèle · ~45 secondes
                  {tokens !== null ? ` · Solde : ${tokens} tokens` : ""}
                </p>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl py-14 sm:py-20 px-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${dragOver ? "border-pink-500 bg-pink-50/60" : "border-pink-200 hover:border-pink-400"}`}
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

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <CheckCircle2 className="h-4 w-4 text-pink-500 mb-2" />
            <p className="text-xs font-bold text-gray-900">Génération IA</p>
            <p className="text-[11px] text-gray-500 mt-1">Modèle haute qualité · photo entièrement regénérée</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <CheckCircle2 className="h-4 w-4 text-pink-500 mb-2" />
            <p className="text-xs font-bold text-gray-900">Fond + tenue au choix</p>
            <p className="text-[11px] text-gray-500 mt-1">6 fonds · 6 tenues · 4 poses · 4 expressions</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <CheckCircle2 className="h-4 w-4 text-pink-500 mb-2" />
            <p className="text-xs font-bold text-gray-900">Export HD</p>
            <p className="text-[11px] text-gray-500 mt-1">Qualité maximale · téléchargement direct</p>
          </div>
        </div>
      </div>
    </div>
  );
}
