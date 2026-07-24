export interface PhotoStyle {
  key: string;
  label: string;
  emoji: string;
  description: string;
  accent: string;
  bgGradient: string;
  prompt: string;
}

export const PHOTO_STYLES: PhotoStyle[] = [
  {
    key: "banque-finance",
    label: "Banque & Finance",
    emoji: "🏦",
    description: "Costume marine, fond studio blanc, éclairage LinkedIn",
    accent: "#0B1F3F",
    bgGradient: "linear-gradient(135deg, #0B1F3F 0%, #1A3A6E 100%)",
    prompt:
      "Ultra-realistic professional headshot. The person is wearing a navy blue tailored suit with a white shirt and subtle tie. Clean white or light grey studio background. Formal corporate photography style, sharp focus on face, soft studio lighting, LinkedIn-ready portrait. Keep the person's exact face, skin tone, and features.",
  },
  {
    key: "conseil-strategie",
    label: "Conseil & Stratégie",
    emoji: "🎯",
    description: "Costume gris anthracite, fond neutre dégradé",
    accent: "#374151",
    bgGradient: "linear-gradient(135deg, #374151 0%, #6B7280 100%)",
    prompt:
      "Ultra-realistic professional headshot. The person wears a charcoal grey tailored suit, white shirt, no tie or subtle one. Neutral soft grey gradient background. Executive consulting firm photography style, confident expression, sharp lighting. Keep the person's exact face, skin tone, and features.",
  },
  {
    key: "tech-startup",
    label: "Tech & Startup",
    emoji: "💻",
    description: "Smart casual sombre, fond bureau moderne bokeh",
    accent: "#1E293B",
    bgGradient: "linear-gradient(135deg, #1E293B 0%, #334155 100%)",
    prompt:
      "Ultra-realistic professional headshot. The person wears a smart casual outfit — dark crew neck or collared shirt, modern and clean. Soft blurred office or co-working space background with bokeh. Contemporary tech company photo style, approachable expression, natural lighting. Keep the person's exact face, skin tone, and features.",
  },
  {
    key: "marketing-com",
    label: "Marketing & Com",
    emoji: "📣",
    description: "Business casual coloré, fond vibrant flou",
    accent: "#7C3AED",
    bgGradient: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
    prompt:
      "Ultra-realistic professional headshot. The person wears stylish business casual — colourful blouse or shirt, modern look. Clean vibrant background with slight blur. Creative agency photography style, warm smile, dynamic lighting. Keep the person's exact face, skin tone, and features.",
  },
  {
    key: "design-creation",
    label: "Design & Création",
    emoji: "🎨",
    description: "Col roulé noir, éclairage dramatique éditorial",
    accent: "#B0892A",
    bgGradient: "linear-gradient(135deg, #B0892A 0%, #D4A843 100%)",
    prompt:
      "Ultra-realistic professional headshot. The person wears an artistic, stylish outfit — black turtleneck or creative ensemble. Moody artistic studio background, slightly dramatic side lighting. Editorial/creative director photography style, confident gaze. Keep the person's exact face, skin tone, and features.",
  },
  {
    key: "luxe-mode",
    label: "Luxe & Mode",
    emoji: "✨",
    description: "Tenue élégante, fond blanc pur, éclairage haut de gamme",
    accent: "#1A1A1A",
    bgGradient: "linear-gradient(135deg, #1A1A1A 0%, #3A3A3A 100%)",
    prompt:
      "Ultra-realistic professional headshot. The person wears an elegant, refined outfit — luxury fabric, understated colours. Pure white or soft beige background, flawless studio lighting. High-end fashion/luxury brand photography style, poised expression. Keep the person's exact face, skin tone, and features.",
  },
  {
    key: "sante-medical",
    label: "Santé & Médical",
    emoji: "🏥",
    description: "Blouse blanche, fond clinique lumineux",
    accent: "#0F766E",
    bgGradient: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
    prompt:
      "Ultra-realistic professional headshot. The person wears a white medical coat or clean professional scrubs over a smart shirt. Clean clinical white background with soft light. Medical professional photography style, trustworthy smile, even bright lighting. Keep the person's exact face, skin tone, and features.",
  },
  {
    key: "juridique",
    label: "Juridique",
    emoji: "⚖️",
    description: "Costume sombre, fond boiseries, éclairage Rembrandt",
    accent: "#1B2A44",
    bgGradient: "linear-gradient(135deg, #1B2A44 0%, #2E4A74 100%)",
    prompt:
      "Ultra-realistic professional headshot. The person wears a dark formal suit (black or very dark navy), white or pale blue shirt. Dark wood panel or deep grey background. Law firm / barrister photography style, serious and authoritative expression, classic Rembrandt lighting. Keep the person's exact face, skin tone, and features.",
  },
  {
    key: "direction-executive",
    label: "Direction & Executive",
    emoji: "👔",
    description: "Power suit premium, éclairage dramatique C-suite",
    accent: "#7B1C2E",
    bgGradient: "linear-gradient(135deg, #7B1C2E 0%, #B91C47 100%)",
    prompt:
      "Ultra-realistic professional headshot. The person wears a premium dark power suit, crisp shirt. Dramatic low-key studio background, split lighting for authority. C-suite / CEO photography style, commanding presence, intense gaze. Keep the person's exact face, skin tone, and features.",
  },
  {
    key: "immobilier-commerce",
    label: "Immobilier & Commerce",
    emoji: "🏡",
    description: "Blazer décontracté, bureau moderne lumineux",
    accent: "#0F5EA8",
    bgGradient: "linear-gradient(135deg, #0F5EA8 0%, #2E8AE6 100%)",
    prompt:
      "Ultra-realistic professional headshot. The person wears a smart business casual outfit — blazer over shirt, approachable colours. Bright modern office background with natural light bokeh. Real estate / sales professional photography style, warm confident smile. Keep the person's exact face, skin tone, and features.",
  },
];
