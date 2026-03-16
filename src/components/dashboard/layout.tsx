"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  FileText,
  LayoutDashboard,
  Coins,
  LogOut,
  Target,
  PenTool,
  Users,
  BarChart3,
  Gift,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/job-match", label: "Matcher une offre", icon: Target },
  { href: "/cover-letter", label: "Lettre de motivation", icon: PenTool },
  { href: "/referral", label: "Parrainage", icon: Gift },
  { href: "/tokens", label: "Tokens", icon: Coins },
];

const adminItems = [
  { href: "/admin", label: "Admin", icon: BarChart3 },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Show admin link (we'll check actual admin status server-side)
  const allNavItems = [...navItems, ...adminItems];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r border-gray-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                CV <span className="gradient-text">Master</span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Outils
            </p>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className="h-4.5 w-4.5" />
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-4">
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Gestion
              </p>
              {adminItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-gray-100 p-4">
            <div className="mb-3 px-4">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {session?.user?.email}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4.5 w-4.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">CV Master</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.slice(0, 4).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`p-2 rounded-lg ${
                  pathname === item.href ? "text-indigo-600 bg-indigo-50" : "text-gray-400"
                }`}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 p-6 pt-20 lg:p-10 lg:pt-10 overflow-auto">
        <div className="mx-auto max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
