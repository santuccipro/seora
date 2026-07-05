"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bot,
  Camera,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  PenTool,
  Plus,
  Search,
  Sparkles,
  Coins,
  X,
  Menu,
} from "lucide-react";

/**
 * Single unified sidebar for the logged-in workspace. Groups every feature
 * behind one navigation surface so the client stops getting lost between
 * /app, /humanizer, /ai-detector, etc.
 */

const NAV = [
  { key: "dashboard", href: "/app", label: "Dashboard", icon: LayoutDashboard, group: "home" },
  { key: "ai-detector", href: "/ai-detector", label: "Détection IA texte", icon: Search, cost: "1 token", group: "features" },
  { key: "humanizer", href: "/humanizer", label: "Analyse doc / DPP", icon: Bot, cost: "1 token", group: "features" },
  { key: "cv-analyze", href: "/app?tab=analyze", label: "Analyser mon CV", icon: BarChart3, cost: "1 token", group: "cv" },
  { key: "cv-builder", href: "/cv-builder", label: "Créer mon CV", icon: Plus, cost: "gratuit", group: "cv" },
  { key: "photo-pro", href: "/photo-pro", label: "Photo pro IA", icon: Camera, cost: "1 token", group: "features" },
  { key: "cover-letter", href: "/app?tab=cover-letter", label: "Lettre de motivation", icon: PenTool, cost: "3 tokens", group: "features" },
] as const;

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((d) => setTokens(d?.tokens ?? null))
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    setOpenMobile(false); // close mobile drawer on navigation
  }, [pathname]);

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    if (path === "/app") return pathname === "/app";
    return pathname.startsWith(path);
  };

  const email = session?.user?.email ?? "";
  const initial = (email[0] ?? "?").toUpperCase();

  return (
    <>
      {/* Mobile: floating menu button */}
      <button
        onClick={() => setOpenMobile((v) => !v)}
        className="lg:hidden fixed top-4 left-4 z-40 rounded-xl bg-white shadow-lg border border-gray-200 h-10 w-10 flex items-center justify-center"
        aria-label="Menu"
      >
        {openMobile ? <X className="h-5 w-5 text-gray-700" /> : <Menu className="h-5 w-5 text-gray-700" />}
      </button>

      {/* Mobile: dark overlay when open */}
      {openMobile && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpenMobile(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col
          transform transition-transform lg:translate-x-0
          ${openMobile ? "translate-x-0" : "-translate-x-full"}
          lg:sticky lg:top-0 lg:h-screen
        `}
      >
        {/* Brand */}
        <Link href="/app" className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-black text-gray-900">Seora</span>
        </Link>

        {/* Tokens badge */}
        <div className="mx-4 mt-3 mb-2 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Coins className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-amber-800 font-bold">Solde</p>
              <p className="text-lg font-black text-amber-900 leading-none">
                {tokens === null ? "…" : tokens}
                <span className="text-[10px] text-amber-700 font-semibold ml-1">tokens</span>
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          <div>
            <p className="px-2 pt-2 pb-1 text-[9px] uppercase tracking-widest text-gray-400 font-black">Accueil</p>
            {NAV.filter((n) => n.group === "home").map((n) => {
              const Icon = n.icon;
              const active = isActive(n.href);
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{n.label}</span>
                </Link>
              );
            })}
          </div>

          <div>
            <p className="px-2 pb-1 text-[9px] uppercase tracking-widest text-gray-400 font-black">Mon CV</p>
            {NAV.filter((n) => n.group === "cv").map((n) => {
              const Icon = n.icon;
              const active = isActive(n.href);
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    active ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{n.label}</span>
                  <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-500">
                    {"cost" in n ? n.cost : ""}
                  </span>
                </Link>
              );
            })}
          </div>

          <div>
            <p className="px-2 pb-1 text-[9px] uppercase tracking-widest text-gray-400 font-black">Outils IA</p>
            {NAV.filter((n) => n.group === "features").map((n) => {
              const Icon = n.icon;
              const active = isActive(n.href);
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{n.label}</span>
                  <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400">
                    {"cost" in n ? n.cost : ""}
                  </span>
                </Link>
              );
            })}
          </div>

          <div>
            <p className="px-2 pb-1 text-[9px] uppercase tracking-widest text-gray-400 font-black">Historique</p>
            <Link
              href="/humanizer/history"
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                pathname.startsWith("/humanizer/history") ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <History className="h-4 w-4 shrink-0" />
              <span className="flex-1">Historique</span>
            </Link>
          </div>
        </nav>

        {/* Footer with user */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{email.split("@")[0]}</p>
              <p className="text-[10px] text-gray-400 truncate">{email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold py-2 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}

/** Wrap any workspace page with this to get the sidebar layout. */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <WorkspaceSidebar />
      <main className="flex-1 min-w-0 lg:ml-0">{children}</main>
    </div>
  );
}
