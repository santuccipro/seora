export interface StructuredCV {
  header: {
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
    photoUrl?: string;
  };
  summary?: string;
  experiences: {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    location?: string;
    bullets: string[];
  }[];
  education: {
    id: string;
    school: string;
    degree: string;
    startDate: string;
    endDate: string;
    description?: string;
  }[];
  skills: {
    category: string;
    items: string[];
  }[];
  languages: {
    name: string;
    level: string;
  }[];
  interests?: string[];
  /** AI-detected sector theme */
  detectedTheme?: string;
}

/* ─── CV Themes ─── */
export type CVThemeId = "corporate" | "modern" | "creative" | "medical" | "classic" | "tech";

export interface CVTheme {
  id: CVThemeId;
  name: string;
  description: string;
  // Sidebar
  sidebarBg: string;
  sidebarText: string;
  sidebarAccent: string;
  sidebarTagBg: string;
  // Main
  mainBg: string;
  mainText: string;
  headingColor: string;
  accentColor: string;
  subTextColor: string;
  bulletColor: string;
  borderColor: string;
  // Style options
  sidebarPosition: "left" | "right";
  nameStyle: "stacked" | "inline";
  sectionDivider: "line" | "dots" | "none" | "thick";
  borderLeftStyle: boolean;
  tagStyle: "rounded" | "pill" | "square";
}

export const CV_THEMES: Record<CVThemeId, CVTheme> = {
  corporate: {
    id: "corporate",
    name: "Corporate",
    description: "Banque, Finance, Conseil — Sobre et élégant",
    sidebarBg: "#1B2A4A",
    sidebarText: "#E8EDF5",
    sidebarAccent: "#8BA3CC",
    sidebarTagBg: "rgba(139,163,204,0.18)",
    mainBg: "#FFFFFF",
    mainText: "#1F2937",
    headingColor: "#1B2A4A",
    accentColor: "#2D4A7A",
    subTextColor: "#6B7280",
    bulletColor: "#2D4A7A",
    borderColor: "#E2E8F0",
    sidebarPosition: "left",
    nameStyle: "stacked",
    sectionDivider: "line",
    borderLeftStyle: true,
    tagStyle: "square",
  },
  modern: {
    id: "modern",
    name: "Modern",
    description: "Startup, Digital, Marketing — Épuré et frais",
    sidebarBg: "#111827",
    sidebarText: "#F3F4F6",
    sidebarAccent: "#60A5FA",
    sidebarTagBg: "rgba(96,165,250,0.15)",
    mainBg: "#FFFFFF",
    mainText: "#111827",
    headingColor: "#111827",
    accentColor: "#3B82F6",
    subTextColor: "#6B7280",
    bulletColor: "#3B82F6",
    borderColor: "#E5E7EB",
    sidebarPosition: "left",
    nameStyle: "inline",
    sectionDivider: "thick",
    borderLeftStyle: true,
    tagStyle: "pill",
  },
  creative: {
    id: "creative",
    name: "Créatif",
    description: "Design, Communication, Art — Audacieux et visuel",
    sidebarBg: "#7C3AED",
    sidebarText: "#F5F3FF",
    sidebarAccent: "#C4B5FD",
    sidebarTagBg: "rgba(196,181,253,0.2)",
    mainBg: "#FAFAFA",
    mainText: "#1F2937",
    headingColor: "#7C3AED",
    accentColor: "#8B5CF6",
    subTextColor: "#6B7280",
    bulletColor: "#8B5CF6",
    borderColor: "#E9E5F5",
    sidebarPosition: "right",
    nameStyle: "stacked",
    sectionDivider: "dots",
    borderLeftStyle: false,
    tagStyle: "pill",
  },
  medical: {
    id: "medical",
    name: "Médical",
    description: "Santé, Pharma, Social — Sérieux et rassurant",
    sidebarBg: "#064E3B",
    sidebarText: "#ECFDF5",
    sidebarAccent: "#6EE7B7",
    sidebarTagBg: "rgba(110,231,183,0.15)",
    mainBg: "#FFFFFF",
    mainText: "#1F2937",
    headingColor: "#064E3B",
    accentColor: "#059669",
    subTextColor: "#6B7280",
    bulletColor: "#059669",
    borderColor: "#D1FAE5",
    sidebarPosition: "left",
    nameStyle: "inline",
    sectionDivider: "line",
    borderLeftStyle: true,
    tagStyle: "rounded",
  },
  classic: {
    id: "classic",
    name: "Classique",
    description: "Admin, Juridique, Éducation — Traditionnel et fiable",
    sidebarBg: "#374151",
    sidebarText: "#F3F4F6",
    sidebarAccent: "#D1D5DB",
    sidebarTagBg: "rgba(209,213,219,0.15)",
    mainBg: "#FFFFFF",
    mainText: "#1F2937",
    headingColor: "#374151",
    accentColor: "#4B5563",
    subTextColor: "#6B7280",
    bulletColor: "#6B7280",
    borderColor: "#E5E7EB",
    sidebarPosition: "left",
    nameStyle: "inline",
    sectionDivider: "line",
    borderLeftStyle: false,
    tagStyle: "square",
  },
  tech: {
    id: "tech",
    name: "Tech",
    description: "Développement, IT, Data — Moderne et structuré",
    sidebarBg: "#0F172A",
    sidebarText: "#E2E8F0",
    sidebarAccent: "#38BDF8",
    sidebarTagBg: "rgba(56,189,248,0.12)",
    mainBg: "#FFFFFF",
    mainText: "#0F172A",
    headingColor: "#0F172A",
    accentColor: "#0EA5E9",
    subTextColor: "#64748B",
    bulletColor: "#0EA5E9",
    borderColor: "#E2E8F0",
    sidebarPosition: "left",
    nameStyle: "stacked",
    sectionDivider: "thick",
    borderLeftStyle: true,
    tagStyle: "rounded",
  },
};

/** Map detected sector keywords to theme */
export function getThemeForSector(detectedTheme?: string): CVThemeId {
  if (!detectedTheme) return "modern";
  const d = detectedTheme.toLowerCase();
  if (d.includes("banque") || d.includes("finance") || d.includes("conseil") || d.includes("audit") || d.includes("assurance")) return "corporate";
  if (d.includes("tech") || d.includes("développ") || d.includes("data") || d.includes("ingénieur") || d.includes("informatique") || d.includes("it")) return "tech";
  if (d.includes("design") || d.includes("créat") || d.includes("communi") || d.includes("market") || d.includes("art") || d.includes("média")) return "creative";
  if (d.includes("médic") || d.includes("santé") || d.includes("pharma") || d.includes("infirm") || d.includes("social") || d.includes("hôpital")) return "medical";
  if (d.includes("admin") || d.includes("jurid") || d.includes("droit") || d.includes("éduc") || d.includes("enseign") || d.includes("compta")) return "classic";
  if (d.includes("startup") || d.includes("digital") || d.includes("product") || d.includes("growth")) return "modern";
  // Hôtellerie / restauration / accueil → classic
  if (d.includes("hôtel") || d.includes("accueil") || d.includes("réception") || d.includes("restaur") || d.includes("tourisme")) return "classic";
  return "modern";
}
