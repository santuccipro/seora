"use client";

import { useState } from "react";
import { Coins, Sparkles, X, Zap, Loader2, Check } from "lucide-react";
import { TOKEN_PACKS } from "@/lib/pricing-data";
import { toast } from "sonner";

interface Props {
  open: boolean;
  needed: number;
  current: number | null;
  reason?: string;
  onClose: () => void;
}

export function NotEnoughTokensModal({ open, needed, current, reason, onClose }: Props) {
  const [buying, setBuying] = useState<string | null>(null);
  if (!open) return null;

  const buy = async (packId: string) => {
    setBuying(packId);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest mb-2">
              <Coins className="h-3 w-3" /> Solde insuffisant
            </div>
            <h3 className="text-xl font-black text-gray-900">Il te faut {needed} tokens pour continuer</h3>
            <p className="text-xs text-gray-500 mt-1">
              {reason ?? "Cette action consomme des tokens Seora."}
              {current !== null && (
                <> Actuellement tu en as <span className="font-bold text-gray-900">{current}</span>.</>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TOKEN_PACKS.map((pack) => {
            const isBuying = buying === pack.id;
            return (
              <button
                key={pack.id}
                onClick={() => buy(pack.id)}
                disabled={Boolean(buying)}
                className={`relative rounded-2xl border-2 p-4 text-left transition-all hover:shadow-lg disabled:opacity-50 ${
                  pack.popular
                    ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                    Le plus choisi
                  </span>
                )}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-black text-gray-900">{pack.name}</p>
                  {pack.tokens >= 15 && <Zap className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-2xl font-black text-gray-900">{pack.priceDisplay}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-bold text-emerald-600">{pack.tokens} tokens</span> — {pack.description}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-700">
                  {isBuying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Redirection Stripe…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Acheter maintenant
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          Paiement sécurisé Stripe · Tokens crédités instantanément après paiement
        </div>
      </div>
    </div>
  );
}
