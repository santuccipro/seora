import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Candidature Express — CV adapté + Lettre + Tips en 60 secondes",
  description: "Colle une offre d'emploi et reçois un résumé CV adapté, une lettre de motivation et 5 conseils entretien en moins d'une minute.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
