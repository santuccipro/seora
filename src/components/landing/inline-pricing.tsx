"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  X,
  Check,
  Zap,
  Shield,
  Loader2,
  Sparkles,
} from "lucide-react";
import { TOKEN_PACKS } from "@/lib/pricing-data";
import { useAuthModal } from "@/components/auth/auth-context";

interface InlinePricingProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InlinePricing({ isOpen, onClose }: InlinePricingProps) {
  const { data: session } = useSession();
  const { openAuthModal } = useAuthModal();
  const [loading, setLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchase = async (packId: string) => {
    if (!session) {
      openAuthModal(() => {
        window.location.href = "/tokens";
      });
      return;
    }

    setLoading(packId);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Fallback to tokens page
      window.location.href = "/tokens";
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl animate-scale-in glass-strong rounded-3xl shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-gray-400 hover:bg-gray-100/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 mb-3">
              <Sparkles className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Débloquez vos résultats
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Choisissez votre pack de tokens pour accéder aux fonctionnalités premium
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TOKEN_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`relative rounded-2xl border p-4 transition-all ${
                  pack.popular
                    ? "border-indigo-300 bg-indigo-50/50 shadow-lg shadow-indigo-100 ring-1 ring-indigo-200"
                    : "border-gray-200/60 bg-white hover:border-gray-300"
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-semibold text-white">
                      Populaire
                    </span>
                  </div>
                )}
                <div className="text-center pt-1">
                  <p className="text-sm font-bold text-gray-900">{pack.name}</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">
                    {pack.priceDisplay}
                  </p>
                  <p className="text-xs text-gray-500">{pack.description}</p>
                  <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-500">
                    <Zap className="h-3 w-3 text-indigo-500" />
                    {pack.tokens} tokens
                  </div>
                </div>
                <button
                  onClick={() => handlePurchase(pack.id)}
                  disabled={loading === pack.id}
                  className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all disabled:opacity-50 ${
                    pack.popular
                      ? "brand-gradient text-white shadow-lg shadow-indigo-500/25"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {loading === pack.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Choisir
                </button>
              </div>
            ))}
          </div>

          {/* Trust footer */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" /> Paiement sécurisé Stripe
            </span>
            <span>&bull;</span>
            <span>Annulation facile</span>
            <span>&bull;</span>
            <span>Sans engagement</span>
          </div>
        </div>
      </div>
    </div>
  );
}
