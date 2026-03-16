"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";

interface CVUploaderProps {
  tokens: number;
  onAnalysisComplete: () => void;
}

export function CVUploader({ tokens, onAnalysisComplete }: CVUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f) {
      if (f.type !== "application/pdf") {
        toast.error("Seuls les fichiers PDF sont acceptés");
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error("Le fichier ne doit pas dépasser 10 Mo");
        return;
      }
      setFile(f);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
  });

  async function handleAnalyze() {
    if (!file) return;

    if (tokens <= 0) {
      toast.error("Vous n'avez plus de tokens. Achetez-en pour continuer.");
      router.push("/tokens");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("cv", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'analyse");
        return;
      }

      toast.success("CV analysé avec succès !");
      setFile(null);
      onAnalysisComplete();
      router.push(`/analyse/${data.id}`);
    } catch {
      toast.error("Erreur de connexion. Réessayez.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Analyser un CV
      </h2>

      {tokens <= 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Vous n&apos;avez plus de tokens. Achetez-en pour analyser votre CV.
        </div>
      )}

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
          isDragActive
            ? "border-indigo-400 bg-indigo-50"
            : file
            ? "border-green-300 bg-green-50"
            : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <FileText className="h-12 w-12 text-green-500" />
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(0)} Ko
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Cliquez pour changer de fichier
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-12 w-12 text-gray-300" />
            <div>
              <p className="font-medium text-gray-700">
                Glissez-déposez votre CV ici
              </p>
              <p className="text-sm text-gray-500">
                ou cliquez pour sélectionner (PDF, max 10 Mo)
              </p>
            </div>
          </div>
        )}
      </div>

      {file && (
        <button
          onClick={handleAnalyze}
          disabled={uploading || tokens <= 0}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              Analyser mon CV (1 token)
            </>
          )}
        </button>
      )}

      <p className="mt-3 text-xs text-gray-400 text-center">
        Coût : 1 token pour l&apos;analyse | 2 tokens pour les corrections détaillées
      </p>
    </div>
  );
}
