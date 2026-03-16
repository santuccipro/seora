"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { CVUploader } from "@/components/dashboard/cv-uploader";
import { AnalysisList } from "@/components/dashboard/analysis-list";
import { TokenDisplay } from "@/components/dashboard/token-display";
import { Loader2 } from "lucide-react";

interface Analysis {
  id: string;
  fileName: string;
  score: number | null;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [tokens, setTokens] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tokensRes, analysesRes] = await Promise.all([
        fetch("/api/tokens"),
        fetch("/api/analyses"),
      ]);
      const tokensData = await tokensRes.json();
      setTokens(tokensData.tokens ?? 0);

      if (analysesRes.ok) {
        const analysesData = await analysesRes.json();
        setAnalyses(analysesData);
      }
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {session?.user?.name || "vous"} !
          </h1>
          <p className="mt-1 text-gray-600">
            Uploadez votre CV pour obtenir une analyse complète par IA
          </p>
        </div>

        <TokenDisplay tokens={tokens} />

        <CVUploader
          tokens={tokens}
          onAnalysisComplete={() => fetchData()}
        />

        <AnalysisList analyses={analyses} />
      </div>
    </DashboardLayout>
  );
}
