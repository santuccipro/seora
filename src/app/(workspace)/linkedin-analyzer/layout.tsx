import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyser son profil LinkedIn avec l'IA — Score + Réécriture",
  description: "Analyse ton profil LinkedIn, obtiens un score et un titre/résumé réécrit par l'IA pour attirer les recruteurs.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
