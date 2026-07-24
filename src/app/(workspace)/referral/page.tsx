"use client";
import { useEffect, useState } from "react";
import { Gift, Users, Copy, Check, Share2 } from "lucide-react";

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  referralLink: string;
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/referral").then((r) => r.json()),
      fetch("/api/tokens").then((r) => r.json()),
    ])
      .then(([refData, tokData]) => {
        if (refData && !refData.error) setData(refData);
        if (tokData) setTokens(tokData.tokens ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Gift className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Programme parrainage</h1>
        <p className="text-gray-500 mt-2">
          Invite tes amis — toi et eux gagnez chacun <strong>2 tokens</strong> gratuits.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
          <div className="text-3xl font-bold text-purple-600">
            {loading ? "…" : (data?.totalReferrals ?? 0)}
          </div>
          <div className="text-sm text-gray-500 mt-1">Amis parrainés</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
          <div className="text-3xl font-bold text-green-600">
            {loading ? "…" : (data?.totalReferrals ?? 0) * 2}
          </div>
          <div className="text-sm text-gray-500 mt-1">Tokens gagnés</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
          <div className="text-3xl font-bold text-indigo-600">
            {loading ? "…" : (tokens ?? "—")}
          </div>
          <div className="text-sm text-gray-500 mt-1">Solde actuel</div>
        </div>
      </div>

      {/* Referral link */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Share2 className="w-4 h-4" /> Ton lien de parrainage
        </h2>
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 font-mono truncate border border-gray-200">
            {loading ? "Chargement…" : (data?.referralLink ?? "Indisponible")}
          </div>
          <button
            onClick={handleCopy}
            disabled={!data?.referralLink}
            className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium shrink-0 disabled:opacity-40"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>
        {data?.referralCode && (
          <p className="mt-2 text-xs text-gray-400">
            Code : <span className="font-bold text-indigo-600">{data.referralCode}</span>
          </p>
        )}
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Comment ça marche
        </h2>
        <ol className="space-y-3">
          {[
            "Partage ton lien avec un ami",
            "Il s'inscrit sur Seora via ton lien",
            "Vous recevez chacun +2 tokens automatiquement",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <span className="text-gray-700 text-sm">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={
            data?.referralLink
              ? `https://wa.me/?text=${encodeURIComponent(
                  "J'utilise Seora pour préparer mes candidatures avec l'IA 🚀 " +
                    data.referralLink
                )}`
              : "#"
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors text-sm font-medium"
        >
          📱 WhatsApp
        </a>
        <a
          href={
            data?.referralLink
              ? `mailto:?subject=Essaie Seora&body=J'utilise Seora pour mes candidatures avec l'IA. Tu as droit à 150 tokens gratuits + 2 bonus : ${data.referralLink}`
              : "#"
          }
          className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          ✉️ Email
        </a>
      </div>
    </div>
  );
}
