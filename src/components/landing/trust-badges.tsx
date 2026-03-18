"use client";

import { Star, Shield, CheckCircle2 } from "lucide-react";

export function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-6">
      {/* Rating */}
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i <= 4 ? "fill-amber-400 text-amber-400" : "fill-amber-400/50 text-amber-400/50"}`}
            />
          ))}
        </div>
        <span className="text-sm font-bold text-gray-900">4.9</span>
        <span className="text-xs text-gray-500">1 783 avis</span>
      </div>

      <div className="hidden sm:block h-4 w-px bg-gray-200" />

      {/* Verified badges */}
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-emerald-500" />
        <span className="text-xs text-gray-600">Vérifié avec :</span>
        <div className="flex items-center gap-2">
          {["GPTZero", "Turnitin", "Compilatio", "Originality.ai"].map(
            (name) => (
              <span
                key={name}
                className="rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
              >
                {name}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function VerifiedBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Résultat vérifié
    </div>
  );
}
