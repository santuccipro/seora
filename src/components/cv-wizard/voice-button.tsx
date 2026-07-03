"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface VoiceButtonProps {
  onTranscription: (text: string) => void;
  /** @deprecated Use onTranscription instead */
  onRecordingComplete?: (blob: Blob) => void;
  /** Context hint for smarter reformulation: "profile" | "skills" | "experience" | "style" */
  context?: string;
  label?: string;
  className?: string;
}

export default function VoiceButton({
  onTranscription,
  onRecordingComplete,
  context,
  label = "Dicter",
  className = "",
}: VoiceButtonProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const transcribeAudio = useCallback(async (blob: Blob) => {
    setProcessing(true);
    try {
      // Legacy callback
      if (onRecordingComplete) onRecordingComplete(blob);

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      if (context) formData.append("context", context);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Transcription failed");
      }

      const data = await res.json();
      if (data.text && data.text.trim()) {
        onTranscription(data.text.trim());
        toast.success("Transcription terminée");
      } else {
        toast.error("Aucun texte détecté, réessaie");
      }
    } catch {
      toast.error("Erreur de transcription");
    } finally {
      setProcessing(false);
    }
  }, [onTranscription, onRecordingComplete]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        transcribeAudio(blob);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      toast.error("Micro non disponible");
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  return (
    <button
      type="button"
      onClick={recording ? stopRecording : startRecording}
      disabled={processing}
      className={`relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 ${
        recording
          ? "bg-red-50 text-red-600 border border-red-200"
          : processing
          ? "bg-gray-100 text-gray-400"
          : "bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100"
      } ${className}`}
    >
      <AnimatePresence mode="wait">
        {recording ? (
          <motion.div
            key="recording"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="relative"
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-red-400"
              animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <MicOff className="h-4 w-4 relative z-10" />
          </motion.div>
        ) : processing ? (
          <motion.div
            key="processing"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Mic className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>
      <span>{recording ? "Stop" : processing ? "Transcription..." : label}</span>
    </button>
  );
}
