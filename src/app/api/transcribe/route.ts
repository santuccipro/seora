import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callClaude } from "@/lib/claude-client";

const ELEVEN_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const ELEVEN_MODEL = "scribe_v1";

const REFORMULATION_PROMPTS: Record<string, string> = {
  profile: `Tu es un coach CV français. Reformule cette transcription orale en une accroche pro de 2-3 phrases pour un CV. Ton pro à la 1ère personne, verbes d'action + vocabulaire corporate, zéro hésitation ("euh", "bah", "genre", "du coup"). Retourne UNIQUEMENT le texte reformulé.`,
  skills: `Tu es un coach CV français. Extrais les compétences et retourne une liste séparée par des virgules. Termes pros (ex: "gestion de projet"), capitalisation correcte, zéro hésitation. Retourne UNIQUEMENT les compétences séparées par des virgules.`,
  experience: `Tu es un coach CV français. Reformule en bullet points pros. Chaque point commence par un verbe d'action fort (Piloté, Développé, Optimisé, Géré, Conçu...), ajoute des résultats chiffrés si mentionnés, sépare par des points. Retourne UNIQUEMENT les bullet points.`,
  style: `Reformule clairement les préférences de design exprimées. Retourne UNIQUEMENT le texte reformulé.`,
  default: `Reformule cette transcription orale en texte pro pour un CV. Ton pro, vocab corporate, zéro hésitation. Retourne UNIQUEMENT le texte reformulé.`,
};

/**
 * POST /api/transcribe — FormData { audio, context? }
 * Pipeline: ElevenLabs Scribe (speech-to-text) → Claude reformulation.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return NextResponse.json(
        { error: "Transcription indisponible : ELEVENLABS_API_KEY absent sur Vercel." },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const context = (formData.get("context") as string | null) ?? "default";
    if (!audioFile) {
      return NextResponse.json({ error: "Aucun fichier audio" }, { status: 400 });
    }

    const sttForm = new FormData();
    sttForm.append("file", audioFile, audioFile.name || "audio.webm");
    sttForm.append("model_id", ELEVEN_MODEL);
    sttForm.append("language_code", "fra");

    const sttRes = await fetch(ELEVEN_STT_URL, {
      method: "POST",
      headers: { "xi-api-key": elevenKey },
      body: sttForm,
    });
    if (!sttRes.ok) {
      const detail = await sttRes.text().catch(() => "");
      return NextResponse.json(
        { error: `ElevenLabs STT ${sttRes.status}: ${detail.slice(0, 200)}` },
        { status: 502 }
      );
    }
    const sttPayload = (await sttRes.json()) as { text?: string };
    const transcript = (sttPayload.text ?? "").trim();
    if (!transcript) {
      return NextResponse.json({ error: "Transcription vide" }, { status: 422 });
    }

    const prompt = `${REFORMULATION_PROMPTS[context] ?? REFORMULATION_PROMPTS.default}\n\nTranscription orale :\n${transcript}`;
    const text = (await callClaude(prompt, {
      system: "Tu réponds uniquement avec le texte reformulé, sans commentaire, sans balise, sans guillemets.",
      model: "claude-haiku-4-5",
    })).trim();

    return NextResponse.json({ text, transcript });
  } catch (err) {
    console.error("[api/transcribe] Fatal:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
