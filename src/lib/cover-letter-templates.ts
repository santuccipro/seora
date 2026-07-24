export interface CoverLetterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  date: string;
  recipientName?: string;
  recipientTitle?: string;
  companyName: string;
  companyAddress?: string;
  subject: string;
  paragraphs: string[];
  closing: string;
  signature: string;
  accent: string;
  photo?: string;
}

/* ── Template 1: Sober — Finance / Conseil / Juridique ─────────────────────── */
export function tplSoberLetter(d: CoverLetterData): string {
  const ac = d.accent;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:210mm;height:297mm;overflow:hidden;background:#fff;color:#111;font-family:'EB Garamond',Georgia,serif}
.wrap{display:flex;flex-direction:column;height:297mm;padding:22mm 20mm 18mm 23mm}
.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10mm}
.sender{font-family:'Inter',sans-serif;font-size:8.5pt;color:#444;line-height:1.7;border-left:3px solid ${ac};padding-left:10px}
.sender-name{font-size:10pt;font-weight:600;color:#111;margin-bottom:2px}
.recipient-block{text-align:right;font-family:'Inter',sans-serif;font-size:8.5pt;color:#444;line-height:1.7}
.recipient-name{font-weight:600;color:#111}
.date-line{font-family:'Inter',sans-serif;font-size:8.5pt;color:#666;text-align:right;margin-bottom:7mm}
.divider{height:1px;background:${ac};margin-bottom:7mm}
.subject{font-family:'Inter',sans-serif;font-size:9pt;font-weight:700;color:${ac};margin-bottom:8mm;letter-spacing:0.3px}
.body{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.salutation{font-size:11pt;margin-bottom:5mm;font-style:italic;color:#333}
.paras p{font-size:11pt;line-height:1.75;text-align:justify;margin-bottom:5mm;color:#1a1a1a}
.closing-block{margin-top:auto;padding-top:6mm}
.closing{font-size:11pt;font-style:italic;color:#333;margin-bottom:6mm;line-height:1.6}
.sig-line{width:40mm;height:1px;background:${ac};margin-bottom:3mm}
.sig{font-family:'Inter',sans-serif;font-size:9pt;font-weight:600;color:#111;letter-spacing:0.5px}
</style></head><body>
<div class="wrap">
  <div class="top">
    <div class="sender">
      <div class="sender-name">${d.firstName} ${d.lastName}</div>
      <div>${d.email}</div>
      <div>${d.phone}</div>
      <div>${d.city}</div>
    </div>
    <div class="recipient-block">
      ${d.recipientName ? `<div class="recipient-name">${d.recipientName}</div>` : ''}
      ${d.recipientTitle ? `<div>${d.recipientTitle}</div>` : ''}
      <div style="font-weight:600;margin-top:2px">${d.companyName}</div>
      ${d.companyAddress ? `<div>${d.companyAddress}</div>` : ''}
    </div>
  </div>
  <div class="date-line">${d.date}</div>
  <div class="divider"></div>
  <div class="subject">Objet : ${d.subject}</div>
  <div class="body">
    <div>
      <div class="salutation">${d.recipientName ? `${d.recipientName},` : 'Madame, Monsieur,'}</div>
      <div class="paras">${d.paragraphs.map(p => `<p>${p}</p>`).join('')}</div>
    </div>
    <div class="closing-block">
      <div class="closing">${d.closing}</div>
      <div class="sig-line"></div>
      <div class="sig">${d.signature}</div>
    </div>
  </div>
</div>
</body></html>`;
}

/* ── Template 2: Modern — Tech / RH / Commerce ─────────────────────────────── */
export function tplModernLetter(d: CoverLetterData): string {
  const ac = d.accent;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:210mm;height:297mm;overflow:hidden;background:#fff;font-family:'Inter',sans-serif}
.header{background:${ac};height:58px;display:flex;align-items:center;padding:0 22mm;flex-shrink:0}
.hname{font-size:15pt;font-weight:700;color:#fff;letter-spacing:0.5px}
.meta{display:flex;justify-content:space-between;padding:5mm 22mm 0;font-size:7.5pt;color:#555;border-bottom:1px solid #e5e7eb;padding-bottom:4mm;margin-bottom:5mm}
.meta-left span{display:block;line-height:1.7}
.meta-right{text-align:right}
.meta-right span{display:block;line-height:1.7}
.rname{font-weight:600;color:#111}
.wrap{padding:0 22mm;display:flex;flex-direction:column;height:calc(297mm - 58px - 22mm)}
.subject-bar{display:flex;align-items:center;gap:8px;margin-bottom:6mm}
.subject-bar::before{content:'';width:4px;height:16px;background:${ac};border-radius:2px;flex-shrink:0}
.subject-text{font-size:9pt;font-weight:700;color:${ac};letter-spacing:0.3px}
.salutation{font-size:10.5pt;color:#333;margin-bottom:4mm;font-style:italic}
.body-text{flex:1}
.body-text p{font-size:10.5pt;line-height:1.72;color:#1f2937;margin-bottom:4.5mm;padding-left:4px}
.closing-block{margin-top:auto;padding-top:5mm;border-top:1px solid #f3f4f6}
.closing{font-size:10pt;color:#555;font-style:italic;margin-bottom:5mm;line-height:1.6}
.footer{display:flex;justify-content:space-between;align-items:flex-end}
.sig{font-size:9.5pt;font-weight:700;color:#111;letter-spacing:1.5px;text-transform:uppercase}
.footer-accent{width:30mm;height:2px;background:${ac}}
</style></head><body>
<div class="header"><div class="hname">${d.firstName} ${d.lastName}</div></div>
<div class="meta">
  <div class="meta-left">
    <span>${d.email}</span>
    <span>${d.phone}</span>
    <span>${d.city}</span>
  </div>
  <div class="meta-right">
    <span>${d.date}</span>
    ${d.recipientName ? `<span class="rname">${d.recipientName}</span>` : ''}
    ${d.recipientTitle ? `<span>${d.recipientTitle}</span>` : ''}
    <span style="font-weight:600">${d.companyName}</span>
  </div>
</div>
<div class="wrap">
  <div class="subject-bar"><span class="subject-text">Objet : ${d.subject}</span></div>
  <div class="salutation">${d.recipientName ? `${d.recipientName},` : 'Madame, Monsieur,'}</div>
  <div class="body-text">${d.paragraphs.map(p => `<p>${p}</p>`).join('')}</div>
  <div class="closing-block">
    <div class="closing">${d.closing}</div>
    <div class="footer">
      <div class="sig">${d.signature}</div>
      <div class="footer-accent"></div>
    </div>
  </div>
</div>
</body></html>`;
}

/* ── Template 3: Creative — Design / Marketing / Communication ──────────────── */
export function tplCreativeLetter(d: CoverLetterData): string {
  const ac = d.accent;
  const firstLetter = d.paragraphs[0]?.[0] ?? 'J';
  const firstParaRest = d.paragraphs[0]?.slice(1) ?? '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:210mm;height:297mm;overflow:hidden;background:#fff;display:flex}
.sidebar{width:48px;background:${ac};flex-shrink:0}
.main{flex:1;display:flex;flex-direction:column;padding:18mm 18mm 16mm 14mm}
.top-name{font-family:'Playfair Display',serif;font-size:20pt;font-weight:700;color:#111;letter-spacing:0.5px;margin-bottom:2mm}
.top-contact{font-family:'Inter',sans-serif;font-size:7.5pt;color:#777;line-height:1.8;margin-bottom:5mm;display:flex;gap:14px;flex-wrap:wrap}
.divider{height:1.5px;background:#e5e7eb;margin-bottom:5mm;position:relative}
.divider::after{content:'';position:absolute;left:0;top:0;width:30mm;height:1.5px;background:${ac}}
.recipient-date{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5mm}
.recip{font-family:'Inter',sans-serif;font-size:8pt;color:#444;line-height:1.7}
.recip-name{font-weight:600;color:#111}
.date-txt{font-family:'Inter',sans-serif;font-size:8pt;color:#777}
.subject{font-family:'Inter',sans-serif;font-size:8.5pt;font-weight:600;color:${ac};margin-bottom:5mm;letter-spacing:0.3px}
.salutation{font-family:'Playfair Display',serif;font-style:italic;font-size:10.5pt;color:#333;margin-bottom:4mm}
.body-text{flex:1}
.drop-cap{font-family:'Playfair Display',serif;font-size:30pt;font-weight:700;color:${ac};float:left;line-height:0.8;margin-right:4px;margin-top:4px}
.first-para{font-size:10.5pt;line-height:1.75;color:#1f2937;margin-bottom:4mm;overflow:hidden}
.body-text p{font-size:10.5pt;line-height:1.75;color:#1f2937;margin-bottom:4mm}
.closing-block{margin-top:auto}
.closing{font-size:10pt;font-family:'Playfair Display',serif;font-style:italic;color:#444;margin-bottom:5mm;line-height:1.65}
.sig{font-family:'Inter',sans-serif;font-size:9pt;font-weight:600;color:#111;letter-spacing:0.8px}
</style></head><body>
<div class="sidebar"></div>
<div class="main">
  <div class="top-name">${d.firstName} ${d.lastName}</div>
  <div class="top-contact">
    <span>${d.email}</span><span>${d.phone}</span><span>${d.city}</span>
  </div>
  <div class="divider"></div>
  <div class="recipient-date">
    <div class="recip">
      ${d.recipientName ? `<div class="recip-name">${d.recipientName}</div>` : ''}
      ${d.recipientTitle ? `<div>${d.recipientTitle}</div>` : ''}
      <div style="font-weight:600">${d.companyName}</div>
      ${d.companyAddress ? `<div>${d.companyAddress}</div>` : ''}
    </div>
    <div class="date-txt">${d.date}</div>
  </div>
  <div class="subject">Objet : ${d.subject}</div>
  <div class="salutation">${d.recipientName ? `${d.recipientName},` : 'Madame, Monsieur,'}</div>
  <div class="body-text">
    <div class="first-para"><span class="drop-cap">${firstLetter}</span>${firstParaRest}</div>
    ${d.paragraphs.slice(1).map(p => `<p>${p}</p>`).join('')}
  </div>
  <div class="closing-block">
    <div class="closing">${d.closing}</div>
    <div class="sig">${d.signature}</div>
  </div>
</div>
</body></html>`;
}

/* ── Template 4: Editorial — Luxe / Prestige / Hôtellerie ──────────────────── */
export function tplEditorialLetter(d: CoverLetterData): string {
  const ac = d.accent;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:210mm;height:297mm;overflow:hidden;background:#fff;font-family:'EB Garamond',Georgia,serif;color:#1a1a1a}
.accent-top{height:1.5px;background:${ac};width:100%}
.wrap{display:flex;flex-direction:column;height:calc(297mm - 1.5px);padding:16mm 24mm 14mm}
.name-block{text-align:center;margin-bottom:5mm}
.big-name{font-size:22pt;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#111;line-height:1}
.contact-line{font-size:8pt;color:#888;letter-spacing:1.5px;margin-top:3mm;text-transform:uppercase}
.hr{display:flex;align-items:center;gap:8px;margin:5mm 0}
.hr-line{flex:1;height:0.5px;background:#d1d5db}
.hr-dot{width:5px;height:5px;border-radius:50%;background:${ac};flex-shrink:0}
.header-info{display:flex;justify-content:space-between;margin-bottom:7mm}
.recip-block{border-left:2px solid ${ac};padding-left:10px;font-size:9pt;color:#333;line-height:1.8}
.recip-block .rn{font-weight:600;color:#111}
.date-right{font-size:9pt;color:#888;font-style:italic;text-align:right;align-self:flex-start;margin-top:2px}
.subject{font-size:9.5pt;font-weight:600;color:${ac};margin-bottom:7mm;letter-spacing:0.3px}
.salutation{font-size:11.5pt;font-style:italic;color:#333;margin-bottom:6mm}
.body-text{flex:1}
.body-text p{font-size:11.5pt;line-height:1.88;color:#1a1a1a;text-align:justify;margin-bottom:5.5mm}
.closing-wrap{margin-top:auto;text-align:center}
.closing{font-size:10.5pt;font-style:italic;color:#555;line-height:1.7;margin-bottom:5mm}
.sig-hr{width:28mm;height:0.5px;background:${ac};margin:0 auto 3mm}
.sig{font-size:9.5pt;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#111}
</style></head><body>
<div class="accent-top"></div>
<div class="wrap">
  <div class="name-block">
    <div class="big-name">${d.firstName} ${d.lastName}</div>
    <div class="contact-line">${[d.email, d.phone, d.city].filter(Boolean).join('  ·  ')}</div>
  </div>
  <div class="hr"><div class="hr-line"></div><div class="hr-dot"></div><div class="hr-line"></div></div>
  <div class="header-info">
    <div class="recip-block">
      ${d.recipientName ? `<div class="rn">${d.recipientName}</div>` : ''}
      ${d.recipientTitle ? `<div>${d.recipientTitle}</div>` : ''}
      <div style="font-weight:600">${d.companyName}</div>
      ${d.companyAddress ? `<div>${d.companyAddress}</div>` : ''}
    </div>
    <div class="date-right">${d.date}</div>
  </div>
  <div class="subject">Objet : ${d.subject}</div>
  <div class="salutation">${d.recipientName ? `${d.recipientName},` : 'Madame, Monsieur,'}</div>
  <div class="body-text">${d.paragraphs.map(p => `<p>${p}</p>`).join('')}</div>
  <div class="closing-wrap">
    <div class="closing">${d.closing}</div>
    <div class="sig-hr"></div>
    <div class="sig">${d.signature}</div>
  </div>
</div>
</body></html>`;
}

/* ── Sector → template mapping ─────────────────────────────────────────────── */
export type CoverLetterTemplateKey = 'sober' | 'modern' | 'creative' | 'editorial';

export const SECTOR_LETTER_MAP: Record<string, CoverLetterTemplateKey> = {
  'banque-finance':           'sober',
  'conseil-strategie':        'sober',
  'juridique':                'sober',
  'tech-dev':                 'modern',
  'marketing-communication':  'creative',
  'design-creation':          'creative',
  'sante-medical':            'sober',
  'luxe-mode':                'editorial',
  'industrie-ingenierie':     'modern',
  'commerce-vente':           'modern',
  'immobilier':               'modern',
  'rh-recrutement':           'modern',
  'education-formation':      'sober',
  'hotellerie-restauration':  'editorial',
  'logistique-supply':        'modern',
  'generique':                'modern',
};

const TPL_MAP: Record<CoverLetterTemplateKey, (d: CoverLetterData) => string> = {
  sober:     tplSoberLetter,
  modern:    tplModernLetter,
  creative:  tplCreativeLetter,
  editorial: tplEditorialLetter,
};

export function getLetterTemplateFn(sector: string): (d: CoverLetterData) => string {
  const key = SECTOR_LETTER_MAP[sector] ?? 'modern';
  return TPL_MAP[key];
}
