"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { useAuthModal } from "@/components/auth/auth-context";
import { ResultPreviewPopup } from "@/components/landing/result-preview-popup";
import { InlinePricing } from "@/components/landing/inline-pricing";
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
  Search,
  Plus,
  Camera,
  Bot,
} from "lucide-react";


/* ═══════════════════════════════════════════════ */
/*          SEORA — LANDING PAGE                  */
/* ═══════════════════════════════════════════════ */
export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const [dragOver, setDragOver] = useState(false);
  const [landingCompany, setLandingCompany] = useState("");
  const [landingJob, setLandingJob] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);
  const [activeAudience, setActiveAudience] = useState(0);
  const [showResultPreview, setShowResultPreview] = useState(false);
  const [resultPreviewType, setResultPreviewType] = useState<"cv" | "letter" | "humanizer">("cv");
  const [showInlinePricing, setShowInlinePricing] = useState(false);
  const [autoCycleDemo, setAutoCycleDemo] = useState(true);
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [liveCount, setLiveCount] = useState(847);
  const [activeTab, setActiveTab] = useState<"cv" | "memoire" | "letter" | "create" | "photo">("cv");

  const topCompanies = [
    "L'Oréal", "LVMH", "TotalEnergies", "Sanofi", "BNP Paribas", "Airbus", "Danone", "Société Générale",
    "Capgemini", "Schneider Electric", "Michelin", "Saint-Gobain", "Renault", "Pernod Ricard", "Hermès",
    "Thales", "Dassault Systèmes", "Orange", "Carrefour", "Crédit Agricole", "AXA", "Engie", "Bouygues",
    "Publicis", "Veolia", "Decathlon", "Ubisoft", "Criteo", "OVHcloud", "Back Market", "Alan", "Doctolib",
    "Swile", "Qonto", "PayFit", "Ledger", "ManoMano", "Blablacar", "Deezer", "Vestiaire Collective",
    "Leroy Merlin", "Amazon France", "Google France", "McKinsey", "BCG", "Bain & Company", "Deloitte",
    "EY", "PwC", "KPMG", "Accenture", "Alstom", "Valeo", "Safran", "Stellantis", "EDF", "SNCF",
    "La Poste", "Auchan", "Leclerc", "Chanel", "Dior", "Cartier", "Kering", "Nike France", "Apple France",
  ];

  const handleCompanyInput = (value: string) => {
    setLandingCompany(value);
    if (value.length > 0) {
      const filtered = topCompanies.filter((c) =>
        c.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setCompanySuggestions(filtered);
      setShowCompanySuggestions(filtered.length > 0);
    } else {
      setShowCompanySuggestions(false);
    }
  };



  // Auto-cycle demo tabs
  useEffect(() => {
    if (!autoCycleDemo) return;
    const durations: Record<number, number> = { 0: 12000, 2: 10000, 3: 14000 };
    const order = [0, 2];
    const currentDuration = durations[activeDemo] || 12000;
    const timer = setTimeout(() => {
      const currentIndex = order.indexOf(activeDemo);
      const nextIndex = (currentIndex + 1) % order.length;
      setActiveDemo(order[nextIndex]);
    }, currentDuration);
    return () => clearTimeout(timer);
  }, [activeDemo, autoCycleDemo]);

  useEffect(() => {
    if (session) {
      fetch("/api/tokens").then(r => r.json()).then(d => setTokens(d.tokens)).catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(prev => prev + 1);
    }, Math.random() * 4000 + 4000);
    return () => clearInterval(interval);
  }, []);


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
            <div className="flex h-14 items-center justify-between rounded-2xl glass-strong px-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <img src="/logos/seora-icon.png" alt="Seora" className="h-10 w-10 rounded-xl" draggable={false} />
                <span className="text-lg font-extrabold tracking-tight text-gray-900">Seora</span>
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
                      <div className="rounded-2xl p-3 shadow-2xl shadow-black/10 border border-white/50 w-[520px] grid grid-cols-2 gap-1 bg-white">
                        {[
                          { href: "/app", icon: BarChart3, label: "Analyse CV", desc: "Score sur 6 critères", color: "text-indigo-600 bg-indigo-50" },
                          { href: "/cover-letter", icon: PenTool, label: "Lettre de motivation", desc: "Adaptée à l'offre", color: "text-blue-600 bg-blue-50" },
                          { href: "/job-match", icon: Briefcase, label: "Job Matching", desc: "CV sur-mesure", color: "text-emerald-600 bg-emerald-50" },
                          { href: "/cv-editor", icon: Plus, label: "Créer ton CV", desc: "Templates pro", color: "text-purple-600 bg-purple-50" },
                          { href: "/compteur-mots", icon: Zap, label: "Compteur de mots", desc: "Outil rapide", color: "text-amber-600 bg-amber-50" },
                        ].map((tool) => (
                          <Link
                            key={tool.label}
                            href={tool.href}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-white/60 transition-colors group"
                          >
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tool.color} shrink-0`}>
                              <tool.icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-gray-900 truncate">{tool.label}</p>
                              <p className="text-[10px] text-gray-400 truncate">{tool.desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

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
                      Mon compte
                    </Link>
                  </>
                ) : (
                  <button
                    onClick={() => document.getElementById('hero-upload')?.scrollIntoView({ behavior: 'smooth' })}
                    className="brand-gradient flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                  >
                    Commencer
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════ */}
        {/*  2. HERO — with upload zone merged     */}
        {/* ══════════════════════════════════════ */}
        <section className="relative pt-10 pb-6 sm:pt-20 sm:pb-10">
          <div className="relative mx-auto max-w-2xl px-5 sm:px-6 text-center">
            {/* Badge — live counter */}
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full glass-strong px-4 py-1.5 text-xs font-semibold text-indigo-700 mb-6 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-600 font-bold">{liveCount.toLocaleString()}</span> CV analysés aujourd&apos;hui
            </div>

            <h1 className="animate-fade-up delay-100 text-[1.7rem] font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl leading-[1.12] sm:leading-[1.08]" style={{ animationFillMode: "both" }}>
              Le seul outil qui analyse, réécrit{" "}
              <span className="brand-gradient-text">et adapte ton CV à chaque offre.</span>
            </h1>

            <p className="animate-fade-up delay-200 mx-auto mt-4 max-w-lg text-[0.9rem] text-gray-500 leading-relaxed sm:text-lg px-1 sm:px-0" style={{ animationFillMode: "both" }}>
              Les étudiants qui utilisent Seora décrochent <strong className="text-gray-700">3× plus d&apos;entretiens.</strong>
            </p>

            <div className="animate-fade-up delay-300 mt-6 flex flex-col items-center gap-3" style={{ animationFillMode: "both" }}>
              <button
                onClick={() => document.getElementById('hero-upload')?.scrollIntoView({ behavior: 'smooth' })}
                className="brand-gradient animate-cta-pulse flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white hover:scale-[1.03] transition-transform"
              >
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-gray-400">Résultat en 30 secondes.</p>
            </div>

            {/* Social proof */}
            <div className="animate-fade-up delay-500 mt-6 flex items-center justify-center gap-2" style={{ animationFillMode: "both" }}>
              <img src="/logos/customers.webp" alt="Utilisateurs" className="h-8 sm:h-10" draggable={false} />
              <p className="text-xs sm:text-sm text-gray-500">
                <strong className="text-gray-900 font-bold text-sm sm:text-base">4.9/5</strong> · utilisé par <strong className="text-gray-800 font-semibold">1 783</strong> étudiants <img src="/logos/blue-badge.svg" alt="Vérifié" className="h-4 w-4 inline-block ml-0.5 -mt-0.5" />
              </p>
            </div>
          </div>

          {/* ═══ AUTONOMOUS FEATURE CARDS ═══ */}
          <div id="hero-upload" className="mx-auto max-w-4xl px-4 sm:px-6 mt-10 sm:mt-14">
            <div className="text-center mb-6 sm:mb-8">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-indigo-500 mb-1">Que veux-tu faire ?</p>
            </div>

            {/* ═══ TAB BAR + UNIFIED ACTION CARD ═══ */}
            {(() => {
              const TABS = [
                { id: "cv" as const, label: "Analyse CV", shortLabel: "CV", icon: BarChart3, tokens: "1 token", tokenColor: "bg-indigo-100 text-indigo-600" },
                { id: "memoire" as const, label: "Mémoire / DPP", shortLabel: "Mémoire", icon: Bot, tokens: "3 tokens", tokenColor: "bg-orange-100 text-orange-600" },
                { id: "letter" as const, label: "Lettre motiv.", shortLabel: "Lettre", icon: PenTool, tokens: "3 tokens", tokenColor: "bg-blue-100 text-blue-600" },
                { id: "create" as const, label: "Créer CV", shortLabel: "Créer", icon: Plus, tokens: "Gratuit", tokenColor: "bg-emerald-100 text-emerald-600" },
                { id: "photo" as const, label: "Photo Pro", shortLabel: "Photo", icon: Camera, tokens: "1 token", tokenColor: "bg-pink-100 text-pink-600" },
              ];
              const active = TABS.find(t => t.id === activeTab) ?? TABS[0];
              const jobChars = landingJob.length;
              const MAX_CHARS = 10000;

              return (
                <div>
                  {/* Segmented tab bar — ONE line, all 5 tabs visible without scroll */}
                  <div className="mb-4 sm:mb-5">
                    <div className="w-full flex items-stretch gap-0.5 sm:gap-1 rounded-2xl bg-gray-100 p-1 shadow-inner">
                      {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`group flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl px-1 py-2 sm:px-3 sm:py-2.5 text-[10px] sm:text-sm font-semibold transition-all ${
                              isActive
                                ? "bg-white text-gray-900 shadow-md shadow-gray-900/10"
                                : "text-gray-500 hover:text-gray-900"
                            }`}
                          >
                            <Icon className={`h-4 w-4 sm:h-4 sm:w-4 shrink-0 ${isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-700"}`} />
                            <span className="truncate max-w-full">
                              <span className="sm:hidden">{tab.shortLabel}</span>
                              <span className="hidden sm:inline">{tab.label}</span>
                            </span>
                            <span className={`hidden sm:inline rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                              isActive ? tab.tokenColor : "bg-gray-200 text-gray-500"
                            }`}>{tab.tokens}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-center text-[10px] sm:text-[11px] text-gray-400 mt-2">
                      Clique sur un onglet pour changer d&apos;outil · <span className={`font-semibold px-1.5 py-0.5 rounded-full ${active.tokenColor}`}>{active.tokens}</span>
                    </p>
                  </div>

                  {/* === Analyse CV === */}
                  {activeTab === "cv" && (
                    <div
                      className={`relative rounded-3xl bg-white border-2 shadow-2xl shadow-indigo-500/[0.06] overflow-hidden transition-[border-color] duration-300 ${
                        dragOver ? "border-indigo-500" : "border-indigo-200/60 hover:border-indigo-300"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const file = e.dataTransfer.files[0];
                        if (file && (file.type === "application/pdf" || file.type.startsWith("image/") || /\.(pdf|docx|jpe?g|png|heic|webp)$/i.test(file.name))) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            sessionStorage.setItem("seora_cv_file", reader.result as string);
                            sessionStorage.setItem("seora_cv_filename", file.name);
                            if (session) { router.push("/app"); } else { setResultPreviewType("cv"); setShowResultPreview(true); }
                          };
                          reader.readAsDataURL(file);
                        } else { toast.error("Format accepté : PDF, DOCX ou Photo"); }
                      }}
                    >
                      <input ref={fileInputRef} type="file" accept=".pdf,.docx,image/*" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              sessionStorage.setItem("seora_cv_file", reader.result as string);
                              sessionStorage.setItem("seora_cv_filename", file.name);
                              if (session) { router.push("/app"); } else { setResultPreviewType("cv"); setShowResultPreview(true); }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="p-5 sm:p-8">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                            <BarChart3 className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">Analyse ton CV</h3>
                            <p className="text-xs text-gray-400">Score, points forts, axes d&apos;amélioration</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${active.tokenColor}`}>{active.tokens}</span>
                        </div>
                        <div
                          className={`border-2 border-dashed rounded-2xl py-8 sm:py-14 px-4 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 ${
                            dragOver ? "border-indigo-500 bg-indigo-50/50" : "border-gray-200 hover:border-indigo-400"
                          }`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-3 transition-colors ${dragOver ? "bg-indigo-100" : "bg-gray-100"}`}>
                            <Upload className={`h-6 w-6 ${dragOver ? "text-indigo-600" : "text-gray-400"}`} />
                          </div>
                          <p className="text-sm sm:text-base font-bold text-gray-900 mb-0.5">{dragOver ? "Lâchez votre fichier ici" : "Glissez votre CV ici"}</p>
                          <p className="text-xs text-gray-400 mb-4">PDF, DOCX ou Photo</p>
                          <div className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow-md shadow-indigo-500/25 hover:shadow-lg transition-shadow">
                            Parcourir mes fichiers
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === Mémoire / DPP === */}
                  {activeTab === "memoire" && (
                    <div
                      className="relative rounded-3xl bg-white border-2 border-orange-200/60 shadow-2xl shadow-orange-500/[0.06] overflow-hidden transition-[border-color] duration-300 hover:border-orange-300"
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file && (file.type === "application/pdf" || /\.(pdf|docx?|txt)$/i.test(file.name))) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            sessionStorage.setItem("seora_memoire_file", reader.result as string);
                            sessionStorage.setItem("seora_memoire_filename", file.name);
                            if (session) { router.push("/humanizer"); } else { setResultPreviewType("humanizer"); setShowResultPreview(true); }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    >
                      <input type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" id="memoire-upload-hero"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              sessionStorage.setItem("seora_memoire_file", reader.result as string);
                              sessionStorage.setItem("seora_memoire_filename", file.name);
                              if (session) { router.push("/humanizer"); } else { setResultPreviewType("humanizer"); setShowResultPreview(true); }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="p-5 sm:p-8">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20">
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">Analyse mon mémoire / DPP</h3>
                            <p className="text-xs text-gray-400">Score IA (Compilatio, GPTZero) + humanisation sous 15%</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${active.tokenColor}`}>{active.tokens}</span>
                        </div>
                        <label
                          htmlFor="memoire-upload-hero"
                          className="border-2 border-dashed rounded-2xl py-8 sm:py-14 px-4 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 border-orange-200 hover:border-orange-400"
                        >
                          <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-3">
                            <FileText className="h-6 w-6 text-orange-600" />
                          </div>
                          <p className="text-sm sm:text-base font-bold text-gray-900 mb-0.5">Glissez votre mémoire ou DPP ici</p>
                          <p className="text-xs text-gray-400 mb-4">PDF, DOCX, DOC ou TXT · Confidentiel</p>
                          <div className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 hover:shadow-lg transition-shadow">
                            Analyser mon dossier
                          </div>
                        </label>
                        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-orange-500" /> Score IA en 30s</span>
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-orange-500" /> Humanisation auto</span>
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-orange-500" /> Export PDF/DOCX</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === Lettre de motivation === */}
                  {activeTab === "letter" && (
                    <div className="rounded-3xl bg-white border-2 border-blue-200/60 shadow-2xl shadow-blue-500/[0.06] overflow-hidden transition-[border-color] duration-300 hover:border-blue-300">
                      <div className="p-5 sm:p-8">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                            <PenTool className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">Lettre de motivation</h3>
                            <p className="text-xs text-gray-400">Générée par IA et adaptée à l&apos;offre</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${active.tokenColor}`}>{active.tokens}</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <textarea
                              value={landingJob}
                              onChange={(e) => setLandingJob(e.target.value.slice(0, MAX_CHARS))}
                              placeholder="Collez l'offre d'emploi ou décrivez le poste visé..."
                              rows={4}
                              maxLength={MAX_CHARS}
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none transition-colors"
                            />
                            <div className="flex justify-end mt-1">
                              <span className={`text-[10px] font-medium ${jobChars > MAX_CHARS * 0.9 ? "text-red-500" : "text-gray-400"}`}>
                                {jobChars.toLocaleString("fr-FR")} / {MAX_CHARS.toLocaleString("fr-FR")} caractères
                              </span>
                            </div>
                          </div>
                          <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <input
                              type="text"
                              value={landingCompany}
                              onChange={(e) => handleCompanyInput(e.target.value)}
                              onFocus={() => { if (companySuggestions.length > 0) setShowCompanySuggestions(true); }}
                              onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 200)}
                              placeholder="Entreprise visée..."
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pl-10 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                            />
                            {showCompanySuggestions && companySuggestions.length > 0 && (
                              <div className="absolute z-20 w-full mt-1 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden">
                                {companySuggestions.map((company, i) => (
                                  <button
                                    key={i}
                                    onMouseDown={() => { setLandingCompany(company); setShowCompanySuggestions(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-0"
                                  >
                                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                                      {company.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium">{company}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (!landingCompany.trim() || !landingJob.trim()) { toast.error("Remplis l'entreprise et l'offre"); return; }
                              sessionStorage.setItem("seora_cl_company", landingCompany);
                              sessionStorage.setItem("seora_cl_job", landingJob);
                              if (session) { router.push("/cover-letter"); } else { setResultPreviewType("letter"); setShowResultPreview(true); }
                            }}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:shadow-lg transition-shadow"
                          >
                            <Sparkles className="h-4 w-4" /> Générer ma lettre
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === Créer mon CV === */}
                  {activeTab === "create" && (
                    <div className="rounded-3xl bg-white border-2 border-emerald-200/60 shadow-2xl shadow-emerald-500/[0.06] overflow-hidden transition-[border-color] duration-300 hover:border-emerald-300">
                      <div className="p-5 sm:p-8">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
                            <Plus className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">Créer mon CV</h3>
                            <p className="text-xs text-gray-400">Wizard guidé étape par étape</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${active.tokenColor}`}>{active.tokens}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">6 templates pros</span>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Export PDF</span>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">100% guidé</span>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">10 min</span>
                        </div>
                        <button
                          onClick={() => { if (session) router.push("/cv-editor"); else openAuthModal(); }}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:shadow-lg transition-shadow"
                        >
                          <Sparkles className="h-4 w-4" /> Commencer mon CV
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <p className="text-center text-[11px] text-gray-400 mt-3">
                          Aucun paiement requis — CV téléchargeable en PDF
                        </p>
                      </div>
                    </div>
                  )}

                  {/* === Photo Pro === */}
                  {activeTab === "photo" && (
                    <div
                      className="relative rounded-3xl bg-white border-2 border-pink-200/60 shadow-2xl shadow-pink-500/[0.06] overflow-hidden transition-[border-color] duration-300 hover:border-pink-300"
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file && file.type.startsWith("image/")) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            sessionStorage.setItem("seora_photo_file", reader.result as string);
                            sessionStorage.setItem("seora_photo_filename", file.name);
                            if (session) { router.push("/photo-pro"); } else { openAuthModal(() => { window.location.href = "/photo-pro"; }); }
                          };
                          reader.readAsDataURL(file);
                        } else { toast.error("Format accepté : Photo (JPG, PNG, HEIC, WEBP)"); }
                      }}
                    >
                      <input type="file" accept="image/*" className="hidden" id="photo-upload-hero"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              sessionStorage.setItem("seora_photo_file", reader.result as string);
                              sessionStorage.setItem("seora_photo_filename", file.name);
                              if (session) { router.push("/photo-pro"); } else { openAuthModal(() => { window.location.href = "/photo-pro"; }); }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="p-5 sm:p-8">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-md shadow-pink-500/20">
                            <Camera className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">Photo Pro IA</h3>
                            <p className="text-xs text-gray-400">Selfie → photo professionnelle en 15 secondes</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${active.tokenColor}`}>{active.tokens}</span>
                        </div>
                        <label
                          htmlFor="photo-upload-hero"
                          className="border-2 border-dashed rounded-2xl py-8 sm:py-14 px-4 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 border-pink-200 hover:border-pink-400"
                        >
                          <div className="h-12 w-12 rounded-2xl bg-pink-100 flex items-center justify-center mb-3">
                            <Camera className="h-6 w-6 text-pink-500" />
                          </div>
                          <p className="text-sm sm:text-base font-bold text-gray-900 mb-0.5">Glissez votre selfie ici</p>
                          <p className="text-xs text-gray-400 mb-4">JPG, PNG, HEIC ou WEBP</p>
                          <div className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold shadow-md shadow-pink-500/25 hover:shadow-lg transition-shadow">
                            Transformer en photo pro
                          </div>
                        </label>
                        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-pink-500" /> Fond neutre</span>
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-pink-500" /> Retouche IA</span>
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-pink-500" /> Export HD</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* School logos — moved here from trust bar */}
            <div className="mt-8 sm:mt-10 overflow-hidden">
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
          </div>
        </section>


        {/* ══════════════════════════════════════ */}
        {/*  4. DEMO — 3 separate animated cards   */}
        {/* ══════════════════════════════════════ */}
        <section className="py-10 sm:py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center mb-8">
              {/* Play icon visual */}
              <div className="relative inline-flex items-center justify-center mb-5">
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" style={{ animationDuration: "2s" }} />
                <div className="absolute -inset-3 rounded-full bg-indigo-400/10 blur-md animate-pulse" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full brand-gradient shadow-lg shadow-indigo-500/30">
                  <ChevronDown className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl mb-2">
                Comment ça marche ?
              </h2>
              <p className="text-sm text-gray-400">Regarde la démo en direct — aucune inscription requise</p>
            </div>

            {/* Tab selector */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-8">
              {[
                { icon: BarChart3, label: "Analyse CV", idx: 0 },
                { icon: PenTool, label: "Lettre", idx: 2 },
              ].map((tab) => (
                <button
                  key={tab.idx}
                  onClick={() => { setActiveDemo(tab.idx); setAutoCycleDemo(false); setTimeout(() => setAutoCycleDemo(true), 20000); }}
                  className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2.5 text-xs font-semibold transition-all ${
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
                  {/* Timeline */}
                  <div className="flex items-center justify-center gap-0 px-4 sm:px-6 py-3 border-b border-gray-100">
                    {[
                      { n: 1, label: "Upload", cls: "tl-a-step1" },
                      { n: 2, label: "Analyse", cls: "tl-a-step2" },
                      { n: 3, label: "Score", cls: "tl-a-step3" },
                      { n: 4, label: "Optimisation", cls: "tl-a-step4" },
                      { n: 5, label: "Résultat", cls: "tl-a-step5" },
                    ].map((s, i) => (
                      <div key={s.n} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${s.cls}`}>{s.n}</div>
                          <span className="mt-1 text-[8px] text-gray-400 font-medium">{s.label}</span>
                        </div>
                        {i < 4 && <div className="h-px w-4 sm:w-6 bg-gray-200 mt-[-10px]" />}
                      </div>
                    ))}
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
                  {/* Timeline */}
                  <div className="flex items-center justify-center gap-0 px-4 sm:px-6 py-3 border-b border-gray-100">
                    {[
                      { n: 1, label: "Secteur", cls: "tl-c-step1" },
                      { n: 2, label: "Entreprise", cls: "tl-c-step2" },
                      { n: 3, label: "Génération", cls: "tl-c-step3" },
                      { n: 4, label: "Résultat", cls: "tl-c-step4" },
                    ].map((s, i) => (
                      <div key={s.n} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${s.cls}`}>{s.n}</div>
                          <span className="mt-1 text-[8px] text-gray-400 font-medium">{s.label}</span>
                        </div>
                        {i < 3 && <div className="h-px w-6 sm:w-10 bg-gray-200 mt-[-10px]" />}
                      </div>
                    ))}
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
              <button
                onClick={() => document.getElementById('hero-upload')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 brand-gradient animate-cta-pulse rounded-2xl px-8 py-4 text-sm font-bold text-white hover:scale-[1.03] transition-transform"
              >
                Analyser mon CV
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/*  COMPARISON TABLE — Seora vs ChatGPT   */}
        {/* ══════════════════════════════════════ */}
        <section className="py-10 sm:py-14">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl mb-2 text-center">
              Pourquoi Seora et pas <span className="brand-gradient-text">ChatGPT ?</span>
            </h2>
            <p className="text-sm text-gray-400 text-center mb-8">La vraie différence, en un coup d&apos;œil.</p>

            <div className="glass-card rounded-3xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200/60">
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"></th>
                    <th className="px-3 sm:px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 rounded-full brand-gradient px-3 py-1 text-xs font-bold text-white">Seora</div>
                    </th>
                    <th className="px-3 sm:px-6 py-4 text-center text-xs font-semibold text-gray-500">ChatGPT</th>
                    <th className="px-3 sm:px-6 py-4 text-center text-xs font-semibold text-gray-500 hidden sm:table-cell">Faire seul</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { feature: "Score ATS détaillé", seora: true, gpt: false, solo: false },
                    { feature: "Adapté à chaque offre", seora: true, gpt: "~", solo: false },
                    { feature: "Anti-plagiat intégré", seora: true, gpt: false, solo: false },
                    { feature: "Indétectable par l'IA", seora: true, gpt: false, solo: true },
                    { feature: "Lettre personnalisée", seora: true, gpt: "~", solo: false },
                    { feature: "Temps moyen", seora: "30s", gpt: "10min", solo: "2h+" },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white/30" : ""}>
                      <td className="px-4 sm:px-6 py-3.5 text-sm font-medium text-gray-700">{row.feature}</td>
                      <td className="px-3 sm:px-6 py-3.5 text-center">
                        {row.seora === true ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : <span className="text-sm font-bold text-emerald-600">{row.seora}</span>}
                      </td>
                      <td className="px-3 sm:px-6 py-3.5 text-center">
                        {row.gpt === true ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : row.gpt === false ? <XCircle className="h-5 w-5 text-gray-300 mx-auto" /> : <span className="text-xs text-gray-400">{row.gpt}</span>}
                      </td>
                      <td className="px-3 sm:px-6 py-3.5 text-center hidden sm:table-cell">
                        {row.solo === true ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : row.solo === false ? <XCircle className="h-5 w-5 text-gray-300 mx-auto" /> : <span className="text-xs text-gray-400">{row.solo}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/*  SEORA EST FAIT POUR TOI               */}
        {/* ══════════════════════════════════════ */}
        <section className="py-8 sm:py-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl mb-3 text-center">
              Seora s&apos;adapte à <span className="brand-gradient-text">ton profil</span>
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6 max-w-md mx-auto">
              Que tu cherches un stage, un premier emploi ou une reconversion, les outils s&apos;adaptent.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
              {/* Left — Clickable categories */}
              <div className="md:col-span-2 space-y-3">
                {[
                  { title: "Étudiants", icon: "🎓", desc: "Stage, alternance, lettres de motivation adaptées à chaque offre", tags: ["Lettres sur-mesure", "CV ATS-ready", "Anti-plagiat"] },
                  { title: "Jeunes diplômés", icon: "🚀", desc: "Premier emploi, CV optimisé, emails de relance professionnels", tags: ["Job matching", "Emails pro", "Score CV"] },
                  { title: "En reconversion", icon: "🔄", desc: "Reformulation du parcours, mise en valeur des compétences transférables", tags: ["Reformulation IA", "Compétences transférables", "Lettre adaptée"] },
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
                          <>
                            <p className="text-xs text-gray-400 mt-0.5">{cat.desc}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {cat.tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-semibold text-indigo-600">{tag}</span>
                              ))}
                            </div>
                          </>
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
        <section className="py-8 sm:py-10">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl mb-3">
                Ce qu&apos;en pensent <span className="brand-gradient-text">nos utilisateurs.</span>
              </h2>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
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
        <section className="py-8 sm:py-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-purple-50/30 to-transparent" />
          {/* Floating icons — hidden on mobile */}
          <div className="absolute inset-0 pointer-events-none hidden md:block">
            <div className="absolute top-[15%] left-[8%] h-14 w-14 rounded-2xl bg-white shadow-lg shadow-gray-200/50 flex items-center justify-center animate-float-slow">
              <BarChart3 className="h-7 w-7 text-indigo-500" />
            </div>
            <div className="absolute top-[8%] right-[12%] h-14 w-14 rounded-2xl bg-white shadow-lg shadow-gray-200/50 flex items-center justify-center animate-float-medium">
              <Camera className="h-7 w-7 text-purple-500" />
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
              Prêt à décrocher ton <span className="brand-gradient-text">prochain entretien ?</span>
            </h2>
            <p className="text-base text-gray-500 mb-8 max-w-lg mx-auto leading-relaxed">
              Analyse ton CV en 30 secondes. Rejoins les 12 000+ étudiants qui ont déjà boosté leur candidature.
            </p>
            <button
              onClick={() => document.getElementById('hero-upload')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 brand-gradient animate-cta-pulse rounded-2xl px-8 py-4 text-sm font-bold text-white hover:scale-[1.03] transition-transform shadow-lg shadow-indigo-500/25"
            >
              Commencer maintenant
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/*  10. FAQ                               */}
        {/* ══════════════════════════════════════ */}
        <section id="faq" className="py-12 sm:py-16">
          <div className="mx-auto max-w-2xl px-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl mb-3">
                Questions fréquentes
              </h2>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: "Pourquoi utiliser Seora plutôt que ChatGPT ?",
                  a: "ChatGPT génère du texte générique. Seora analyse ton CV sur 6 critères ATS précis, adapte chaque lettre à l'entreprise visée, et garantit que tes textes passent les détecteurs d'IA. C'est un outil spécialisé, pas un chatbot.",
                },
                {
                  q: "Comment fonctionne le système de tokens ?",
                  a: "1 token = 1 utilisation d'un outil. Analyser un CV, générer une lettre ou humaniser un texte coûte chacun 1 token. Les packs démarrent à 4,99€.",
                },
                {
                  q: "Les textes générés sont détectables comme IA ?",
                  a: "Non. L'IA de Seora génère des textes originaux et personnalisés qui ne sont pas détectables par les outils anti-IA comme GPTZero ou Turnitin.",
                },
                {
                  q: "Est-ce que je peux me faire rembourser ?",
                  a: "Oui, si tu n'es pas satisfait dans les 7 jours suivant ton achat, on te rembourse intégralement. Aucune question posée.",
                },
                {
                  q: "Mes données sont en sécurité ?",
                  a: "Tes documents sont chiffrés et stockés de manière sécurisée. On est conformes RGPD et on ne partage jamais tes données. Tu peux tout supprimer depuis ton dashboard.",
                },
                {
                  q: "C'est vraiment utile pour un étudiant ?",
                  a: "Seora a été conçu spécifiquement pour les étudiants et jeunes diplômés. Stage, alternance, premier emploi — du premier CV jusqu'à l'email de relance après l'entretien.",
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
                  <div className={`overflow-hidden transition-[border-color,box-shadow] duration-300 ${openFaq === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
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
        {/*  FOOTER                                 */}
        {/* ══════════════════════════════════════ */}
        <footer className="bg-gray-950 mt-8 pb-20 md:pb-0">
          <div className="mx-auto max-w-6xl px-6 pt-14 pb-8">
            {/* Top grid */}
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-10 sm:gap-8">
              {/* Brand — wider column */}
              <div className="col-span-2 sm:col-span-4">
                <div className="flex items-center gap-2.5 mb-4">
                  <img src="/logos/seora-icon.png" alt="Seora" className="h-8 w-8 rounded-lg" draggable={false} />
                  <span className="text-lg font-extrabold text-white">Seora</span>
                </div>
                <p className="text-[13px] text-gray-400 leading-relaxed max-w-[280px]">
                  Analyse, corrige et adapte ton CV pour décrocher plus d&apos;entretiens. Conçu pour les étudiants en France.
                </p>
              </div>

              {/* Outils */}
              <div className="sm:col-span-2 sm:col-start-6">
                <h4 className="text-[13px] font-semibold text-white uppercase tracking-wider mb-4">Outils</h4>
                <ul className="space-y-3">
                  {[
                    { label: "Analyse CV", href: "/app" },
                    { label: "Lettre de motivation", href: "/cover-letter" },
                    { label: "Créer ton CV", href: "/cv-editor" },
                    { label: "Job Matching", href: "/job-match" },
                  ].map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-[13px] text-gray-400 hover:text-white transition-colors">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plus */}
              <div className="sm:col-span-2">
                <h4 className="text-[13px] font-semibold text-white uppercase tracking-wider mb-4">Plus</h4>
                <ul className="space-y-3">
                  {[
                    { label: "Compteur de mots", href: "/compteur-mots" },
                    { label: "Parrainage", href: "/referral" },
                  ].map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-[13px] text-gray-400 hover:text-white transition-colors">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Légal */}
              <div className="sm:col-span-2">
                <h4 className="text-[13px] font-semibold text-white uppercase tracking-wider mb-4">Légal</h4>
                <ul className="space-y-3">
                  {[
                    { label: "Conditions générales", href: "/cgu" },
                    { label: "Confidentialité", href: "/confidentialite" },
                    { label: "Mentions légales", href: "/mentions-legales" },
                  ].map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-[13px] text-gray-400 hover:text-white transition-colors">{link.label}</Link>
                    </li>
                  ))}
                  <li>
                    <a href="mailto:contact@seora.fr" className="text-[13px] text-gray-400 hover:text-white transition-colors">Contact</a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-500">© 2026 Seora. Tous droits réservés.</p>
              <p className="text-xs text-gray-600">Fait en France 🇫🇷</p>
            </div>
          </div>
        </footer>


      </div>{/* end z-10 wrapper */}

      {/* Result Preview Popup */}
      <ResultPreviewPopup
        isOpen={showResultPreview}
        onClose={() => setShowResultPreview(false)}
        type={resultPreviewType}
        onUnlock={() => {
          setShowResultPreview(false);
          if (session) {
            const routes = { cv: "/app", letter: "/cover-letter", humanizer: "/humanizer" };
            router.push(routes[resultPreviewType]);
          } else {
            setShowInlinePricing(true);
            openAuthModal(() => {
              const routes = { cv: "/app", letter: "/cover-letter", humanizer: "/humanizer" };
              window.location.href = routes[resultPreviewType];
            });
          }
        }}
      />

      {/* Inline Pricing */}
      <InlinePricing
        isOpen={showInlinePricing}
        onClose={() => setShowInlinePricing(false)}
      />
    </div>
  );
}
