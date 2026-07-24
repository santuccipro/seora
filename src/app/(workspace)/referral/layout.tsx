import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parrainer un ami — Seora",
  description: "Invite un ami sur Seora et gagnez chacun des tokens gratuits.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
