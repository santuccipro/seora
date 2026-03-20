"use client";

import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import {
  Mail,
  Shield,
  Loader2,
  ArrowRight,
  Coins,
  X,
  CheckCircle2,
  Sparkles,
  FileText,
  Bot,
} from "lucide-react";
import Link from "next/link";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg animate-slide-up sm:animate-scale-in bg-white sm:glass-strong rounded-t-3xl sm:rounded-3xl p-0 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 hover:bg-gray-100/50 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <OTPAuthForm
          onSuccess={() => {
            onClose();
            if (onSuccess) onSuccess();
            else window.location.reload();
          }}
        />
      </div>
    </div>
  );
}

const benefits = [
  { icon: FileText, text: "Corrections détaillées de ton CV" },
  { icon: Sparkles, text: "CV réécrit et optimisé par l'IA" },
  { icon: Bot, text: "Score de 42 → 90+ en 30 secondes" },
  { icon: CheckCircle2, text: "Passe les filtres ATS des recruteurs" },
];

function OTPAuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setStep("code");
      toast.success("Code envoyé à " + email);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (value && index === 5 && newCode.every((c) => c))
      verifyCode(newCode.join(""));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const verifyCode = async (fullCode: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Code invalide");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
      const signInRes = await signIn("credentials", {
        email,
        name: data.user?.name || email.split("@")[0],
        redirect: false,
      });
      if (signInRes?.ok) {
        toast.success("Bienvenue ! 5 tokens offerts");
        onSuccess();
      } else {
        toast.error("Erreur");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setCode(pasted.split(""));
      inputRefs.current[5]?.focus();
      verifyCode(pasted);
    }
  };

  return (
    <div className="px-6 py-8 sm:p-8">
      {step === "email" ? (
        <>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
              <Mail className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">
              Débloque ton résultat complet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Entre ton email pour voir les corrections
            </p>
          </div>

          {/* Benefits list */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {benefits.map((b) => (
              <div
                key={b.text}
                className="flex items-center gap-2 rounded-xl bg-gray-50/80 px-3 py-2.5"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-xs text-gray-600 leading-tight">{b.text}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendCode} className="mt-5 space-y-3">
            {/* text-base (16px) prevents iOS Safari auto-zoom on focus */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-gray-200/60 bg-white px-4 py-3.5 text-base outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-4 py-3.5 text-base font-semibold text-white disabled:opacity-50 shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-transform"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {loading ? "Envoi..." : "Continuer"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-[11px] text-gray-400">🔒 Tes données restent confidentielles</span>
          </div>

          <p className="mt-3 text-center text-[10px] text-gray-400">
            En continuant, vous acceptez nos{" "}
            <Link href="/cgu" className="underline hover:text-gray-600">
              CGU
            </Link>{" "}
            et{" "}
            <Link
              href="/confidentialite"
              className="underline hover:text-gray-600"
            >
              Politique de confidentialité
            </Link>
          </p>
        </>
      ) : (
        <>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <Shield className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">
              Vérification
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Code envoyé à <strong className="text-gray-700">{email}</strong>
            </p>
            <p className="mt-1 text-xs text-gray-400">Vérifie tes spams si tu ne le vois pas</p>
          </div>
          <div
            className="mt-6 flex justify-center gap-2.5 sm:gap-3"
            onPaste={handlePaste}
          >
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`h-13 w-12 sm:h-14 sm:w-13 rounded-xl border-2 text-center text-xl font-bold outline-none transition-all ${
                  digit
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white"
                } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
              />
            ))}
          </div>
          {loading && (
            <div className="mt-4 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            </div>
          )}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => {
                setStep("email");
                setCode(["", "", "", "", "", ""]);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              &larr; Changer d&apos;email
            </button>
            <button
              onClick={() =>
                handleSendCode({
                  preventDefault: () => {},
                } as React.FormEvent)
              }
              className="text-sm text-indigo-600 font-medium hover:underline py-2"
            >
              Renvoyer le code
            </button>
          </div>
        </>
      )}
    </div>
  );
}
