/**
 * CV criteria per sector — the canonical source of truth injected into
 * every Claude prompt for CV generation, rewriting and analysis.
 *
 * Each sector has:
 *   - persona     : how a recruiter reads a CV in this field
 *   - tone        : voice/register expected in the copy
 *   - structure   : preferred section order and length
 *   - visual      : design cues (colors, typography, layout density)
 *   - atsKeywords : keywords ATS filters look for
 *   - do / dont   : concrete guidance for the writer
 *   - templateKey : maps to a PDF template family (sober / modern / creative)
 */

export type CvSectorKey =
  | "banque-finance"
  | "conseil-strategie"
  | "tech-dev"
  | "marketing-communication"
  | "design-creation"
  | "juridique"
  | "sante-medical"
  | "luxe-mode"
  | "industrie-ingenierie"
  | "commerce-vente"
  | "immobilier"
  | "rh-recrutement"
  | "education-formation"
  | "hotellerie-restauration"
  | "logistique-supply"
  | "generique";

export type CvTemplateKey = "sober" | "modern" | "creative" | "editorial";

export interface CvSectorCriteria {
  key: CvSectorKey;
  label: string;
  persona: string;
  tone: string;
  structure: string[];
  visual: {
    templateKey: CvTemplateKey;
    palette: string[]; // primary / secondary hex colors used by the PDF generator
    typography: string;
    density: "airy" | "balanced" | "dense";
  };
  atsKeywords: string[];
  do: string[];
  dont: string[];
  bulletVerbs: string[]; // action verbs Claude should prefer when rewriting bullets
}

