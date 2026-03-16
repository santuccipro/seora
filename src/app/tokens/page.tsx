"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard/layout";
import { TokenDisplay } from "@/components/dashboard/token-display";
import { Check, Sparkles, Loader2 } from "lucide-react";

const packs = [
  {
    id: "pack-5",
    name: "Starter",
    tokens: 5,
    price: "4,99 €",
    description: "5 analyses complètes",
    features: ["5 analyses de CV", "Corrections détaillées", "CV réécrit par IA"],
    popular: false,
  },
  {
    id: "pack-15",
    name: "Pro",
    tokens: 15,
    price: "9,99 €",
    description: "15 analyses complètes",
    features: [
      "15 analyses de CV",
      "Corrections détaillées",
      "CV réécrit par IA",
      "Meilleur rapport qualité-prix",
    ],
    popular: true,
  },
  {
    id: "pack-50",
    name: "Expert",
    tokens: 50,
    price: "24,99 €",
    description: "50 analyses complètes",
    features: [
      "50 analyses de CV",
      "Corrections détaillées",
      "CV réécrit par IA",
      "Idéal multi-versions",
      "Support dédié",
    ],
    popular: false,
  },
];

export default function TokensPage() {
  const { status } = useSession();
  const router = useRouter();
  const [tokens, setTokens] = useState(0);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
    if (status === "authenticated") {
      fetch("/api/tokens")
        .then((r) => r.json())
        .then((d) => setTokens(d.tokens ?? 0));
    }
  }, [status, router]);

  async function handleBuy(packId: string) {
    setBuying(packId);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setBuying(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Acheter des tokens</h1>
          <p className="mt-1 text-gray-600">
            Choisissez le pack qui vous convient
          </p>
        </div>

        <TokenDisplay tokens={tokens} />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className={`relative rounded-2xl p-6 transition-all hover:scale-105 ${
                pack.popular
                  ? "bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-xl shadow-indigo-500/20"
                  : "bg-white border border-gray-200 shadow-sm"
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                    <Sparkles className="h-3 w-3" />
                    POPULAIRE
                  </span>
                </div>
              )}

              <h3 className={`text-lg font-bold ${pack.popular ? "text-white" : "text-gray-900"}`}>
                {pack.name}
              </h3>
              <div className="mt-2 mb-4">
                <span className={`text-3xl font-extrabold ${pack.popular ? "text-white" : "text-gray-900"}`}>
                  {pack.price}
                </span>
                <span className={`text-sm ml-1 ${pack.popular ? "text-indigo-100" : "text-gray-500"}`}>
                  / {pack.tokens} tokens
                </span>
              </div>

              <ul className="space-y-2 mb-6">
                {pack.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className={`h-4 w-4 flex-shrink-0 ${pack.popular ? "text-indigo-200" : "text-green-500"}`} />
                    <span className={`text-sm ${pack.popular ? "text-indigo-50" : "text-gray-600"}`}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleBuy(pack.id)}
                disabled={buying === pack.id}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 ${
                  pack.popular
                    ? "bg-white text-indigo-600 hover:bg-indigo-50"
                    : "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:shadow-lg"
                }`}
              >
                {buying === pack.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Acheter ${pack.tokens} tokens`
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">
            <strong>Comment ça marche :</strong> 1 token = 1 analyse de CV (score + résumé) | 2 tokens = corrections détaillées + CV réécrit
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Paiement sécurisé par Stripe. Pas d&apos;abonnement, pas de frais cachés.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
