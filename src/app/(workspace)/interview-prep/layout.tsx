import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Préparer un entretien avec l'IA — Questions + Conseils",
  description: "L'IA génère les questions d'entretien de ton secteur + des exemples de réponses STAR personnalisés.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
