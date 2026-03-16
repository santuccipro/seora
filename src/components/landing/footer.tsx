"use client";

import { FileText } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              CV <span className="gradient-text">Master</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/mentions-legales" className="hover:text-indigo-600 transition-colors">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-indigo-600 transition-colors">
              Confidentialité
            </Link>
            <Link href="/cgv" className="hover:text-indigo-600 transition-colors">
              CGV
            </Link>
          </div>

          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} CV Master. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
