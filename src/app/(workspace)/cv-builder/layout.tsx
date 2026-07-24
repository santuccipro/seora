import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un CV étudiant avec l'IA — Décroché plus d'entretiens",
  description: "Génère un CV professionnel qui retient l'attention des recruteurs en moins de 5 minutes. 30 templates sectoriels pour étudiants et alternants.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
