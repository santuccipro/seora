"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { FileText, Menu, X } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Seora <span className="gradient-text">CV</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#fonctionnement" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              Comment ça marche
            </a>
            <a href="#fonctionnalites" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              Fonctionnalités
            </a>
            <a href="#tarifs" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              Tarifs
            </a>
            <a href="#faq" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              FAQ
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {session ? (
              <Link
                href="/app"
                className="rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
              >
                Mon compte
              </Link>
            ) : (
              <button
                onClick={() => signIn()}
                className="rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
              >
                Se connecter
              </button>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <a href="#fonctionnement" className="block text-sm text-gray-600 py-2">Comment ça marche</a>
            <a href="#fonctionnalites" className="block text-sm text-gray-600 py-2">Fonctionnalités</a>
            <a href="#tarifs" className="block text-sm text-gray-600 py-2">Tarifs</a>
            <a href="#faq" className="block text-sm text-gray-600 py-2">FAQ</a>
            {session ? (
              <Link
                href="/app"
                className="block w-full text-center rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2.5 text-sm font-medium text-white"
              >
                Mon compte
              </Link>
            ) : (
              <button
                onClick={() => signIn()}
                className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2.5 text-sm font-medium text-white"
              >
                Se connecter
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
