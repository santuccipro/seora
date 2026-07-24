import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photo LinkedIn professionnelle avec l'IA",
  description: "Génère une photo de profil LinkedIn professionnelle en 10 styles différents grâce à l'IA.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
