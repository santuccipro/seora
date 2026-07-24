import type { CvSectorKey } from '@/lib/cv-criteria';
import type { TplData } from './types';
import { tplClassicSober, tplNavySidebar, tplLegalClassic, tplAuditClean, tplCorporateBlue, tplImmobilierGreen, tplWealthMgmt, tplTechATS, tplDataSciPurple, tplCyberSec } from './t01-t10';
import { tplProductManager, tplMarketingCom, tplRHRecruit, tplCommerceB2B, tplLuxury, tplStartup, tplSante, tplEnseignement, tplIndustriel, tplFinancePublic } from './t11-t20';
import { tplCommunication, tplPharmacieRecherche, tplCreativeDesign, tplConseilStrat, tplRetail, tplDirection, tplRestauHotel, tplLogistique, tplITCloud, tplBusinessDev } from './t21-t30';
import { buildStyleOverride, getFontLink, getDefaults, CUSTOMIZATION_SCHEMA } from './customize';

export { buildStyleOverride, getFontLink, getDefaults, CUSTOMIZATION_SCHEMA };
export type { UserChoices } from './customize';
export type { TplData } from './types';

// suppress unused import warnings until all template files exist
void tplAuditClean; void tplCorporateBlue; void tplWealthMgmt; void tplDataSciPurple; void tplCyberSec;
void tplProductManager; void tplFinancePublic;
void tplCommunication; void tplPharmacieRecherche; void tplConseilStrat; void tplRetail; void tplDirection; void tplITCloud; void tplBusinessDev;

type TplFn = (d: TplData) => string;

const SECTOR_TEMPLATE_MAP: Record<CvSectorKey, TplFn> = {
  'banque-finance':           tplClassicSober,
  'conseil-strategie':        tplNavySidebar,
  'juridique':                tplLegalClassic,
  'tech-dev':                 tplTechATS,
  'marketing-communication':  tplMarketingCom,
  'design-creation':          tplCreativeDesign,
  'sante-medical':            tplSante,
  'luxe-mode':                tplLuxury,
  'industrie-ingenierie':     tplIndustriel,
  'commerce-vente':           tplCommerceB2B,
  'immobilier':               tplImmobilierGreen,
  'rh-recrutement':           tplRHRecruit,
  'education-formation':      tplEnseignement,
  'hotellerie-restauration':  tplRestauHotel,
  'logistique-supply':        tplLogistique,
  'generique':                tplStartup,
};

export function getTemplateFn(sector: CvSectorKey): TplFn {
  return SECTOR_TEMPLATE_MAP[sector] ?? tplStartup;
}

export function applyCustomize(html: string, choices: Record<string, string | boolean> = {}): string {
  const css = buildStyleOverride(choices);
  const fontLink = getFontLink(choices);
  return html.replace('</head>', `<link href="${fontLink}" rel="stylesheet"><style>${css}</style></head>`);
}
