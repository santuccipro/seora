import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Détecteur IA de texte — Teste avant Turnitin & Compilatio",
  description: "Vérifie si ton texte sera détecté comme IA avant de le rendre. Score 0-100, zones à risque, comparaison 4 détecteurs. Résultat en 10 secondes.",
};

export default function AiDetectorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
