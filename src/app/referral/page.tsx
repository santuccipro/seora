"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Gift, Copy, Users, Coins, Share2 } from "lucide-react";

export default function ReferralPage() {
  const { status } = useSession();
  const router = useRouter();
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [inputCode, setInputCode] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") {
      fetch("/api/referral")
        .then((r) => r.json())
        .then((d) => {
          setReferralCode(d.referralCode || "");
          setReferralLink(d.referralLink || "");
          setTotalReferrals(d.totalReferrals || 0);
        });
    }
  }, [status, router]);

  async function handleApplyCode() {
    if (!inputCode.trim()) return;
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: inputCode }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setInputCode("");
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Erreur");
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    toast.success("Lien copié !");
  }

  function shareOnSocial(platform: string) {
    const text = encodeURIComponent(
      `Analysez et améliorez votre CV gratuitement avec Seora CV ! Utilisez mon code ${referralCode} pour 2 tokens offerts.`
    );
    const url = encodeURIComponent(referralLink);

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };

    window.open(urls[platform], "_blank");
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Gift className="h-7 w-7 text-indigo-500" />
            Parrainage
          </h1>
          <p className="mt-1 text-gray-600">
            Invitez vos amis et gagnez des tokens gratuits
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-6 text-white shadow-lg">
            <Users className="h-8 w-8 mb-3 opacity-80" />
            <p className="text-3xl font-bold">{totalReferrals}</p>
            <p className="text-sm text-indigo-100">Filleuls</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 p-6 text-white shadow-lg">
            <Coins className="h-8 w-8 mb-3 opacity-80" />
            <p className="text-3xl font-bold">{totalReferrals * 2}</p>
            <p className="text-sm text-cyan-100">Tokens gagnés</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-6 text-white shadow-lg">
            <Gift className="h-8 w-8 mb-3 opacity-80" />
            <p className="text-3xl font-bold">2</p>
            <p className="text-sm text-green-100">Tokens par filleul</p>
          </div>
        </div>

        {/* Your referral code */}
        <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Votre code de parrainage
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Partagez ce code. Vous et votre filleul recevez chacun 2 tokens gratuits.
          </p>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 rounded-xl bg-gray-50 border border-gray-200 px-6 py-4 text-center">
              <span className="text-2xl font-mono font-bold tracking-widest text-indigo-600">
                {referralCode}
              </span>
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 rounded-xl bg-indigo-50 px-5 py-4 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <Copy className="h-4 w-4" />
              Copier le lien
            </button>
          </div>

          {/* Social share */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => shareOnSocial("whatsapp")}
              className="flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              WhatsApp
            </button>
            <button
              onClick={() => shareOnSocial("twitter")}
              className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              X / Twitter
            </button>
            <button
              onClick={() => shareOnSocial("linkedin")}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              LinkedIn
            </button>
          </div>
        </div>

        {/* Apply a code */}
        <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Vous avez un code ?
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Entrez le code d&apos;un ami pour recevoir 2 tokens gratuits.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="CODE DE PARRAINAGE"
              maxLength={8}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono text-center tracking-widest uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
            <button
              onClick={handleApplyCode}
              disabled={!inputCode.trim()}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Appliquer
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
