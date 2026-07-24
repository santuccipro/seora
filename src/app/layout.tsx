import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tryseora.com"),
  title: {
    template: "%s | Seora",
    default: "Seora — L'IA pour étudiants : CV, lettre, détection IA",
  },
  description: "Seora aide les étudiants et alternants français avec l'IA : analyse CV, lettre de motivation, détection IA de texte, humanisateur, préparation entretien.",
  keywords: ["humanisateur de texte IA", "détection IA texte", "CV étudiant IA", "lettre de motivation IA", "Turnitin", "Compilatio", "alternance", "stage", "étudiant"],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://tryseora.com",
    siteName: "Seora",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <AnalyticsProvider />
          {children}
          <Toaster position="top-center" richColors />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
