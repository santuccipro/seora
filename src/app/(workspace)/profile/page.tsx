// 10/07/26 (Orsu) — Page profil utilisateur : avatar (initiales), nom éditable,
// email (readonly), tokens visibles, stats analyses, code parrainage, RGPD.
"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Coins,
  History as HistoryIcon,
  ShieldAlert,
  Loader2,
  Check,
  Edit3,
  LogOut,
  Gift,
  Trash2,
  Copy,
  ExternalLink,
  FileText,
  Bot,
} from "lucide-react";

type Profile = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  tokens: number;
  totalReferrals: number;
  referralCode: string | null;
  isAdmin: boolean;
  createdAt: string;
  _count: {
    humanizerAnalyses: number;
    cvAnalyses: number;
    coverLetters: number;
  };
};

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/profile");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) {
          toast.error(data.error);
          return;
        }
        setProfile(data);
        setNameInput(data.name || "");
      })
      .catch(() => toast.error("Impossible de charger le profil"))
      .finally(() => setLoading(false));
  }, [status]);

  const saveName = async () => {
    if (nameInput.trim().length < 2) {
      toast.error("Nom trop court (min 2 caractères)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setProfile((p) => (p ? { ...p, name: data.name } : p));
      setEditingName(false);
      toast.success("Nom mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmText !== "SUPPRIMER") {
      toast.error("Tape SUPPRIMER en majuscules pour confirmer");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Compte supprimé. À bientôt.");
      await signOut({ callbackUrl: "/" });
    } catch {
      toast.error("Erreur lors de la suppression");
      setDeleting(false);
    }
  };

  const copyReferralLink = async () => {
    if (!profile?.referralCode) return;
    const url = `${window.location.origin}/?ref=${profile.referralCode}`;
    await navigator.clipboard.writeText(url);
    toast.success("Lien de parrainage copié");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = (profile.name || profile.email).slice(0, 2).toUpperCase();
  const memberSince = new Date(profile.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Nav */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au dashboard
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>

        {/* Header identity card */}
        <div className="rounded-3xl bg-white shadow-xl border border-orange-100 p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
              <span className="text-2xl font-black text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    className="flex-1 rounded-xl border-2 border-orange-300 px-3 py-2 text-lg font-bold outline-none focus:border-orange-500"
                    autoFocus
                    maxLength={60}
                  />
                  <button
                    onClick={saveName}
                    disabled={saving}
                    className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white p-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNameInput(profile.name || "");
                    }}
                    className="text-xs text-gray-500 hover:text-gray-900 px-2"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black text-gray-900 truncate">
                    {profile.name || "Sans nom"}
                  </h1>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                    title="Modifier"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {profile.email}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Membre depuis le {memberSince}
                {profile.isAdmin && (
                  <span className="ml-2 rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                    Admin
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tokens + Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4" />
              <p className="text-[10px] uppercase tracking-widest font-black opacity-90">
                Solde
              </p>
            </div>
            <p className="text-3xl font-black">{profile.tokens}</p>
            <p className="text-[10px] opacity-80 mt-0.5">tokens</p>
            <Link
              href="/tokens"
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 px-2.5 py-1 text-[10px] font-bold transition-colors"
            >
              Acheter <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-4 w-4 text-orange-600" />
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black">
                Humanisations
              </p>
            </div>
            <p className="text-3xl font-black text-gray-900">
              {profile._count.humanizerAnalyses}
            </p>
            <Link
              href="/humanizer/history"
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:text-orange-800"
            >
              Historique <HistoryIcon className="h-2.5 w-2.5" />
            </Link>
          </div>
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-cyan-600" />
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black">
                CV
              </p>
            </div>
            <p className="text-3xl font-black text-gray-900">
              {profile._count.cvAnalyses}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">analyses</p>
          </div>
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-4 w-4 text-emerald-600" />
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black">
                Parrainages
              </p>
            </div>
            <p className="text-3xl font-black text-gray-900">{profile.totalReferrals}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">amis inscrits</p>
          </div>
        </div>

        {/* Parrainage */}
        {profile.referralCode && (
          <div className="rounded-3xl bg-white shadow-sm border border-orange-100 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-4 w-4 text-emerald-600" />
              <p className="text-xs uppercase tracking-widest text-gray-600 font-black">
                Ton lien de parrainage
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
              <code className="flex-1 text-xs text-gray-700 truncate font-mono">
                {typeof window !== "undefined" ? `${window.location.origin}/?ref=${profile.referralCode}` : `/?ref=${profile.referralCode}`}
              </code>
              <button
                onClick={copyReferralLink}
                className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white p-2 transition-colors"
                title="Copier"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Chaque ami inscrit via ton lien te rapporte 2 tokens.
            </p>
          </div>
        )}

        {/* Actions rapides */}
        <div className="rounded-3xl bg-white shadow-sm border border-gray-200 p-5 mb-6">
          <p className="text-xs uppercase tracking-widest text-gray-600 font-black mb-3">
            Accès rapide
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Link
              href="/humanizer"
              className="flex items-center gap-2 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 px-3 py-2.5 text-xs font-semibold text-gray-700 transition-all"
            >
              <Bot className="h-3.5 w-3.5 text-orange-500" /> Humanizer
            </Link>
            <Link
              href="/humanizer/history"
              className="flex items-center gap-2 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 px-3 py-2.5 text-xs font-semibold text-gray-700 transition-all"
            >
              <HistoryIcon className="h-3.5 w-3.5 text-orange-500" /> Historique
            </Link>
            <Link
              href="/tokens"
              className="flex items-center gap-2 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 px-3 py-2.5 text-xs font-semibold text-gray-700 transition-all"
            >
              <Coins className="h-3.5 w-3.5 text-orange-500" /> Acheter tokens
            </Link>
          </div>
        </div>

        {/* Zone dangereuse */}
        <div className="rounded-3xl bg-red-50/50 border-2 border-red-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <p className="text-xs uppercase tracking-widest text-red-800 font-black">
              Zone dangereuse
            </p>
          </div>
          {!showDeleteConfirm ? (
            <>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                Supprimer ton compte efface immédiatement toutes tes données (historique, analyses, tokens). Action irréversible, conforme RGPD.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-red-200 hover:bg-red-100 text-red-700 px-4 py-2 text-xs font-bold transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer mon compte
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-red-800 font-semibold leading-relaxed">
                Confirme en tapant <code className="bg-white px-1.5 py-0.5 rounded font-mono">SUPPRIMER</code> ci-dessous.
              </p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full rounded-xl border-2 border-red-200 px-3 py-2 text-sm outline-none focus:border-red-500 font-mono"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={deleteAccount}
                  disabled={deleteConfirmText !== "SUPPRIMER" || deleting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Confirmer la suppression
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-2"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
