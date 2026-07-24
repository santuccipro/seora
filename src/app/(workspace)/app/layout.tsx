import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon espace",
  description: "Ton espace Seora : CV, lettre de motivation, LinkedIn, détection IA et préparation entretien.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
