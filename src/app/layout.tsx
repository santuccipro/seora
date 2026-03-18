import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Seora CV - Analyse et Correction de CV par IA",
  description:
    "Optimisez votre CV en quelques minutes grâce à l'intelligence artificielle. Score, analyse détaillée et corrections personnalisées pour décrocher le job de vos rêves.",
  keywords: ["CV", "correction CV", "analyse CV", "IA", "recrutement", "emploi", "France"],
  openGraph: {
    title: "Seora CV - Analyse et Correction de CV par IA",
    description:
      "Optimisez votre CV en quelques minutes grâce à l'intelligence artificielle. Score détaillé, corrections et lettre de motivation personnalisée.",
    url: "https://seora-cv.com",
    siteName: "Seora CV",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seora CV - Analyse de CV par IA",
    description:
      "Score détaillé, corrections personnalisées et lettre de motivation IA pour décrocher le job de vos rêves.",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://seora-cv.com"),
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
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
