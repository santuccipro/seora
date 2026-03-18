"use client";

import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Mail,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Bot,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const benefits = [
  { icon: Sparkles, text: "5 tokens offerts à l'inscription" },
  { icon: BarChart3, text: "Analyse CV détaillée sur 6 critères" },
  { icon: FileText, text: "Lettre de motivation personnalisée IA" },
  { icon: Bot, text: "Texte 100% indétectable IA" },
];

export default function SignInPage() {
  const [step, setStep] = useState<"email" | "verify">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'envoi du code");
        return;
      }

      toast.success("Code envoyé ! Vérifiez votre boîte mail.");
      setStep("verify");

      if (data.code) {
        const digits = data.code.toString().split("");
        setCode(digits);
      }
    } catch {
      toast.error("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      toast.error("Veuillez entrer le code à 6 chiffres");
      return;
    }

    setLoading(true);

    try {
      const verifyRes = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        toast.error(verifyData.error || "Code invalide");
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email,
        name: email.split("@")[0],
        redirect: false,
      });

      if (signInRes?.ok) {
        router.push("/app");
      } else {
        toast.error("Erreur lors de la connexion");
      }
    } catch {
      toast.error("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Seora{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                CV
              </span>
            </span>
          </Link>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div
              className={`h-2 w-8 rounded-full transition-colors ${step === "email" ? "bg-indigo-500" : "bg-gray-200"}`}
            />
            <div
              className={`h-2 w-8 rounded-full transition-colors ${step === "verify" ? "bg-indigo-500" : "bg-gray-200"}`}
            />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            {step === "email" ? "Accédez à Seora CV" : "Vérification"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {step === "email"
              ? "Entrez votre email pour commencer"
              : `Code envoyé à ${email}`}
          </p>
        </div>

        {/* Benefits (step 1 only) */}
        {step === "email" && (
          <div className="mb-6 grid grid-cols-2 gap-2">
            {benefits.map((b) => (
              <div
                key={b.text}
                className="flex items-center gap-2 rounded-xl bg-white border border-gray-100 px-3 py-2.5 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-xs text-gray-600">{b.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {loading ? "Envoi du code..." : "Continuer"}
              </button>

              {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-4 text-gray-400">ou</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => signIn("google", { callbackUrl: "/app" })}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Continuer avec Google
                  </button>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  Entrez le code à 6 chiffres
                </label>
                <div
                  className="flex gap-2 justify-center"
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
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || code.join("").length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {loading ? "Vérification..." : "Vérifier et se connecter"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode(["", "", "", "", "", ""]);
                  }}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Changer d&apos;email
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSendCode({
                      preventDefault: () => {},
                    } as React.FormEvent)
                  }
                  className="text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  Renvoyer le code
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          En continuant, vous acceptez nos{" "}
          <Link href="/cgu" className="underline hover:text-gray-600">
            conditions d&apos;utilisation
          </Link>{" "}
          et notre{" "}
          <Link
            href="/confidentialite"
            className="underline hover:text-gray-600"
          >
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
