export interface CustomizationChoice {
  id: string;
  label: string;
  type: string;
  options: Array<{ value: string | boolean; label: string; desc?: string; default?: boolean }>;
}

export type UserChoices = Partial<Record<string, string | boolean>>;

export const CUSTOMIZATION_SCHEMA: CustomizationChoice[] = [
  {
    id: 'accent',
    label: 'Couleur principale',
    type: 'palette',
    options: [
      { value: '#1A1A2E', label: 'Marine', default: true },
      { value: '#7B1C2E', label: 'Bordeaux' },
      { value: '#111111', label: 'Noir' },
      { value: '#065F46', label: 'Vert forêt' },
      { value: '#B91C1C', label: 'Rouge brique' },
      { value: '#EA580C', label: 'Orange' },
      { value: '#6D28D9', label: 'Violet' },
      { value: '#B0892A', label: 'Or' },
      { value: '#0F766E', label: 'Teal' },
      { value: '#1D4ED8', label: 'Bleu royal' },
    ],
  },
  {
    id: 'style',
    label: 'Style général',
    type: 'radio',
    options: [
      { value: 'classic',    label: 'Classique', desc: 'Sobre, Garamond ou Times' },
      { value: 'modern',     label: 'Moderne',   desc: 'Inter, épuré, lignes franches', default: true },
      { value: 'creative',   label: 'Créatif',   desc: 'Typographie mixte, asymétrique' },
      { value: 'minimal',    label: 'Minimaliste', desc: 'Maximum de blanc, minimum de couleur' },
    ],
  },
  {
    id: 'borderRadius',
    label: 'Bords des éléments',
    type: 'radio',
    options: [
      { value: '0px',    label: 'Carrés', default: true },
      { value: '4px',    label: 'Légèrement arrondis' },
      { value: '8px',    label: 'Arrondis' },
      { value: '20px',   label: 'Pills / ronds' },
    ],
  },
  {
    id: 'font',
    label: 'Police de caractères',
    type: 'radio',
    options: [
      { value: 'sans',    label: 'Sans-serif (Inter)', desc: 'Moderne, lisible, ATS-friendly', default: true },
      { value: 'serif',   label: 'Serif (Garamond)', desc: 'Classique, prestige, finance/droit' },
      { value: 'mixed',   label: 'Mixte', desc: 'Titres serif + corps sans-serif' },
    ],
  },
  {
    id: 'photoShape',
    label: 'Forme de la photo',
    type: 'radio',
    options: [
      { value: '50%',   label: 'Ronde',  default: true },
      { value: '4px',   label: 'Carrée arrondie' },
      { value: '0px',   label: 'Carrée franche' },
      { value: 'none',  label: 'Sans photo' },
    ],
  },
  {
    id: 'layout',
    label: 'Mise en page',
    type: 'radio',
    options: [
      { value: 'sidebar-left',  label: 'Sidebar gauche', desc: 'Photo + infos à gauche' },
      { value: 'sidebar-right', label: 'Sidebar droite', desc: 'Infos à droite' },
      { value: 'single',        label: '1 colonne', desc: 'Ligne par ligne, ATS optimal', default: true },
      { value: 'top',           label: 'Header haut', desc: 'Nom + contacts en haut, 2 cols dessous' },
    ],
  },
  {
    id: 'density',
    label: 'Densité / espacement',
    type: 'radio',
    options: [
      { value: 'compact',     label: 'Compact', desc: "Max d'infos, espaces réduits" },
      { value: 'standard',    label: 'Standard', default: true },
      { value: 'airy',        label: 'Aéré', desc: "Plus d'espace, plus lisible" },
    ],
  },
  {
    id: 'background',
    label: 'Couleur de fond',
    type: 'palette',
    options: [
      { value: '#ffffff', label: 'Blanc pur', default: true },
      { value: '#FDFBF7', label: 'Crème' },
      { value: '#F9FAFB', label: 'Gris très clair' },
      { value: '#0F172A', label: 'Nuit (dark mode)' },
    ],
  },
  {
    id: 'dividers',
    label: 'Séparateurs de sections',
    type: 'radio',
    options: [
      { value: 'line',       label: 'Lignes fines', default: true },
      { value: 'gradient',   label: 'Dégradé couleur' },
      { value: 'none',       label: 'Sans séparateurs' },
      { value: 'double',     label: 'Double trait (classique)' },
    ],
  },
  {
    id: 'kpis',
    label: 'Afficher les KPIs / chiffres clés',
    type: 'toggle',
    options: [
      { value: true,  label: 'Oui', desc: 'Bandeau de métriques sous le header' },
      { value: false, label: 'Non', default: true },
    ],
  },
  {
    id: 'nameSize',
    label: 'Taille du nom',
    type: 'radio',
    options: [
      { value: '18pt', label: 'Standard' },
      { value: '22pt', label: 'Grand', default: true },
      { value: '28pt', label: 'Très grand' },
    ],
  },
  {
    id: 'accentUsage',
    label: 'Usage de la couleur',
    type: 'radio',
    options: [
      { value: 'minimal', label: 'Discret', desc: 'Uniquement titres de section' },
      { value: 'medium',  label: 'Modéré', desc: 'Titres + séparateurs + company', default: true },
      { value: 'rich',    label: 'Présent', desc: 'Header coloré, sidebar, accents forts' },
    ],
  },
];