export const CV_SECTOR_CRITERIA: Record<CvSectorKey, CvSectorCriteria> = {
  "banque-finance": {
    key: "banque-finance",
    label: "Banque · Finance",
    persona:
      "Un RH banque cherche : rigueur, chiffres, gestion du risque, respect de la conformité (MIF 2, DDA, AMF). Il survole 20 s pour valider le sérieux avant de lire.",
    tone: "Sobre, factuel, chiffré. Zéro emoji. Vocabulaire technique maîtrisé (KPI, ROI, PNB, LCB-FT, risque de contrepartie).",
    structure: [
      "Prénom NOM + poste visé + coordonnées (email pro, LinkedIn, ville)",
      "Résumé pro 2-3 lignes ancré secteur",
      "Expériences pro (les plus récentes d'abord, chiffres partout)",
      "Formations (avec mentions et classements)",
      "Certifications (AMF, ACPR, CFA, chartered...)",
      "Compétences techniques (Bloomberg, Excel avancé, VBA, SQL, Power BI)",
      "Langues (niveau CECRL)",
      "Centres d'intérêt sobre (associatif, sport de discipline)",
    ],
    visual: {
      templateKey: "sober",
      palette: ["#0B1F3F", "#1F3A5F", "#B4A76C"],
      typography: "Serif classique (Garamond, Cambria) pour titres, Sans neutre pour corps",
      density: "dense",
    },
    atsKeywords: [
      "gestion de patrimoine",
      "conformité",
      "risque de crédit",
      "reporting financier",
      "IFRS",
      "consolidation",
      "AMF",
      "KYC",
      "LCB-FT",
      "compliance",
      "asset management",
      "corporate finance",
      "M&A",
      "audit interne",
      "contrôle de gestion",
    ],
    do: [
      "Quantifier chaque mission (montants gérés, encours, portefeuille clients, PNB, économies)",
      "Faire apparaître AMF/ACPR quand pertinent",
      "Nommer les outils : Bloomberg, Reuters, Excel/VBA, SAP, SQL, Power BI",
      "Mentionner les alternances et stages en banque, cabinet d'audit, société de gestion",
    ],
    dont: [
      "Trop de créativité graphique (le RH banque coupera)",
      "Emojis, gradients, colonnes multiples",
      "Bullet points vagues sans chiffres",
      "Photo décontractée / en extérieur",
    ],
    bulletVerbs: ["Piloté", "Structuré", "Analysé", "Sécurisé", "Modélisé", "Chiffré", "Contrôlé", "Optimisé", "Certifié"],
  },

  "conseil-strategie": {
    key: "conseil-strategie",
    label: "Conseil · Stratégie",
    persona:
      "Un partner conseil cherche : impact business, capacité d'abstraction, densité intellectuelle. Il lit vite mais en profondeur.",
    tone: "Direct, structuré, impact-first. Chaque bullet commence par un verbe fort + résultat chiffré.",
    structure: [
      "Prénom NOM + accroche 1 ligne (poste cible + secteur)",
      "Expériences (missions cabinet ou entreprise avec impact business quantifié)",
      "Formations (grande école + mention, classements internationaux)",
      "Compétences techniques (Excel modélisation, PowerPoint, Python/SQL)",
      "Langues courantes (niveau CECRL + expérience à l'étranger)",
      "Extra : bureau des élèves, sport haut niveau, associations impact",
    ],
    visual: {
      templateKey: "sober",
      palette: ["#000000", "#333333", "#C89B3C"],
      typography: "Sans-serif dense (Helvetica, Aptos), titres capitalisés",
      density: "dense",
    },
    atsKeywords: [
      "stratégie",
      "transformation",
      "diligence",
      "due diligence",
      "modélisation financière",
      "M&A",
      "business plan",
      "market sizing",
      "benchmark",
      "pitch",
    ],
    do: [
      "Mission → problem → action → impact chiffré",
      "Nom des clients quand autorisé (grands comptes)",
      "Utiliser des acronymes du secteur (MBB, EBITDA, LBO, market share)",
      "Montrer des cas où tu as fait 3× plus / réduit 50% / gagné X M€",
    ],
    dont: [
      "Bullets sans chiffres",
      "Photo",
      "Loisirs banals ('cinéma, voyage')",
    ],
    bulletVerbs: ["Piloté", "Impacté", "Cadré", "Modélisé", "Formulé", "Recommandé", "Livré", "Négocié", "Convaincu"],
  },

  "tech-dev": {
    key: "tech-dev",
    label: "Tech · Développement",
    persona:
      "Un CTO/lead dev scanne le CV pour identifier stack, envergure des projets, quality signals (open source, CI/CD, tests). Il valorise la clarté et l'authenticité.",
    tone: "Concret, orienté projets et outils. Mention de la stack technique précise et à jour.",
    structure: [
      "Prénom NOM + poste visé (Full-stack, Data, DevOps...) + GitHub/portfolio + email",
      "Résumé pro 1-2 phrases orientées stack + type de systèmes",
      "Expériences (rôle + impact + stack utilisée)",
      "Projets perso / open source",
      "Formations",
      "Compétences techniques classées (Frontend / Backend / Infra / Data / DevOps)",
      "Langues (anglais tech niveau, CECRL)",
    ],
    visual: {
      templateKey: "modern",
      palette: ["#0EA5E9", "#0F172A", "#22D3EE"],
      typography: "Sans-serif moderne (Inter, JetBrains Mono pour la stack)",
      density: "balanced",
    },
    atsKeywords: [
      "React", "Next.js", "Node.js", "Python", "TypeScript", "Docker", "Kubernetes",
      "CI/CD", "AWS", "GCP", "PostgreSQL", "GraphQL", "REST API", "microservices",
      "TDD", "agile", "scrum", "Git", "TypeScript", "monorepo",
    ],
    do: [
      "Préciser les versions de framework/outils quand pertinent",
      "Lister les projets impactants (open source, hackathon)",
      "Ajouter le trafic/latence/tests couverts si tu peux",
      "Lien direct GitHub / portfolio en tête",
    ],
    dont: [
      "Format ATS-inutile (colonnes exotiques que le parser va casser)",
      "Photo (à moins que la culture de la boîte l'apprécie explicitement)",
      "Buzzwords vides sans preuve ('passionné de tech')",
    ],
    bulletVerbs: ["Développé", "Architecturé", "Refactorisé", "Déployé", "Migré", "Automatisé", "Sécurisé", "Optimisé", "Instrumenté"],
  },

  "marketing-communication": {
    key: "marketing-communication",
    label: "Marketing · Communication",
    persona:
      "Un directeur marketing/CMO cherche : créativité + rigueur data. Chiffres d'engagement, conversions, campagnes signées, ROI média.",
    tone: "Punchy, orienté résultat, storytelling maîtrisé.",
    structure: [
      "Prénom NOM + rôle + mini portfolio (Behance/site perso/LinkedIn)",
      "Résumé pro (angle + secteur d'expertise)",
      "Expériences (campagnes signées + KPI)",
      "Compétences (Meta Ads, Google Ads, HubSpot, Salesforce Marketing Cloud, Figma, Notion, SEO/SEM)",
      "Formations",
      "Langues",
      "Extras (podcast, blog, community perso)",
    ],
    visual: {
      templateKey: "creative",
      palette: ["#EC4899", "#8B5CF6", "#F97316"],
      typography: "Sans moderne (DM Sans, Poppins), touches d'accent visuel",
      density: "balanced",
    },
    atsKeywords: [
      "SEO", "SEA", "social ads", "growth", "brand", "storytelling",
      "influence", "content", "CRM", "CRO", "conversion", "funnel",
      "acquisition", "rétention", "ROAS", "CPA", "CTR", "engagement",
    ],
    do: [
      "Faire briller les KPI (ROAS, CPA, CTR, taux de conversion)",
      "Nommer les marques emblématiques travaillées",
      "Ajouter une touche visuelle propre sans surcharger",
      "Mentionner les outils AdOps + créa (Meta, Google, HubSpot, Figma)",
    ],
    dont: [
      "Design chaotique (le CV doit rester lisible)",
      "Trop de jargon interne d'agence",
      "Bullets sans chiffres",
    ],
    bulletVerbs: ["Lancé", "Piloté", "Boosté", "Activé", "Optimisé", "Signé", "Amplifié", "Convertí", "Fidélisé"],
  },

  "design-creation": {
    key: "design-creation",
    label: "Design · Création",
    persona:
      "Un directeur créatif juge d'abord le portfolio ; le CV doit renvoyer vite au book et prouver la maîtrise des outils/procédés.",
    tone: "Éditorial, mise en page soignée, hiérarchie typographique visible.",
    structure: [
      "Nom + rôle + lien portfolio en gros",
      "Résumé pro (style + medium préféré)",
      "Expériences (clients, missions, résultats)",
      "Outils (Figma, Adobe suite, Sketch, Blender, After Effects)",
      "Formations (Écoles + spécialités)",
      "Récompenses / publications",
      "Langues",
    ],
    visual: {
      templateKey: "editorial",
      palette: ["#111111", "#F5F1EA", "#C89B3C"],
      typography: "Serif éditorial (Playfair, Cormorant) pour titres, Sans neutre pour corps",
      density: "airy",
    },
    atsKeywords: ["UI", "UX", "design system", "typography", "branding", "illustration", "art direction", "Figma", "prototypage"],
    do: [
      "Portfolio URL en tête (impossible à rater)",
      "Sélectionner 3-5 projets phares, chacun avec 1 chiffre impactant",
      "Soigner la mise en page comme un vrai objet de design",
    ],
    dont: [
      "Design tape-à-l'œil sans hiérarchie",
      "Trop de bullets — laisse respirer",
    ],
    bulletVerbs: ["Conçu", "Direction art", "Prototypé", "Livré", "Publié", "Récompensé", "Défini", "Illustré"],
  },

  "juridique": {
    key: "juridique",
    label: "Juridique",
    persona:
      "Un associé/DJ juge le sérieux, la précision, l'école, la spécialité. Format sobre, contenu exact, spécialisation claire.",
    tone: "Formel, précis, spécialisé.",
    structure: [
      "Prénom NOM (Avocat au Barreau de X, si applicable) + contact",
      "Expériences (cabinets, spécialités, deals)",
      "Formations (Master 2, école du barreau, LL.M.)",
      "Barres (Paris, New York…)",
      "Publications / interventions",
      "Langues juridiques (spécifier : contrats, plaidoiries)",
    ],
    visual: {
      templateKey: "sober",
      palette: ["#1B2A44", "#8B7355", "#FFFFFF"],
      typography: "Serif traditionnel (Garamond, Sabon)",
      density: "dense",
    },
    atsKeywords: [
      "droit des affaires", "droit fiscal", "droit social", "M&A", "arbitrage",
      "contentieux", "conformité", "compliance", "contract review", "IP",
    ],
    do: [
      "Spécialiser : matière, secteur, type de contentieux",
      "Nommer les cabinets/deals emblématiques",
      "Mentionner publications et interventions",
    ],
    dont: ["Créativité graphique", "Fautes de français (rédhibitoire)"],
    bulletVerbs: ["Rédigé", "Négocié", "Plaidé", "Représenté", "Conseillé", "Audité", "Structuré"],
  },

  "sante-medical": {
    key: "sante-medical",
    label: "Santé · Médical",
    persona:
      "Un DRH hospitalier ou un médecin recruteur cherche : diplômes homologués, spécialités, expériences terrain, respect des protocoles.",
    tone: "Factuel, rigoureux, humaniste dans le résumé.",
    structure: [
      "Prénom NOM (Dr. si applicable) + spécialité + contact",
      "Résumé pro (spécialité + type d'établissements souhaités)",
      "Diplômes (Doctorat, DU, DES)",
      "Expériences (services, terrains, actes réalisés)",
      "Formations continues et publications",
      "Langues",
    ],
    visual: {
      templateKey: "sober",
      palette: ["#0F5EA8", "#FFFFFF", "#3AA675"],
      typography: "Sans-serif humaniste (Source Sans, Open Sans)",
      density: "balanced",
    },
    atsKeywords: ["cardiologie", "pédiatrie", "réanimation", "urgences", "chirurgie", "santé publique"],
    do: ["Nommer les hôpitaux/CHU", "Préciser les DES et sur-spécialités", "Mentionner publications"],
    dont: ["Créativité visuelle superflue"],
    bulletVerbs: ["Suivi", "Coordonné", "Réalisé", "Diagnostiqué", "Formé", "Publié", "Enseigné"],
  },

  "luxe-mode": {
    key: "luxe-mode",
    label: "Luxe · Mode",
    persona:
      "Un DRH maison de luxe cherche : culture maison, exigence, savoir-vivre, sens du détail.",
    tone: "Élégant, distingué, référencé aux maisons.",
    structure: [
      "Nom + poste + contact",
      "Résumé pro (identité + maisons phares)",
      "Expériences (maisons, boutiques flagship, saisons)",
      "Formations (école de mode/luxe, langues rares)",
      "Compétences (retail excellence, clientelling, CRM luxe)",
      "Langues (chinois, japonais, arabe = très valorisés)",
    ],
    visual: {
      templateKey: "editorial",
      palette: ["#000000", "#C4A15A", "#FFFFFF"],
      typography: "Serif éditorial (Bodoni, Didot)",
      density: "airy",
    },
    atsKeywords: ["clientelling", "retail", "flagship", "VIP", "boutique", "hospitality"],
    do: ["Nommer les maisons prestigieuses", "Insister sur les langues rares", "Mentionner l'expertise produit"],
    dont: ["Fautes d'orthographe (rédhibitoire chez les maisons)"],
    bulletVerbs: ["Accompagné", "Fidélisé", "Représenté", "Formé", "Développé"],
  },

  "industrie-ingenierie": {
    key: "industrie-ingenierie",
    label: "Industrie · Ingénierie",
    persona:
      "Un directeur usine/BE cherche : compétences techniques, respect QHSE, capacité à piloter des équipes ouvrières, sécurité, productivité.",
    tone: "Technique et concret, orienté productivité, sécurité, qualité.",
    structure: [
      "Prénom NOM + intitulé + contact",
      "Résumé pro (spécialité technique + secteurs industriels)",
      "Expériences (avec KPI: TRS, taux rebut, économies)",
      "Formations (école d'ingé + spécialisation)",
      "Certifications (Lean Six Sigma, ISO, PMP)",
      "Compétences (CAO, GMAO, ERP, MES)",
      "Langues",
    ],
    visual: {
      templateKey: "sober",
      palette: ["#1F4E79", "#F97316", "#FFFFFF"],
      typography: "Sans-serif industriel (Roboto, Arial)",
      density: "dense",
    },
    atsKeywords: ["Lean", "Six Sigma", "SolidWorks", "CATIA", "SAP", "GMAO", "ISO 9001", "TRS", "QHSE"],
    do: ["Chiffrer les gains", "Nommer les outils", "Mentionner les projets d'amélioration continue"],
    dont: ["Fluff marketing"],
    bulletVerbs: ["Piloté", "Industrialisé", "Automatisé", "Sécurisé", "Réduit", "Certifié", "Optimisé"],
  },

  "commerce-vente": {
    key: "commerce-vente",
    label: "Commerce · Vente",
    persona:
      "Un directeur commercial regarde : capacité à closer, portefeuille, résultats vs quota.",
    tone: "Dynamique, orienté chiffre, punchy.",
    structure: [
      "Prénom NOM + poste visé + contact",
      "Résumé pro (secteur + résultat marquant)",
      "Expériences (CA, portefeuille, résultats vs quota)",
      "Formations",
      "Compétences (CRM Salesforce/HubSpot, techniques de vente)",
      "Langues",
    ],
    visual: {
      templateKey: "modern",
      palette: ["#DC2626", "#0F172A", "#FBBF24"],
      typography: "Sans-serif direct (Poppins, Inter)",
      density: "balanced",
    },
    atsKeywords: ["CRM", "closing", "prospection", "SaaS", "B2B", "B2C", "farming", "hunting", "KAM"],
    do: ["Résultats vs quota", "Nom des clients grands comptes", "Metrics de conversion"],
    dont: ["Bullet sans chiffre"],
    bulletVerbs: ["Closé", "Signé", "Développé", "Prospecté", "Fidélisé", "Négocié", "Amplifié"],
  },

  "immobilier": {
    key: "immobilier",
    label: "Immobilier",
    persona:
      "Un directeur d'agence/promoteur cherche : réseau, sens du contact, résultats de vente/gestion locative.",
    tone: "Chiffré, sérieux, orienté résultats.",
    structure: [
      "Nom + carte professionnelle si applicable + contact",
      "Résumé pro (segment : ancien, neuf, luxe, gestion)",
      "Expériences (biens vendus/loués, CA généré)",
      "Formations",
      "Compétences (Pearl, Hektor, ImmoFacile, techniques de négociation)",
      "Langues",
    ],
    visual: {
      templateKey: "modern",
      palette: ["#0F766E", "#0F172A", "#F59E0B"],
      typography: "Sans-serif (Montserrat)",
      density: "balanced",
    },
    atsKeywords: ["mandat", "négociation", "estimation", "Loi Hoguet", "gestion locative", "PROMONA"],
    do: ["Chiffrer les mandats/ventes", "Segmenter par type de bien"],
    dont: ["Créativité graphique excessive"],
    bulletVerbs: ["Négocié", "Vendu", "Loué", "Estimé", "Développé", "Signé"],
  },

  "rh-recrutement": {
    key: "rh-recrutement",
    label: "RH · Recrutement",
    persona:
      "Un DRH juge la capacité à sourcer, closer, gérer un pipe, connaître les process paie/onboarding.",
    tone: "Structuré, orienté process et people.",
    structure: [
      "Nom + poste + contact",
      "Résumé pro (spécialisation : tech/tertiaire/exec search)",
      "Expériences (recrutements réalisés + time-to-fill)",
      "Formations",
      "Compétences (SIRH : Workday, SAP HR, LinkedIn Recruiter)",
      "Langues",
    ],
    visual: {
      templateKey: "modern",
      palette: ["#7C3AED", "#0F172A", "#F59E0B"],
      typography: "Sans-serif (Inter)",
      density: "balanced",
    },
    atsKeywords: ["sourcing", "recrutement", "onboarding", "SIRH", "Workday", "SAP HR", "LinkedIn Recruiter"],
    do: ["Chiffrer les recrutements réalisés + time-to-fill", "Nommer les secteurs"],
    dont: ["Trop générique"],
    bulletVerbs: ["Recruté", "Sourcé", "Négocié", "Formé", "Structuré", "Digitalisé"],
  },

  "education-formation": {
    key: "education-formation",
    label: "Éducation · Formation",
    persona:
      "Un directeur académique cherche : diplômes, pédagogie, publications, impact sur les apprenants.",
    tone: "Pédagogique, structuré, valorisant l'impact sur les élèves/étudiants.",
    structure: [
      "Nom + intitulé + contact",
      "Résumé pro (spécialité + public)",
      "Expériences (établissements, niveaux, résultats aux examens)",
      "Formations (agrégation, doctorat, CAPES)",
      "Publications / conférences",
      "Langues",
    ],
    visual: {
      templateKey: "sober",
      palette: ["#1E40AF", "#0F172A", "#FFFFFF"],
      typography: "Serif académique",
      density: "balanced",
    },
    atsKeywords: ["pédagogie", "CAPES", "agrégation", "doctorat", "évaluation"],
    do: ["Nommer les établissements", "Chiffrer les taux de réussite si possible"],
    dont: ["Fautes de français"],
    bulletVerbs: ["Enseigné", "Formé", "Publié", "Coordonné", "Évalué"],
  },

  "hotellerie-restauration": {
    key: "hotellerie-restauration",
    label: "Hôtellerie · Restauration",
    persona:
      "Un directeur d'hôtel cherche : sens du service, langues, connaissance des standards internationaux, expérience étoiles.",
    tone: "Service, langues, standards. Anglais et langues rares valorisés.",
    structure: [
      "Nom + poste + contact",
      "Résumé pro (segment : 5*/palace, gastronomique, chaîne)",
      "Expériences (établissements, taux occupation, notes clients)",
      "Formations",
      "Compétences (PMS Opera, Micros, Hospitality)",
      "Langues (le plus important)",
    ],
    visual: {
      templateKey: "editorial",
      palette: ["#7C2D12", "#B45309", "#FEF3C7"],
      typography: "Serif hospitalité",
      density: "balanced",
    },
    atsKeywords: ["hospitality", "Opera PMS", "Micros", "5 étoiles", "palace", "gastronomique"],
    do: ["Listing des langues en premier", "Nommer les groupes/palaces"],
    dont: ["Photo négligée"],
    bulletVerbs: ["Accueilli", "Servi", "Coordonné", "Fidélisé", "Formé"],
  },

  "logistique-supply": {
    key: "logistique-supply",
    label: "Logistique · Supply Chain",
    persona:
      "Un directeur supply chain cherche : maîtrise des flux, ERP, KPI logistiques, gestion d'équipes ouvrières.",
    tone: "Opérationnel, chiffré, orienté flux.",
    structure: [
      "Nom + poste + contact",
      "Résumé pro (type de flux + secteurs)",
      "Expériences (flux gérés, KPI OTIF, coûts logistiques)",
      "Formations",
      "Compétences (SAP MM/WM, TMS, WMS)",
      "Langues",
    ],
    visual: {
      templateKey: "sober",
      palette: ["#1E3A8A", "#0F172A", "#FBBF24"],
      typography: "Sans-serif logistique",
      density: "balanced",
    },
    atsKeywords: ["SAP", "TMS", "WMS", "OTIF", "supply", "flux", "logistique", "S&OP"],
    do: ["Chiffrer OTIF, coûts, taux service", "Nommer les ERP maîtrisés"],
    dont: ["Créativité graphique"],
    bulletVerbs: ["Piloté", "Optimisé", "Réduit", "Structuré", "Digitalisé"],
  },

  "generique": {
    key: "generique",
    label: "Autre / Non défini",
    persona:
      "Un RH classique cherche : lisibilité, cohérence de parcours, compétences claires, motivation identifiable.",
    tone: "Neutre, professionnel, orienté clarté.",
    structure: [
      "Contact + poste visé",
      "Résumé pro",
      "Expériences",
      "Formations",
      "Compétences",
      "Langues",
      "Extras",
    ],
    visual: {
      templateKey: "modern",
      palette: ["#4F46E5", "#0F172A", "#F59E0B"],
      typography: "Sans-serif universelle (Inter)",
      density: "balanced",
    },
    atsKeywords: [],
    do: ["Chiffrer les résultats", "Cohérence de parcours claire"],
    dont: ["CV fourre-tout sans direction"],
    bulletVerbs: ["Réalisé", "Développé", "Coordonné", "Piloté", "Optimisé"],
  },
};

export const CV_SECTOR_LIST: Array<{ key: CvSectorKey; label: string }> = (
  Object.values(CV_SECTOR_CRITERIA) as CvSectorCriteria[]
).map((s) => ({ key: s.key, label: s.label }));

/**
 * Serialize a sector's criteria into a compact Claude-friendly briefing.
 * Injected into every CV-generation / analysis prompt.
 */
export function briefForClaude(sector: CvSectorKey): string {
  const s = CV_SECTOR_CRITERIA[sector] ?? CV_SECTOR_CRITERIA.generique;
  return `SECTEUR CIBLE : ${s.label}

Persona recruteur :
${s.persona}

Ton attendu :
${s.tone}

Structure privilégiée :
${s.structure.map((line, i) => `${i + 1}. ${line}`).join("\n")}

À FAIRE :
${s.do.map((d) => `- ${d}`).join("\n")}

À ÉVITER :
${s.dont.map((d) => `- ${d}`).join("\n")}

Verbes d'action à privilégier dans les bullet points :
${s.bulletVerbs.join(", ")}

Mots-clés ATS courants dans ce secteur (à intégrer là où pertinent) :
${s.atsKeywords.join(", ")}
`;
}
