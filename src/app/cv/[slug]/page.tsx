import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildCvHtml } from "@/app/api/cv-build/pdf/route";

interface Props {
  params: Promise<{ slug: string }>;
}

async function fetchPublicCv(slug: string) {
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://tryseora.com";
  const res = await fetch(`${baseUrl}/api/cv-build/publish?slug=${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ payload: Record<string, unknown>; firstName: string; lastName: string; sector: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicCv(slug);
  if (!data) return { title: "CV introuvable — Seora" };
  return {
    title: `CV de ${data.firstName} ${data.lastName} — Seora`,
    description: `Découvrez le CV professionnel de ${data.firstName} ${data.lastName}. Créez le vôtre gratuitement sur Seora.`,
    openGraph: {
      title: `CV de ${data.firstName} ${data.lastName}`,
      description: `Consultez le CV de ${data.firstName} ${data.lastName} sur Seora.`,
      siteName: "Seora",
    },
  };
}

export default async function PublicCvPage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchPublicCv(slug);
  if (!data) notFound();

  // Generate CV HTML server-side
  let cvHtml = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cvHtml = await buildCvHtml(data.payload as any);
  } catch {
    cvHtml = "<p>Erreur lors du rendu du CV.</p>";
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <a href="https://tryseora.com" className="flex items-center gap-2 text-gray-900 font-bold text-lg">
          <span className="text-indigo-600">✦</span> Seora
        </a>
        <a
          href="/auth/signin"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-bold hover:bg-indigo-700 transition-colors"
        >
          Créer mon CV gratuit →
        </a>
      </div>

      {/* CV display */}
      <div className="flex-1 flex flex-col items-center py-8 px-4">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold text-gray-900">
            CV de {data.firstName} {data.lastName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Créé avec Seora · Partagé publiquement</p>
        </div>

        {/* A4 frame */}
        <div
          className="bg-white shadow-2xl rounded-sm overflow-hidden"
          style={{ width: "794px", minHeight: "1123px", maxWidth: "100%" }}
        >
          <iframe
            srcDoc={cvHtml}
            title={`CV de ${data.firstName} ${data.lastName}`}
            className="w-full border-none"
            style={{ height: "1123px" }}
            sandbox="allow-same-origin"
          />
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-sm text-gray-500">Vous souhaitez créer votre CV professionnel ?</p>
          <a
            href="/auth/signin"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 text-sm font-bold shadow-lg hover:shadow-xl transition-shadow"
          >
            ✦ Créer mon CV sur Seora — gratuit
          </a>
          <p className="text-xs text-gray-400">30 templates sectoriels · Photo IA · Export PDF</p>
        </div>
      </div>
    </div>
  );
}
