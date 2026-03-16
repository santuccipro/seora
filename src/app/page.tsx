"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Upload,
  Loader2,
  CheckCircle2,
  X,
  FileText,
  BarChart3,
  Briefcase,
  Zap,
  Mail,
  Shield,
  PenTool,
  Coins,
  ArrowRight,
  Star,
  XCircle,
  ChevronDown,
  TrendingUp,
  Sparkles,
  Bot,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";


/* ─── Scroll Reveal Hook ─── */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}

/* ═══════════════════════════════════════════════ */
/*          CV MASTER — LANDING PAGE              */
/* ═══════════════════════════════════════════════ */
export default function Home() {
  const { data: session } = useSession();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [tokens, setTokens] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);
  const [activeAudience, setActiveAudience] = useState(0);

  useScrollReveal();

  useEffect(() => {
    if (session) {
      fetch("/api/tokens").then(r => r.json()).then(d => setTokens(d.tokens)).catch(() => {});
    }
  }, [session]);


  return (
    <div className="min-h-screen bg-mesh overflow-hidden">

      {/* ═══ GLOBAL FLOATING ORBS ═══ */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="orb orb-indigo animate-float-slow w-[500px] h-[500px] -top-40 -left-40 opacity-60" />
        <div className="orb orb-purple animate-float-medium w-[600px] h-[600px] top-[20%] -right-60 opacity-40" />
        <div className="orb orb-blue animate-float-reverse w-[400px] h-[400px] top-[55%] -left-20 opacity-30" />
        <div className="orb orb-pink animate-float-slow w-[350px] h-[350px] top-[75%] right-[10%] opacity-25" style={{ animationDelay: "5s" }} />
        <div className="orb orb-cyan animate-float-medium w-[300px] h-[300px] top-[40%] left-[40%] opacity-20" style={{ animationDelay: "8s" }} />
      </div>

      {/* ═══ GRID PATTERN OVERLAY ═══ */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-50" />

      {/* All content above orbs */}
      <div className="relative z-10">

        {/* ══════════════════════════════════════ */}
        {/*  1. NAVBAR                             */}
        {/* ══════════════════════════════════════ */}
        <nav className="sticky top-0 z-50">
          <div className="mx-auto max-w-4xl px-4 pt-3">
            <div className="flex h-14 items-center justify-between rounded-2xl glass-strong px-5">
              <div className="flex items-center gap-2.5">
                <img src="/logos/seora-icon.png" alt="Seora" className="h-9 w-9 rounded-xl" draggable={false} />
                <span className="text-base font-bold tracking-tight text-gray-900">Seora</span>
              </div>

              <div className="hidden items-center gap-5 md:flex">
                {/* Outils dropdown */}
                <div className="relative" onMouseEnter={() => setShowTools(true)} onMouseLeave={() => setShowTools(false)}>
                  <button onClick={() => setShowTools(!showTools)} className="flex items-center gap-1 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    Outils
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showTools ? "rotate-180" : ""}`} />
                  </button>
                  {showTools && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                      <div className="rounded-2xl p-3 shadow-2xl shadow-black/10 border border-white/50 w-[440px] grid grid-cols-2 gap-1 bg-white/90 backdrop-blur-xl">
                        {[
                          { href: "/app", icon: BarChart3, label: "Analyse CV", desc: "Score sur 6 critères", color: "text-indigo-600 bg-indigo-50" },
                          { href: "/app", icon: Sparkles, label: "Corrections IA", desc: "Réécriture intelligente", color: "text-purple-600 bg-purple-50" },
                          { href: "/cover-letter", icon: PenTool, label: "Lettre de motivation", desc: "Adaptée à l'offre", color: "text-blue-600 bg-blue-50" },
                          { href: "/job-match", icon: Briefcase, label: "Job Matching", desc: "CV sur-mesure", color: "text-emerald-600 bg-emerald-50" },
                          { href: "/humanize", icon: Bot, label: "Humanizer IA", desc: "Texte indétectable", color: "text-orange-600 bg-orange-50" },
                          { href: "/plagiarism", icon: Search, label: "Détecteur plagiat", desc: "Score d'originalité", color: "text-red-600 bg-red-50" },
                          { href: "/reformulate", icon: RefreshCw, label: "Reformulateur", desc: "Reformulez en 1 clic", color: "text-cyan-600 bg-cyan-50" },
                          { href: "/email-pro", icon: Send, label: "Email Pro", desc: "Relances & candidatures", color: "text-pink-600 bg-pink-50" },
                        ].map((tool) => (
                          <Link
                            key={tool.label}
                            href={tool.href}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-white/60 transition-colors group"
                          >
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tool.color} shrink-0`}>
                              <tool.icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-gray-900 truncate">{tool.label}</p>
                              <p className="text-[10px] text-gray-400 truncate">{tool.desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <a href="#pricing" className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors">Tarifs</a>
                <a href="#faq" className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors">FAQ</a>
              </div>

              <div className="flex items-center gap-2">
                {session ? (
                  <>
                    <div className="flex items-center gap-1.5 rounded-full bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                      <Coins className="h-3 w-3" />
                      {tokens !== null ? tokens : "..."} tokens
                    </div>
                    <Link href="/app" className="brand-gradient rounded-xl px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-indigo-500/25">
                      Dashboard
                    </Link>
                  </>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="brand-gradient flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                  >
                    Essayer gratuitement
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════ */}
        {/*  2. HERO — Emotional, direct           */}
        {/* ══════════════════════════════════════ */}
        <section className="relative pt-20 pb-12 sm:pt-28 sm:pb-16">
          <div className="relative mx-auto max-w-2xl px-6 text-center">
            {/* Badge */}
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full glass-strong px-4 py-1.5 text-xs font-semibold text-indigo-700 mb-6 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Déjà utilisé par +12 000 étudiants en France
            </div>

            <h1 className="animate-fade-up delay-100 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl leading-[1.08]" style={{ animationFillMode: "both" }}>
              Le seul outil qui analyse, réécrit<br />
              <span className="brand-gradient-text">et adapte ton CV à chaque offre.</span>
            </h1>

            <p className="animate-fade-up delay-200 mx-auto mt-5 max-w-lg text-base text-gray-500 leading-relaxed sm:text-lg" style={{ animationFillMode: "both" }}>
              Score détaillé, corrections IA, lettre de motivation sur-mesure — tout en 30 secondes. <strong className="text-gray-700">Aucun autre outil ne fait ça.</strong>
            </p>

            <div className="animate-fade-up delay-300 mt-8 flex flex-col items-center gap-4" style={{ animationFillMode: "both" }}>
              <Link
                href="/app"
                className="brand-gradient animate-cta-pulse flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white hover:scale-[1.03] transition-transform"
              >
                Analyse ton CV gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-xs text-gray-400">Gratuit, sans carte bancaire. Résultat en 30 secondes.</p>
            </div>

            {/* Social proof */}
            <div className="animate-fade-up delay-500 mt-10 flex items-center justify-center gap-2.5" style={{ animationFillMode: "both" }}>
              <img src="/logos/customers.webp" alt="Utilisateurs" className="h-10" draggable={false} />
              <p className="text-sm text-gray-500">
                <strong className="text-gray-900 font-bold text-base">4.9/5</strong> · utilisé par <strong className="text-gray-800 font-semibold">1 783</strong> étudiants <img src="/logos/blue-badge.svg" alt="Vérifié" className="h-4 w-4 inline-block ml-0.5 -mt-0.5" />
              </p>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/*  3. TRUST BAR — Stats + écoles         */}
        {/* ══════════════════════════════════════ */}
        <section className="py-6 border-y border-white/30 overflow-hidden">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-5">
              Utilisé par des étudiants et diplômés de
            </p>
            <div className="relative">
              {/* Fade edges */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10" style={{background:"linear-gradient(to right, rgb(237,233,254), transparent)"}} />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10" style={{background:"linear-gradient(to left, rgb(237,233,254), transparent)"}} />
              {/* Scrolling logos */}
              <div className="flex animate-scroll-logos items-center gap-16 w-max">
                {[...Array(2)].map((_, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-16 shrink-0">
                    {[
                      { src: "/logos/hec.png", alt: "HEC Paris", h: "h-8" },
                      { src: "/logos/essec.png", alt: "ESSEC", h: "h-7" },
                      { src: "/logos/sciencespo.png", alt: "Sciences Po", h: "h-7" },
                      { src: "/logos/dauphine.png", alt: "Dauphine PSL", h: "h-7" },
                      { src: "/logos/polytechnique.png", alt: "Polytechnique", h: "h-9" },
                      { src: "/logos/epitech.png", alt: "EPITECH", h: "h-6" },
                      { src: "/logos/edhec.png", alt: "EDHEC", h: "h-7" },
                      { src: "/logos/emlyon.png", alt: "EM Lyon", h: "h-8" },
                    ].map((logo) => (
                      <img
                        key={logo.alt}
                        src={logo.src}
                        alt={logo.alt}
                        className={`${logo.h} w-auto object-contain opacity-40 grayscale hover:opacity-70 hover:grayscale-0 transition-all duration-300`}
                        draggable={false}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/*  4. DEMO — 3 separate animated cards   */}
        {/* ══════════════════════════════════════ */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl mb-3">
                Regarde ce que l&apos;IA fait de ton CV <span className="brand-gradient-text">en 30 secondes</span>
              </h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Dépose ton CV, l&apos;IA l&apos;analyse et le corrige automatiquement.
              </p>
            </div>

            {/* Tab selector */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[
                { icon: BarChart3, label: "Analyse CV", idx: 0 },
                { icon: PenTool, label: "Lettre de motivation", idx: 2 },
              ].map((tab) => (
                <button
                  key={tab.idx}
                  onClick={() => setActiveDemo(tab.idx)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                    activeDemo === tab.idx
                      ? "brand-gradient text-white shadow-lg shadow-indigo-500/20"
                      : "glass-card text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Single card at a time */}
            <div className="mx-auto max-w-lg">

              {/* ─── Demo 1: Analyse CV ─── */}
              {activeDemo === 0 && (
                <div className="glass-card rounded-3xl overflow-hidden animate-fade-up" style={{ animationDuration: "0.3s" }}>
                  <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-200/60">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
                      <BarChart3 className="h-4.5 w-4.5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Analyse CV</p>
                      <p className="text-[11px] text-gray-400">Score détaillé sur 6 critères en 30 secondes</p>
                    </div>
                  </div>
                  <div className="relative h-[340px] overflow-hidden">
                    {/* Phase 1: Upload */}
                    <div className="anim-phase anim-a-phase1 absolute inset-0 flex flex-col items-center justify-center p-6">
                      <div className="anim-a-file w-24 h-32 rounded-xl bg-white border-2 border-dashed border-indigo-300 flex flex-col items-center justify-center shadow-lg shadow-indigo-100/50">
                        <FileText className="h-8 w-8 text-indigo-400 mb-2" />
                        <span className="text-[9px] font-bold text-indigo-500">mon-cv.pdf</span>
                        <span className="text-[8px] text-gray-400 mt-0.5">245 Ko</span>
                      </div>
                      <div className="mt-5 w-52 h-12 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 anim-a-zone">
                        <Upload className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-[10px] text-gray-400 font-medium">Déposez votre CV ici</span>
                      </div>
                    </div>
                    {/* Phase 2: Scanning */}
                    <div className="anim-phase anim-a-phase2 absolute inset-0 flex flex-col items-center justify-center p-6">
                      <div className="w-full max-w-xs">
                        <div className="rounded-xl bg-white border border-gray-200/80 p-5 shadow-sm space-y-3 relative overflow-hidden">
                          <div className="anim-a-scanline absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                          <div className="space-y-2">
                            <div className="h-3 w-28 rounded bg-gray-800/80" />
                            <div className="h-2 w-40 rounded bg-gray-300" />
                          </div>
                          <div className="border-t border-gray-100 pt-3 space-y-2">
                            <div className="h-2 w-full rounded bg-gray-200" />
                            <div className="h-2 w-5/6 rounded bg-gray-200" />
                            <div className="h-2 w-4/6 rounded bg-gray-200" />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                              <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                              Analyse en cours...
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                            <div className="anim-a-progress h-full rounded-full brand-gradient" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Phase 3: Bad Score (red) */}
                    <div className="anim-phase anim-a-phase3 absolute inset-0 flex flex-col items-center justify-center p-6">
                      <div className="anim-a-score-pop">
                        <svg width="120" height="120" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#EF4444" strokeWidth="8"
                            strokeDasharray="314" className="anim-a-ring-bad"
                            strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-extrabold text-red-500">32</span>
                          <span className="text-[10px] text-gray-400 -mt-0.5">/100</span>
                        </div>
                      </div>
                      <div className="mt-5 w-full max-w-[220px] space-y-2 anim-a-bars">
                        {[
                          { l: "Structure", p: 25, c: "bg-red-400" },
                          { l: "Expérience", p: 40, c: "bg-orange-400" },
                          { l: "Compétences", p: 30, c: "bg-red-400" },
                          { l: "Impact", p: 20, c: "bg-red-500" },
                          { l: "ATS", p: 45, c: "bg-orange-400" },
                        ].map((b) => (
                          <div key={b.l} className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-400 w-16 text-right">{b.l}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div className={`anim-a-bar h-full rounded-full ${b.c}`} style={{ ["--bw" as string]: `${b.p}%` }} />
                            </div>
                            <span className="text-[9px] font-bold text-red-500 w-7">{b.p}%</span>
                          </div>
                        ))}
                      </div>
                      <span className="mt-3 rounded-full bg-red-50 border border-red-200/60 px-3 py-1 text-[10px] font-semibold text-red-500 anim-a-badge flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> CV non optimisé
                      </span>
                    </div>
                    {/* Phase 4: Magic Seora fix */}
                    <div className="anim-phase anim-a-phase4 absolute inset-0 flex flex-col items-center justify-center p-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 anim-a-magic-glow">
                          <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <div className="absolute -inset-3 rounded-3xl border-2 border-indigo-300/40 anim-a-magic-spin" style={{ borderStyle: "dashed" }} />
                      </div>
                      <p className="mt-4 text-sm font-bold text-gray-900">Seora optimise ton CV...</p>
                      <p className="text-[11px] text-gray-400 mt-1">Réécriture et corrections en cours</p>
                      <div className="mt-5 w-full max-w-[220px] space-y-2.5">
                        {[
                          { t: "Structure réorganisée", d: 1 },
                          { t: "Mots-clés ATS ajoutés", d: 2 },
                          { t: "Impact quantifié", d: 3 },
                          { t: "Compétences enrichies", d: 4 },
                        ].map((item) => (
                          <div key={item.t} className={`flex items-center gap-2 anim-a-magic-line anim-a-magic-line-${item.d}`}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="text-[10px] text-gray-600">{item.t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Phase 5: Good Score (green) */}
                    <div className="anim-phase anim-a-phase5 absolute inset-0 flex flex-col items-center justify-center p-6">
                      <div className="anim-a-score-pop">
                        <svg width="120" height="120" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                          <circle cx="60" cy="60" r="50" fill="none" stroke="url(#sg2)" strokeWidth="8"
                            strokeDasharray="314" className="anim-a-ring"
                            strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
                          <defs><linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#059669" /><stop offset="100%" stopColor="#10B981" /></linearGradient></defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-extrabold text-emerald-600">92</span>
                          <span className="text-[10px] text-gray-400 -mt-0.5">/100</span>
                        </div>
                      </div>
                      <div className="mt-5 w-full max-w-[220px] space-y-2 anim-a-bars">
                        {[
                          { l: "Structure", p: 95, c: "bg-emerald-500" },
                          { l: "Expérience", p: 88, c: "bg-emerald-500" },
                          { l: "Compétences", p: 90, c: "bg-emerald-500" },
                          { l: "Impact", p: 85, c: "bg-emerald-400" },
                          { l: "ATS", p: 96, c: "bg-emerald-600" },
                        ].map((b) => (
                          <div key={b.l} className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-400 w-16 text-right">{b.l}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div className={`anim-a-bar h-full rounded-full ${b.c}`} style={{ ["--bw" as string]: `${b.p}%` }} />
                            </div>
                            <span className="text-[9px] font-bold text-emerald-600 w-7">{b.p}%</span>
                          </div>
                        ))}
                      </div>
                      <span className="mt-3 rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1 text-[10px] font-semibold text-emerald-600 anim-a-badge flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Prêt à envoyer
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Demo 2: Lettre de motivation ─── */}
              {activeDemo === 2 && (
                <div className="glass-card rounded-3xl overflow-hidden animate-fade-up" style={{ animationDuration: "0.3s" }}>
                  <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-200/60">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                      <PenTool className="h-4.5 w-4.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Lettre de motivation</p>
                      <p className="text-[11px] text-gray-400">Générée par l&apos;IA, adaptée à l&apos;entreprise</p>
                    </div>
                  </div>
                  <div className="relative h-[380px] overflow-hidden">
                    {/* Phase 1: Choix du secteur */}
                    <div className="anim-phase anim-c-phase1 absolute inset-0 flex flex-col items-center justify-center p-6">
                      <p className="text-[10px] font-semibold text-gray-600 mb-3">Choisis ton secteur</p>
                      <div className="w-full max-w-xs space-y-2">
                        {[
                          { label: "Marketing & Communication", icon: TrendingUp },
                          { label: "Tech & Développement", icon: Zap },
                          { label: "Finance & Audit", icon: Briefcase },
                        ].map((item, i) => (
                          <div key={i} className={`anim-c-select anim-c-select-${i+1} rounded-xl border p-3 flex items-center gap-3 ${i === 0 ? "border-indigo-300 bg-indigo-50/50 shadow-sm" : "border-gray-200 bg-white"}`}>
                            <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${i === 0 ? "bg-indigo-100" : "bg-gray-100"}`}>
                              <item.icon className={`h-3.5 w-3.5 ${i === 0 ? "text-indigo-600" : "text-gray-400"}`} />
                            </div>
                            <span className={`text-xs font-medium ${i === 0 ? "text-indigo-700" : "text-gray-500"}`}>{item.label}</span>
                            {i === 0 && <CheckCircle2 className="h-4 w-4 text-indigo-500 ml-auto" />}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Phase 2: Saisie entreprise */}
                    <div className="anim-phase anim-c-phase2 absolute inset-0 flex flex-col items-center justify-center p-6">
                      <div className="w-full max-w-xs space-y-4">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Secteur</p>
                          <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 px-3 py-2 flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="text-xs text-indigo-700 font-medium">Marketing & Communication</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Entreprise</p>
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 flex items-center">
                            <span className="text-xs text-gray-800 font-medium anim-c-typing-text">L&apos;Oréal Paris</span>
                            <span className="anim-c-cursor text-indigo-500 text-xs ml-0.5 font-light">|</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Poste visé</p>
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 flex items-center">
                            <span className="text-xs text-gray-800 font-medium anim-c-typing-text" style={{ animationDelay: "0.8s" }}>Stage Marketing Digital</span>
                            <span className="anim-c-cursor text-indigo-500 text-xs ml-0.5 font-light">|</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Phase 3: Génération */}
                    <div className="anim-phase anim-c-phase3 absolute inset-0 flex flex-col items-center justify-center p-6">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 anim-a-magic-glow">
                          <PenTool className="h-7 w-7 text-white" />
                        </div>
                        <div className="absolute -inset-3 rounded-3xl border-2 border-blue-300/40 anim-a-magic-spin" style={{ borderStyle: "dashed" }} />
                      </div>
                      <p className="mt-4 text-sm font-bold text-gray-900">Rédaction en cours...</p>
                      <p className="text-[11px] text-gray-400 mt-1">L&apos;IA adapte ta lettre pour L&apos;Oréal</p>
                      <div className="mt-5 w-full max-w-[220px] space-y-2.5">
                        {[
                          { t: "Analyse de l'offre", d: 1 },
                          { t: "Adaptation au secteur", d: 2 },
                          { t: "Mots-clés intégrés", d: 3 },
                          { t: "Ton personnalisé", d: 4 },
                        ].map((item) => (
                          <div key={item.t} className={`flex items-center gap-2 anim-a-magic-line anim-a-magic-line-${item.d}`}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="text-[10px] text-gray-600">{item.t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Phase 4: Lettre générée */}
                    <div className="anim-phase anim-c-phase4 absolute inset-0 flex flex-col p-5 overflow-hidden">
                      <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-blue-500 font-semibold">L&apos;Oréal Paris — Marketing Digital</p>
                        </div>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[8px] font-bold text-blue-600">Personnalisée</span>
                      </div>
                      <div className="rounded-xl bg-white border border-gray-200/80 p-4 shadow-sm space-y-2 flex-1">
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider">Objet</p>
                        <p className="text-xs text-indigo-600 font-semibold anim-c-line anim-c-line-1">Candidature — Stage Marketing Digital</p>
                        <div className="border-t border-gray-100 pt-2 space-y-2">
                          <p className="text-[11px] text-gray-600 anim-c-line anim-c-line-2">Madame, Monsieur,</p>
                          <p className="text-[11px] text-gray-500 leading-relaxed anim-c-line anim-c-line-3">
                            Passionnée par le marketing digital, je souhaite intégrer L&apos;Oréal Paris pour contribuer à vos campagnes...
                          </p>
                          <p className="text-[11px] text-gray-500 leading-relaxed anim-c-line anim-c-line-4">
                            Mon expérience en stratégie social media m&apos;a permis de générer +45% d&apos;engagement...
                          </p>
                          <p className="text-[11px] text-gray-500 leading-relaxed anim-c-line anim-c-line-5">
                            Je serais ravie d&apos;échanger sur la valeur ajoutée que je pourrais apporter à votre équipe.
                          </p>
                          <p className="text-[11px] text-gray-600 anim-c-line anim-c-line-6">Cordialement,</p>
                          <p className="text-[11px] text-indigo-600 font-semibold anim-c-line anim-c-line-7">Marie Dupont</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center mt-2 anim-c-line anim-c-line-8">
                        <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1 text-[10px] font-semibold text-emerald-600 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3" /> Prête à envoyer
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* CTA under demos */}
            <div className="mt-10 text-center">
              <Link href="/app" className="inline-flex items-center gap-2 brand-gradient animate-cta-pulse rounded-2xl px-8 py-4 text-sm font-bold text-white hover:scale-[1.03] transition-transform">
                Essayer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-xs text-gray-400">5 tokens offerts • Sans carte bancaire • Résultat en 30s</p>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/*  SEORA EST FAIT POUR TOI               */}
        {/* ══════════════════════════════════════ */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl mb-3 text-center">
              Seora s&apos;adapte à <span className="brand-gradient-text">ton profil</span>
            </h2>
            <p className="text-sm text-gray-500 text-center mb-10 max-w-md mx-auto">
              Que tu cherches un stage, un premier emploi ou une reconversion, les outils s&apos;adaptent.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
              {/* Left — Clickable categories */}
              <div className="md:col-span-2 space-y-3">
                {[
                  { title: "Étudiants", icon: "🎓", desc: "Stage, alternance, lettres de motivation adaptées à chaque offre" },
                  { title: "Jeunes diplômés", icon: "🚀", desc: "Premier emploi, CV optimisé, emails de relance professionnels" },
                  { title: "En reconversion", icon: "🔄", desc: "Reformulation du parcours, mise en valeur des compétences transférables" },
                ].map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveAudience(i)}
                    className={`w-full text-left rounded-xl p-4 transition-all duration-200 ${
                      activeAudience === i
                        ? "bg-white shadow-md shadow-indigo-500/10 border-l-[3px] border-indigo-500 pl-[13px]"
                        : "bg-white/30 hover:bg-white/60 border-l-[3px] border-transparent pl-[13px]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{cat.icon}</span>
                      <div>
                        <h3 className={`text-sm font-bold ${activeAudience === i ? "text-gray-900" : "text-gray-600"}`}>{cat.title}</h3>
                        {activeAudience === i && (
                          <p className="text-xs text-gray-400 mt-0.5">{cat.desc}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Right — Matching testimonial */}
              <div className="md:col-span-3">
                {[
                  {
                    name: "Léa M.",
                    role: "L3 Droit — Paris",
                    avatar: "/logos/avatar-lea.jpg",
                    quote: "Je perdais un temps fou sur mes lettres de motivation. Avec Seora, je les génère en 30 secondes et elles sont personnalisées pour chaque offre. J'ai décroché mon stage au tribunal en 2 semaines.",
                  },
                  {
                    name: "Hugo P.",
                    role: "Diplômé école de commerce",
                    avatar: "/logos/avatar-hugo.jpg",
                    quote: "Après mon diplôme, j'envoyais des CV partout sans retour. Seora a retravaillé mon CV et mes emails. Résultat : 5 entretiens en 10 jours, et une offre signée.",
                  },
                  {
                    name: "Sophie R.",
                    role: "Ex-enseignante → Marketing",
                    avatar: "/logos/avatar-sophie.jpg",
                    quote: "Changer de voie, c'est dur quand ton CV ne parle pas le bon langage. Seora a reformulé toutes mes expériences pour le privé. Les recruteurs ont enfin compris mon profil.",
                  },
                ].map((testimonial, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/40 p-7 h-full flex flex-col justify-center ${
                      activeAudience === i ? "block" : "hidden"
                    }`}
                  >
                    <div className="flex items-center gap-0.5 mb-4">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className="h-3.5 w-3.5 fill-indigo-500 text-indigo-500" />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 italic leading-relaxed mb-5">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <img src={testimonial.avatar} alt={testimonial.name} className="h-10 w-10 rounded-full object-cover shadow-sm" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{testimonial.name}</p>
                        <p className="text-xs text-gray-400">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/*  8. TÉMOIGNAGES — Chiffres + quotes    */}
        {/* ══════════════════════════════════════ */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl mb-3">
                Ce qu&apos;en pensent <span className="brand-gradient-text">nos utilisateurs.</span>
              </h2>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-10">
              {[
                { value: "12 847+", label: "utilisateurs" },
                { value: "45 000+", label: "CV analysés" },
                { value: "×2.4", label: "score CV moyen" },
                { value: "3×", label: "plus de réponses" },
              ].map((stat, i) => (
                <div key={i} className="glass-card rounded-2xl p-4 text-center">
                  <p className="text-xl font-extrabold text-gray-900 sm:text-2xl">{stat.value}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Testimonials */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {[
                {
                  name: "Inès D.",
                  role: "L3 Commerce — Université de Lyon",
                  avatar: "/logos/avatar-ines.jpg",
                  quote: "35 candidatures sans réponse. Après Seora, 4 entretiens en 3 semaines. J'ai signé mon alternance chez Decathlon.",
                },
                {
                  name: "Thomas L.",
                  role: "M1 Marketing Digital — Dauphine",
                  avatar: "/logos/avatar-thomas.jpg",
                  quote: "Mon score CV est passé de 38 à 91. Les recruteurs me rappellent maintenant. Stage de M1 trouvé en 12 jours.",
                },
                {
                  name: "Chloé M.",
                  role: "M2 Communication — Sciences Po",
                  avatar: "/logos/avatar-chloe.jpg",
                  quote: "Je passais 2h par lettre de motivation. Seora les génère en 20 secondes et elles sont meilleures. J'aurais aimé avoir ça dès ma L2.",
                },
              ].map((item, i) => (
                <div key={i}>
                  <div className="glass-card rounded-3xl p-6 h-full">
                    <div className="flex items-center gap-1 mb-4">
                      {[1,2,3,4,5].map(j => <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-5">&ldquo;{item.quote}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <img src={item.avatar} alt={item.name} className="h-10 w-10 rounded-full object-cover shadow-sm" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/*  BLOC CTA — Accès complet              */}
        {/* ══════════════════════════════════════ */}
        <section className="py-16 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-purple-50/30 to-transparent" />
          {/* Floating icons — hidden on mobile */}
          <div className="absolute inset-0 pointer-events-none hidden md:block">
            <div className="absolute top-[15%] left-[8%] h-14 w-14 rounded-2xl bg-white shadow-lg shadow-gray-200/50 flex items-center justify-center animate-float-slow">
              <BarChart3 className="h-7 w-7 text-indigo-500" />
            </div>
            <div className="absolute top-[8%] right-[12%] h-14 w-14 rounded-2xl bg-white shadow-lg shadow-gray-200/50 flex items-center justify-center animate-float-medium">
              <Bot className="h-7 w-7 text-purple-500" />
            </div>
            <div className="absolute bottom-[20%] left-[10%] h-14 w-14 rounded-2xl bg-white shadow-lg shadow-gray-200/50 flex items-center justify-center animate-float-reverse">
              <PenTool className="h-7 w-7 text-blue-500" />
            </div>
            <div className="absolute top-[45%] right-[6%] h-14 w-14 rounded-2xl bg-white shadow-lg shadow-gray-200/50 flex items-center justify-center animate-float-slow">
              <Shield className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="absolute bottom-[12%] right-[18%] h-14 w-14 rounded-2xl bg-white shadow-lg shadow-gray-200/50 flex items-center justify-center animate-float-medium">
              <Sparkles className="h-7 w-7 text-amber-500" />
            </div>
            <div className="absolute top-[55%] left-[4%] h-12 w-12 rounded-2xl bg-white shadow-lg shadow-gray-200/50 flex items-center justify-center animate-float-medium">
              <Search className="h-6 w-6 text-orange-500" />
            </div>
          </div>
          <div className="relative mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">
              Tous les outils. <span className="brand-gradient-text">Un seul accès.</span>
            </h2>
            <p className="text-base text-gray-500 mb-8 max-w-lg mx-auto leading-relaxed">
              Analyse de CV, lettre de motivation, humanizer IA, détection de plagiat, email pro — tout est inclus avec tes tokens. Pas d&apos;abonnement.
            </p>
            <Link href="/app" className="inline-flex items-center gap-2 brand-gradient animate-cta-pulse rounded-2xl px-8 py-4 text-sm font-bold text-white hover:scale-[1.03] transition-transform shadow-lg shadow-indigo-500/25">
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-xs text-gray-400">5 tokens offerts • Sans carte bancaire</p>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/*  10. FAQ                               */}
        {/* ══════════════════════════════════════ */}
        <section id="faq" className="py-12 sm:py-16">
          <div className="mx-auto max-w-2xl px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl mb-3">
                Questions fréquentes
              </h2>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: "L'analyse de CV est vraiment gratuite ?",
                  a: "Oui, totalement. Tu peux analyser ton CV autant de fois que tu veux, sans créer de compte payant. C'est notre manière de te montrer ce que l'IA peut faire avant que tu dépenses un centime.",
                },
                {
                  q: "C'est quoi exactement un token ?",
                  a: "1 token = 1 utilisation d'un outil. Générer une lettre de motivation coûte 1 token. Réécrire ton CV pour une offre coûte 1 token. Tu reçois 5 tokens gratuits à l'inscription pour tester.",
                },
                {
                  q: "Les textes générés sont détectables comme IA ?",
                  a: "On a un outil dédié pour ça : l'Humanizer. Il reformule le texte pour qu'il passe les détecteurs d'IA. Tu peux aussi vérifier le score d'originalité avec le détecteur de plagiat intégré.",
                },
                {
                  q: "Mes données sont en sécurité ?",
                  a: "Tes documents sont chiffrés et stockés de manière sécurisée. On est conformes RGPD et on ne partage jamais tes données. Tu peux tout supprimer depuis ton dashboard.",
                },
                {
                  q: "C'est vraiment utile pour un étudiant ?",
                  a: "Seora a été conçu spécifiquement pour les étudiants et jeunes diplômés. Stage, alternance, premier emploi — la plateforme t'accompagne du premier brouillon de CV jusqu'à l'email de relance après l'entretien.",
                },
              ].map((item, i) => (
                <div key={i} className="glass-card rounded-2xl overflow-hidden" style={{ transitionDelay: `${i * 0.05}s` }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-gray-900 pr-4">{item.q}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="px-5 pb-4">
                      <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/*  11. CTA FINAL                         */}
        {/* ══════════════════════════════════════ */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl px-6">
            <div className="rounded-3xl brand-gradient p-10 sm:p-14 text-center relative overflow-hidden">
              {/* Floating glass orbs */}
              <div className="absolute top-6 left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl animate-float-slow" />
              <div className="absolute bottom-6 right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-float-reverse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-60 w-60 rounded-full bg-white/5 blur-3xl animate-pulse-glow" />

              <div className="relative">
                <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                  Ton prochain entretien commence ici.
                </h2>
                <p className="mt-3 text-sm text-white/80 max-w-md mx-auto">
                  Analyse ton CV maintenant, découvre ce que les recruteurs voient vraiment, et corrige tout avant ta prochaine candidature.
                </p>

                <Link
                  href="/app"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-bold text-indigo-700 shadow-xl glow-white hover:scale-[1.03] transition-all"
                >
                  Analyser mon CV gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <p className="mt-4 flex items-center justify-center gap-3 text-xs text-white/60">
                  <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> 5 tokens offerts</span>
                  <span>•</span>
                  <span>8 outils IA</span>
                  <span>•</span>
                  <span>Sans carte bancaire</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/*  12. FOOTER                            */}
        {/* ══════════════════════════════════════ */}
        <footer className="border-t border-white/40 py-8">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <img src="/logos/seora-icon.png" alt="Seora" className="h-6 w-6 rounded-md" draggable={false} />
              <span className="text-sm font-bold text-gray-900">Seora</span>
              <span className="text-xs text-gray-400">© 2026</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">CGU</a>
              <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Confidentialité</a>
              <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Contact</a>
            </div>
          </div>
        </footer>

      </div>{/* end z-10 wrapper */}

      {/* ══════════════════════════════════════ */}
      {/*  AUTH MODAL (OTP)                      */}
      {/* ══════════════════════════════════════ */}
      {showAuthModal && !session && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
          <div className="relative w-full max-w-md animate-scale-in glass-strong rounded-3xl p-8 shadow-2xl">
            <button onClick={() => setShowAuthModal(false)} className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100/50 transition-colors">
              <X className="h-4 w-4" />
            </button>
            <OTPAuthForm onSuccess={() => { setShowAuthModal(false); window.location.reload(); }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════ OTP AUTH FORM ═══════ */
function OTPAuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      if (data.code) setDevCode(data.code);
      setStep("code");
      toast.success("Code envoyé à " + email);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch { toast.error("Erreur réseau"); } finally { setLoading(false); }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (value && index === 5 && newCode.every(c => c)) verifyCode(newCode.join(""));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const verifyCode = async (fullCode: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: fullCode }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Code invalide"); setCode(["", "", "", "", "", ""]); inputRefs.current[0]?.focus(); return; }
      const signInRes = await signIn("credentials", { email, name: data.user?.name || email.split("@")[0], redirect: false });
      if (signInRes?.ok) { toast.success("Bienvenue ! 5 tokens offerts"); onSuccess(); } else { toast.error("Erreur"); }
    } catch { toast.error("Erreur réseau"); } finally { setLoading(false); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { e.preventDefault(); setCode(pasted.split("")); inputRefs.current[5]?.focus(); verifyCode(pasted); }
  };

  return (
    <div>
      {step === "email" ? (
        <>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
              <Mail className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">Recevez votre code</h3>
            <p className="mt-2 text-sm text-gray-500">Entrez votre email pour recevoir un code de vérification.</p>
          </div>
          <form onSubmit={handleSendCode} className="mt-5 space-y-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" required autoFocus className="w-full rounded-xl border border-gray-200/60 bg-white/60 px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 backdrop-blur-sm" />
            <button type="submit" disabled={loading || !email} className="flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 shadow-lg shadow-indigo-500/25">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? "Envoi..." : "Recevoir mon code"}
            </button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="flex items-center gap-1 text-[11px] text-gray-400"><Coins className="h-3 w-3" /> 5 tokens offerts</div>
            <span className="text-gray-300">•</span>
            <span className="text-[11px] text-gray-400">Sans carte bancaire</span>
          </div>
        </>
      ) : (
        <>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <Shield className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">Vérification</h3>
            <p className="mt-2 text-sm text-gray-500">Code envoyé à <strong>{email}</strong></p>
            {devCode && <p className="mt-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700 inline-block">Dev: <strong>{devCode}</strong></p>}
          </div>
          <div className="mt-6 flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input key={i} ref={el => { inputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleCodeChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)}
                className={`h-12 w-12 rounded-xl border text-center text-lg font-bold outline-none transition-all backdrop-blur-sm ${digit ? "border-indigo-300 bg-indigo-50/80 text-indigo-700" : "border-gray-200/60 bg-white/60"} focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`}
              />
            ))}
          </div>
          {loading && <div className="mt-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-indigo-600" /></div>}
          <div className="mt-5 flex items-center justify-between">
            <button onClick={() => { setStep("email"); setCode(["", "", "", "", "", ""]); }} className="text-xs text-gray-500 hover:text-gray-700">← Changer d&apos;email</button>
            <button onClick={() => handleSendCode({ preventDefault: () => {} } as React.FormEvent)} className="text-xs text-indigo-600 font-medium hover:underline">Renvoyer le code</button>
          </div>
        </>
      )}
    </div>
  );
}
