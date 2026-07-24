import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suivi de candidatures — Kanban étudiant",
  description: "Suis toutes tes candidatures de stage et alternance dans un kanban : planifié, envoyé, relancé, entretien, offre.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