export function getDefaults(): UserChoices {
  const d: UserChoices = {};
  for (const s of CUSTOMIZATION_SCHEMA) {
    const def = s.options.find(o => o.default);
    if (def) d[s.id] = def.value as string | boolean;
  }
  return d;
}

const FONT_MAP: Record<string, { link: string; body: string; title: string }> = {
  sans:  { link: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', body: "'Inter',sans-serif", title: "'Inter',sans-serif" },
  serif: { link: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap', body: "'EB Garamond',Georgia,serif", title: "'EB Garamond',Georgia,serif" },
  mixed: { link: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap', body: "'Inter',sans-serif", title: "'Playfair Display',Georgia,serif" },
};

export function buildStyleOverride(choices: UserChoices = {}): string {
  const c: Record<string, string | boolean> = { ...getDefaults(), ...choices } as Record<string, string | boolean>;
  const ac = c['accent'] as string;
  const bg = c['background'] as string;
  const br = c['borderRadius'] as string;
  const font = FONT_MAP[c['font'] as string] || FONT_MAP['sans'];
  const isDark = bg === '#0F172A';

  const padMod = c['density'] === 'compact' ? '0.7' : c['density'] === 'airy' ? '1.3' : '1';

  const dividerCSS = c['dividers'] === 'gradient'
    ? `border-image: linear-gradient(90deg, ${ac}, transparent) 1;`
    : c['dividers'] === 'none'
    ? `border: none !important; background: transparent !important;`
    : c['dividers'] === 'double'
    ? `border-style: double !important;`
    : '';

  const nameSize = (c['nameSize'] as string) || '22pt';
  const photoRadius = c['photoShape'] === 'none' ? '' : c['photoShape'] as string;

  const sbText = isDark ? '#CBD5E1' : '#fff';
  const sbTextSub = isDark ? '#94A3B8' : 'rgba(255,255,255,0.75)';
  const sbBg = isDark ? '#1E293B' : ac;

  const mainText = isDark ? '#E2E8F0' : '#111827';
  const subText  = isDark ? '#94A3B8' : '#4B5563';
  const bulletText = isDark ? '#CBD5E1' : '#374151';

  const baseFontSize = c['density'] === 'compact' ? '9pt' : c['density'] === 'airy' ? '11pt' : '10pt';
  const lineHeight = c['density'] === 'compact' ? '1.6' : c['density'] === 'airy' ? '1.8' : '1.7';
  const expGap = c['density'] === 'compact' ? '10px' : c['density'] === 'airy' ? '18px' : '14px';
  const bulletMargin = c['density'] === 'compact' ? '2px' : c['density'] === 'airy' ? '5px' : '3px';

  return `
/* ===== SEORA CUSTOM OVERRIDES ===== */
html, body {
  background: ${bg} !important;
  color: ${mainText} !important;
  font-family: ${font.body} !important;
  font-size: ${baseFontSize} !important;
}
:root { --ac: ${ac}; --bg: ${bg}; --text: ${mainText}; --br: ${br}; }
.hn, .mn, .sn { font-size: ${nameSize} !important; font-family: ${font.title} !important; color: ${isDark ? '#F8FAFC' : '#111827'} !important; }
.hr, .mr, .sr, .srole { color: ${ac} !important; }
.st, .stl, .ftl, .mst, .bt, .stt2, .stt-s, .stt { color: ${ac} !important; border-color: ${ac} !important; }
.ec, .xc { color: ${ac} !important; }
li { font-size: ${baseFontSize} !important; line-height: ${lineHeight} !important; margin-bottom: ${bulletMargin} !important; color: ${bulletText} !important; }
ul { margin-top: 5px !important; }
.et, .xt { font-size: 10.5pt !important; font-family: ${font.title} !important; color: ${mainText} !important; }
.xd, .ed { color: ${subText} !important; }
.edes, .xl2, .sl-l, .sll { color: ${subText} !important; }
.sm, .msm { font-size: 10pt !important; line-height: ${lineHeight} !important; color: ${subText} !important; }
.hc span, .mc span { color: ${subText} !important; font-size: 8.5pt !important; }
.xl { gap: ${expGap} !important; }
.sb, .h-r { background: ${sbBg} !important; border-color: ${ac} !important; }
.sb .sn, .sb .stt, .sb .stt-s, .sb .sl-n, .sb .sln { color: ${sbText} !important; font-family: ${font.title} !important; }
.sb .si, .sb .sk, .sb .sin, .sb .int-item, .sb .sl-l, .sb .sll, .sb .sv, .sb .bi { color: ${sbTextSub} !important; border-color: rgba(255,255,255,0.15) !important; }
.sb .sdiv, .sb .sl { background: rgba(255,255,255,0.2) !important; }
.sb .sr, .sb .srole { color: rgba(255,255,255,0.7) !important; }
.h-r .sk, .h-r .stt { color: ${sbText} !important; border-color: rgba(255,255,255,0.15) !important; }
${photoRadius ? `.hp, .sp { border-radius: ${photoRadius} !important; border-color: ${isDark ? ac : 'rgba(255,255,255,0.5)'} !important; }` : '.hp, .sp { display: none !important; }'}
.stag, .sk-pill, .xcard { border-radius: ${br} !important; }
.kv { color: ${ac} !important; font-size: 16pt !important; }
.kpis { background: ${isDark ? ac + '22' : ac + '10'} !important; border-color: ${ac + '30'} !important; }
.kl { color: ${isDark ? '#94A3B8' : '#374151'} !important; }
.stt::after, .mst::after, .stlne { ${dividerCSS || `background: ${ac + '50'} !important;`} }
.sep { background: ${ac} !important; }
.sdiv { background: rgba(255,255,255,0.2) !important; }
.deco { background: linear-gradient(90deg, ${ac}, ${ac}99, ${ac}) !important; }
.orn { color: ${ac} !important; }
.tricolor { background: ${ac} !important; }
${isDark ? `
  .b, .main, .aside, .htop, .exps-b { background: #0F172A !important; }
  .ede, .xt, .et, .ed-title { color: #F8FAFC !important; }
  .ft, .bot, .edu-sec, .bot { border-color: #1E293B !important; }
` : ''}
${!isDark ? `
  .dot { background: ${ac} !important; outline-color: ${ac} !important; }
  .tl .dot { border-color: ${bg} !important; }
` : ''}
.b, .main { padding-top: calc(12px * ${padMod}) !important; padding-bottom: calc(14px * ${padMod}) !important; }
.et, .ede, .mn, .hn, .ed, .xt { font-family: ${font.title} !important; }
body, li, .bi, .sk, .si, .ec, .hc span, .xd { font-family: ${font.body} !important; }
`;
}

export function getFontLink(choices: UserChoices = {}): string {
  const c = { ...getDefaults(), ...choices };
  return FONT_MAP[c['font'] as string]?.link || FONT_MAP['sans'].link;
}
