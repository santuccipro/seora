import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lettre de motivation IA — Personnalisée pour chaque offre",
  description: "Génère une lettre de motivation sur-mesure adaptée à l'offre et à ton profil étudiant. En 30 secondes.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
