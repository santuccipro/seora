"use client";

import { Coins, Plus } from "lucide-react";
import Link from "next/link";

export function TokenDisplay({ tokens }: { tokens: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 p-6 text-white shadow-lg shadow-indigo-500/20">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
          <Coins className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-indigo-100">Vos tokens</p>
          <p className="text-3xl font-bold">{tokens}</p>
        </div>
      </div>
      <Link
        href="/tokens"
        className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-medium hover:bg-white/30 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Acheter des tokens
      </Link>
    </div>
  );
}
