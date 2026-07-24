/**
 * Hardcoded sector-aware career tips for the dashboard feed.
 * Each sector has 3-5 tips. We pick 3 randomly at runtime.
 */

export interface CareerTip {
  title: string;
  body: string;
  icon: string; // emoji
}

export const SECTOR_TIPS: Record<string, CareerTip[]> = {
  "banque-finance": [
    {
      title: "Chiffre toujours tes résultats",
      body: "Les recruteurs en finance lisent en 20 secondes. Un chiffre (encours géré, PNB, économies réalisées) capte l'oeil instantanément.",
      icon: "📊",
    },
    {
      title: "Soigne ta conformité réglementaire",
      body: "Mentionne AMF, ACPR, MIF 2, LCB-FT si tu les connais. Ça montre que tu comprends les enjeux réels du secteur.",
      icon: "🏛️",
    },
    {
      title: "Maîtrise les outils de référence",
      body: "Bloomberg Terminal, Reuters Eikon, Excel/VBA, SQL — liste précisément ceux que tu maîtrises plutôt que d'écrire 'outils bureautiques'.",
      icon: "🖥️",
    },
    {
      title: "Format sobre obligatoire",
      body: "En banque, un CV créatif est éliminatoire. Template sobre, police classique, aucun emoji, densité maximale.",
      icon: "📋",
    },
    {
      title: "Le Master 2 compte vraiment",
      body: "Mentionne la mention et le classement de ton M2 (Finance de marché, Ingénierie financière…) — c'est filtré dès le screening.",
      icon: "🎓",
    },
  ],
  "tech-dev": [
    {
      title: "Ton GitHub parle pour toi",
      body: "Mets le lien GitHub en tête du CV. Un repo avec du code propre et des commits réguliers vaut plus que 3 lignes de bullet points.",
      icon: "💻",
    },
    {
      title: "Précise les versions de ta stack",
      body: "Écris 'React 18 + Next.js 14 + TypeScript' plutôt que 'React'. Les CTO scannent les versions pour évaluer ton niveau de recence.",
      icon: "⚙️",
    },
    {
      title: "Montre l'impact de tes projets",
      body: "Trafic mensuel, latence réduite de X%, couverture de tests à Y% — les métriques techniques transforment un bullet vague en preuve concrète.",
      icon: "🚀",
    },
    {
      title: "Open source = signal fort",
      body: "Une contribution à un projet open source populaire, même mineure, capte immédiatement l'attention d'un lead dev.",
      icon: "🌐",
    },
    {
      title: "Sépare Frontend / Backend / DevOps",
      body: "Classe tes compétences par catégorie. Ça aide le recruteur à évaluer ta profondeur réelle dans chaque domaine.",
      icon: "🗂️",
    },
  ],
  "marketing-communication": [
    {
      title: "Les KPIs avant tout",
      body: "ROAS, CPA, CTR, taux de conversion — un bullet sans chiffre ne compte pas en marketing. Chaque mission doit avoir son metric.",
      icon: "📈",
    },
    {
      title: "Nomme les marques que tu as servies",
      body: "Travailler pour une marque reconnue est un social proof immédiat. Si tu peux le mentionner, mets le logo en tête de mission.",
      icon: "🏷️",
    },
    {
      title: "Portfolio > CV",
      body: "Ajoute le lien vers ton portfolio Behance, ton site perso ou un Notion de tes campagnes. C'est ce que le CMO regardera en premier.",
      icon: "🎨",
    },
    {
      title: "Maîtrise les outils AdOps",
      body: "Meta Ads Manager, Google Ads, HubSpot, Salesforce Marketing Cloud — précise tes certifications si tu en as.",
      icon: "🛠️",
    },
    {
      title: "Ton personal branding compte",
      body: "Un compte LinkedIn actif, un blog, un podcast — ça montre que tu pratiques ce que tu vends.",
      icon: "✨",
    },
  ],
  "conseil-strategie": [
    {
      title: "Structure : Situation → Action → Impact",
      body: "Chaque bullet doit suivre ce pattern. 'J'ai analysé' ne suffit pas — le partner veut voir l'impact business chiffré.",
      icon: "🎯",
    },
    {
      title: "Utilise le vocabulaire MBB",
      body: "Market sizing, due diligence, EBITDA, LBO, market share — le jargon montre que tu connais les codes du secteur.",
      icon: "📚",
    },
    {
      title: "Grande école + mention = filtre indispensable",
      body: "Indique clairement ton école, ton rang de sortie si favorable, et tes expériences internationales. C'est non-négociable en conseil.",
      icon: "🏆",
    },
    {
      title: "Activités extra-académiques ciblées",
      body: "Bureau des élèves de grande école, sport haut niveau, associations à impact — pas de loisirs banals type 'cinéma, voyage'.",
      icon: "⭐",
    },
  ],
  "generique": [
    {
      title: "Un CV = une cible",
      body: "Adapte ton CV à chaque offre. Copier-coller le même document pour 50 postes différents divise ton taux de réponse par 5.",
      icon: "🎯",
    },
    {
      title: "Le résumé pro fait la différence",
      body: "Les 2-3 premières lignes sont les seules que le recruteur lit à coup sûr. Mets ton poste cible, ta valeur ajoutée principale et ton niveau d'expérience.",
      icon: "✍️",
    },
    {
      title: "Chiffre systématiquement",
      body: "'Géré des projets' ne veut rien dire. 'Géré 4 projets simultanés, budget total 200k€, délai tenu à 100%' — voilà un bullet qui convainc.",
      icon: "📊",
    },
    {
      title: "LinkedIn aligné avec le CV",
      body: "Le recruteur vérifie LinkedIn après avoir lu le CV. Les deux doivent raconter la même histoire, avec les mêmes dates et titres.",
      icon: "🔗",
    },
    {
      title: "Format ATS-friendly",
      body: "Évite les tableaux complexes, les colonnes multiples et les zones de texte. Les ATS ne savent pas les parser — ton CV disparaît avant qu'un humain le lise.",
      icon: "🤖",
    },
  ],
};

/**
 * Get N random tips for a given sector. Falls back to "generique" if unknown.
 */
export function getTipsForSector(sector: string, count = 3): CareerTip[] {
  const tips = SECTOR_TIPS[sector] ?? SECTOR_TIPS["generique"];
  const shuffled = [...tips].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Pastel background color per sector for tip cards */
export const SECTOR_PASTEL: Record<string, string> = {
  "banque-finance": "bg-blue-50 border-blue-100",
  "tech-dev": "bg-indigo-50 border-indigo-100",
  "marketing-communication": "bg-orange-50 border-orange-100",
  "conseil-strategie": "bg-amber-50 border-amber-100",
  "design-creation": "bg-pink-50 border-pink-100",
  "juridique": "bg-slate-50 border-slate-100",
  "sante-medical": "bg-green-50 border-green-100",
  "luxe-mode": "bg-yellow-50 border-yellow-100",
  "industrie-ingenierie": "bg-cyan-50 border-cyan-100",
  "commerce-vente": "bg-red-50 border-red-100",
  "immobilier": "bg-teal-50 border-teal-100",
  "rh-recrutement": "bg-violet-50 border-violet-100",
  "education-formation": "bg-sky-50 border-sky-100",
  "hotellerie-restauration": "bg-rose-50 border-rose-100",
  "logistique-supply": "bg-emerald-50 border-emerald-100",
  "generique": "bg-gray-50 border-gray-100",
};
