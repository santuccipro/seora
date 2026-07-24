import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Humanisateur de texte IA gratuit — Indétectable Turnitin & Compilatio",
  description: "Humanise ton texte généré par IA en 30 secondes. Contourne Turnitin, Compilatio et GPTZero. Résultat 100% humain, garanti.",
};

export default function HumanizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
