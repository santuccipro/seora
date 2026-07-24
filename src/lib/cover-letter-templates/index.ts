export interface CoverLetterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  date: string;
  companyName: string;
  companyAddress?: string;
  recipientName?: string;
  targetRole?: string;
  subject: string;
  paragraphs: string[];
  closing: string;
  signature?: string;
  accent?: string;
}

// ─── Sober (Banque, Conseil, Juridique, Santé, Industrie) ─────────────────
export function tplSoberLetter(d: CoverLetterData): string {
  const ac = d.accent ?? "#0B1F3F";
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:210mm;height:297mm;overflow:hidden;font-family:'EB Garamond',Georgia,serif;font-size:11pt;color:#111;background:#fff}
.wrap{padding:36px 48px 32px;height:100%;display:flex;flex-direction:column}
.header{border-bottom:2px solid ${ac};padding-bottom:14px;margin-bottom:18px}
.name{font-size:20pt;font-weight:700;letter-spacing:1px;color:${ac};text-transform:uppercase}
.contact{font-family:'Inter',sans-serif;font-size:8pt;color:#555;margin-top:6px;display:flex;gap:18px;flex-wrap:wrap}
.date-line{font-size:9.5pt;color:#555;font-style:italic;margin-bottom:16px;text-align:right;font-family:'Inter',sans-serif}
.dest{margin-bottom:18px}
.dest-co{font-weight:700;font-size:10.5pt;color:${ac}}
.subject{font-weight:700;font-size:10.5pt;margin-bottom:18px;padding:8px 12px;border-left:3px solid ${ac};background:#f8f8f8}
.salut{margin-bottom:14px;font-size:10.5pt}
.para{font-size:10.5pt;line-height:1.75;margin-bottom:14px;text-align:justify}
.closing{margin-top:20px}
.clos-text{font-size:10.5pt;margin-bottom:18px}
.sig{font-family:'EB Garamond',serif;font-size:12pt;font-weight:700;color:${ac}}
</style></head><body>
<div class="wrap">
  <div class="header">
    <div class="name">${d.firstName} ${d.lastName}</div>
    <div class="contact">
      ${[d.email, d.phone, d.city].filter(Boolean).map(t => `<span>${t}</span>`).join('')}
    </div>
  </div>
  <div class="date-line">${d.city}, le ${d.date}</div>
  <div class="dest"><div class="dest-co">${d.companyName}</div></div>
  <div class="subject">Objet : ${d.subject}</div>
  <div class="salut">Madame, Monsieur,</div>
  ${d.paragraphs.map(p => `<div class="para">${p}</div>`).join('')}
  <div class="closing">
    <div class="clos-text">${d.closing}</div>
    <div class="sig">${d.firstName} ${d.lastName}</div>
  </div>
</div>
</body></html>`;
}

// ─── Modern (Tech, Commerce, RH, Immobilier) ──────────────────────────────
export function tplModernLetter(d: CoverLetterData): string {
  const ac = d.accent ?? "#1E293B";
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:210mm;height:297mm;overflow:hidden;font-family:'Inter',sans-serif;font-size:10pt;color:#1F2937;background:#fff}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:6px;background:${ac}}
.wrap{padding:36px 48px 32px 54px;height:100%;display:flex;flex-direction:column}
.name{font-size:22pt;font-weight:700;color:${ac};letter-spacing:-0.5px;line-height:1}
.role{font-size:10pt;color:#6B7280;margin-top:3px;font-weight:500}
.contact{font-size:8pt;color:#6B7280;margin-top:8px;display:flex;gap:16px;flex-wrap:wrap}
.divider{height:1px;background:#E5E7EB;margin:14px 0}
.meta{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.dest-co{font-weight:700;font-size:10pt;color:${ac}}
.date-txt{font-size:8.5pt;color:#9CA3AF}
.subject{font-size:10pt;font-weight:600;color:${ac};margin-bottom:14px;padding:6px 10px;background:${ac}10;border-radius:4px}
.salut{margin-bottom:12px;font-size:10pt;color:#374151}
.para{font-size:10pt;line-height:1.7;margin-bottom:13px;color:#374151}
.closing{margin-top:18px}
.clos-text{font-size:10pt;margin-bottom:14px;color:#374151}
.sig{font-size:12pt;font-weight:700;color:${ac}}
</style></head><body>
<div class="sidebar"></div>
<div class="wrap">
  <div class="name">${d.firstName} ${d.lastName}</div>
  <div class="role">${d.targetRole}</div>
  <div class="contact">${[d.email, d.phone, d.city].filter(Boolean).map(t => `<span>${t}</span>`).join('')}</div>
  <div class="divider"></div>
  <div class="meta">
    <div class="dest-co">${d.companyName}</div>
    <div class="date-txt">${d.city}, le ${d.date}</div>
  </div>
  <div class="subject">Objet : ${d.subject}</div>
  <div class="salut">Madame, Monsieur,</div>
  ${d.paragraphs.map(p => `<div class="para">${p}</div>`).join('')}
  <div class="closing">
    <div class="clos-text">${d.closing}</div>
    <div class="sig">${d.firstName} ${d.lastName}</div>
  </div>
</div>
</body></html>`;
}

// ─── Creative (Marketing, Communication, Design) ─────────────────────────
export function tplCreativeLetter(d: CoverLetterData): string {
  const ac = d.accent ?? "#FF6B2B";
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:210mm;height:297mm;overflow:hidden;font-family:'DM Sans',sans-serif;font-size:10pt;color:#111;background:#fff}
.header-band{background:${ac};padding:24px 48px 20px;color:#fff}
.name{font-size:21pt;font-weight:700;letter-spacing:-0.5px}
.role{font-size:10pt;opacity:0.85;margin-top:2px}
.contact{font-size:8pt;opacity:0.8;margin-top:8px;display:flex;gap:16px;flex-wrap:wrap}
.wrap{padding:24px 48px 28px;display:flex;flex-direction:column;height:calc(100% - 92px)}
.meta{display:flex;justify-content:space-between;margin-bottom:16px}
.dest-co{font-weight:700;font-size:10pt;color:${ac}}
.date-txt{font-size:8.5pt;color:#9CA3AF}
.subject{font-size:10pt;font-weight:700;color:${ac};margin-bottom:14px}
.salut{margin-bottom:12px;font-size:10pt}
.para{font-size:10pt;line-height:1.7;margin-bottom:12px;color:#374151}
.closing{margin-top:16px}
.clos-text{font-size:10pt;margin-bottom:14px;color:#374151}
.sig{font-size:13pt;font-weight:700;color:${ac}}
.deco{width:40px;height:3px;background:${ac};margin:10px 0}
</style></head><body>
<div class="header-band">
  <div class="name">${d.firstName} ${d.lastName}</div>
  <div class="role">${d.targetRole}</div>
  <div class="contact">${[d.email, d.phone, d.city].filter(Boolean).map(t => `<span>${t}</span>`).join('')}</div>
</div>
<div class="wrap">
  <div class="meta">
    <div class="dest-co">${d.companyName}</div>
    <div class="date-txt">${d.city}, le ${d.date}</div>
  </div>
  <div class="subject">Objet : ${d.subject}</div>
  <div class="salut">Madame, Monsieur,</div>
  ${d.paragraphs.map(p => `<div class="para">${p}</div>`).join('')}
  <div class="closing">
    <div class="deco"></div>
    <div class="clos-text">${d.closing}</div>
    <div class="sig">${d.firstName} ${d.lastName}</div>
  </div>
</div>
</body></html>`;
}

// ─── Editorial (Luxe, Hôtellerie, Design haut de gamme) ─────────────────
export function tplEditorialLetter(d: CoverLetterData): string {
  const ac = d.accent ?? "#000000";
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:210mm;height:297mm;overflow:hidden;font-family:'Cormorant Garamond',Georgia,serif;font-size:11pt;color:#111;background:#fff}
.wrap{padding:48px 60px 40px;height:100%;display:flex;flex-direction:column}
.top-rule{height:1px;background:#111;margin-bottom:4px}
.top-accent{height:3px;width:60px;background:${ac};margin-bottom:28px}
.name{font-size:26pt;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${ac}}
.role{font-size:11pt;font-style:italic;color:#555;margin-top:4px}
.contact{font-family:'Inter',sans-serif;font-size:8pt;color:#777;margin-top:10px;display:flex;gap:16px}
.divider{height:1px;background:#ddd;margin:18px 0}
.meta{display:flex;justify-content:space-between;margin-bottom:20px}
.dest-co{font-weight:700;font-size:11pt}
.date-txt{font-family:'Inter',sans-serif;font-size:8.5pt;color:#999;font-style:italic}
.subject{font-size:11pt;font-weight:500;margin-bottom:18px;letter-spacing:0.3px}
.salut{margin-bottom:16px;font-size:11pt}
.para{font-size:11pt;line-height:1.8;margin-bottom:15px;text-align:justify}
.closing{margin-top:22px}
.clos-text{font-size:11pt;margin-bottom:20px;font-style:italic}
.sig{font-size:14pt;font-weight:700;letter-spacing:1px}
</style></head><body>
<div class="wrap">
  <div class="top-rule"></div>
  <div class="top-accent"></div>
  <div class="name">${d.firstName} ${d.lastName}</div>
  <div class="role">${d.targetRole}</div>
  <div class="contact">${[d.email, d.phone, d.city].filter(Boolean).map(t => `<span>${t}</span>`).join('')}</div>
  <div class="divider"></div>
  <div class="meta">
    <div class="dest-co">${d.companyName}</div>
    <div class="date-txt">${d.city}, le ${d.date}</div>
  </div>
  <div class="subject">Objet : ${d.subject}</div>
  <div class="salut">Madame, Monsieur,</div>
  ${d.paragraphs.map(p => `<div class="para">${p}</div>`).join('')}
  <div class="closing">
    <div class="clos-text">${d.closing}</div>
    <div class="sig">${d.firstName} ${d.lastName}</div>
  </div>
</div>
</body></html>`;
}

// ─── Sector → default template + accent ──────────────────────────────────
export function getSectorLetterDefaults(sector: string): { style: "sober" | "modern" | "creative" | "editorial"; accent: string } {
  const map: Record<string, { style: "sober" | "modern" | "creative" | "editorial"; accent: string }> = {
    "banque-finance":          { style: "sober",    accent: "#0B1F3F" },
    "conseil-strategie":       { style: "sober",    accent: "#000000" },
    "juridique":               { style: "sober",    accent: "#1B2A44" },
    "sante-medical":           { style: "sober",    accent: "#0F5EA8" },
    "industrie-ingenierie":    { style: "sober",    accent: "#1F4E79" },
    "logistique-supply":       { style: "sober",    accent: "#1E3A8A" },
    "education-formation":     { style: "sober",    accent: "#1E40AF" },
    "tech-dev":                { style: "modern",   accent: "#1E293B" },
    "commerce-vente":          { style: "modern",   accent: "#DC2626" },
    "immobilier":              { style: "modern",   accent: "#0F766E" },
    "rh-recrutement":          { style: "modern",   accent: "#7C3AED" },
    "marketing-communication": { style: "creative", accent: "#FF6B2B" },
    "design-creation":         { style: "creative", accent: "#111111" },
    "luxe-mode":               { style: "editorial", accent: "#000000" },
    "hotellerie-restauration": { style: "editorial", accent: "#7C2D12" },
  };
  return map[sector] ?? { style: "modern", accent: "#4F46E5" };
}

export function renderLetterHtml(data: CoverLetterData, style: "sober" | "modern" | "creative" | "editorial"): string {
  switch (style) {
    case "creative":  return tplCreativeLetter(data);
    case "editorial": return tplEditorialLetter(data);
    case "modern":    return tplModernLetter(data);
    default:          return tplSoberLetter(data);
  }
}
