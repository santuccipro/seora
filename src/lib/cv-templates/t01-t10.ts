// 30 CV templates — layout builders (T01-T10)
// Each function returns an HTML string for a specific sector
import type { TplData } from './types'

export function tplClassicSober(d: TplData): string {
  // T01 Banque invest/M&A — Playfair Display + Inter, navy/or, premium 2025
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  const NAVY='#0F2744',GOLD='#B8922B';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1A1A2E;background:#FAFAF8}
.h{padding:24px 40px 16px;display:flex;justify-content:space-between;align-items:flex-start;background:#fff;border-bottom:2px solid ${NAVY};flex-shrink:0}
.hn{font-family:'Playfair Display',serif;font-size:24pt;font-weight:700;color:${NAVY};letter-spacing:-.3px;line-height:1}
.hr{font-size:10pt;font-style:italic;color:${GOLD};margin-top:5px;font-family:'Playfair Display',serif;font-weight:400}
.hc{margin-top:9px;font-size:7.8pt;color:#555;display:flex;flex-wrap:wrap;gap:0 16px}
.hc span{padding-right:16px;border-right:1px solid #ddd}
.hc span:last-child{border-right:none}
.hp{width:68px;height:68px;border-radius:50%;object-fit:cover;border:2px solid ${GOLD};flex-shrink:0}
.gold-line{height:2px;background:linear-gradient(90deg,${NAVY} 0%,${GOLD} 40%,${NAVY} 100%);flex-shrink:0}
.b{flex:1;padding:16px 40px 14px;display:flex;flex-direction:column;justify-content:space-between;background:#fff}
.sm{font-size:9pt;line-height:1.7;font-style:italic;color:#444;border-left:3px solid ${GOLD};padding-left:11px}
.sec{display:flex;align-items:center;gap:10px;margin-bottom:8px;margin-top:14px}
.sec-t{font-family:'Inter',sans-serif;font-size:6.5pt;letter-spacing:2.5px;text-transform:uppercase;font-weight:700;color:${NAVY};white-space:nowrap}
.sec-l{flex:1;height:1px;background:${GOLD};opacity:.4}
.xl{display:flex;flex-direction:column;gap:11px}
.xh{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:2px}
.xt{font-family:'Playfair Display',serif;font-weight:600;font-size:10pt;color:${NAVY}}
.xi{font-weight:400;font-size:9pt;color:#4A4A4A}
.xd{font-size:7pt;color:#999;white-space:nowrap;flex-shrink:0;margin-top:3px;background:#F5F0E8;padding:1.5px 6px;border-radius:3px}
.xl2{font-size:7.8pt;color:#666;margin-bottom:3px;font-style:italic}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.5pt;line-height:1.65;margin-bottom:2px;color:#333;position:relative;padding-left:12px}
li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:${GOLD}}
.edu-l{display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.ede{font-family:'Playfair Display',serif;font-weight:600;font-size:9.5pt;color:${NAVY}}
.edes{font-size:8pt;font-style:italic;color:#555;margin-top:1px}
.bottom{display:flex;border-top:1px solid #E8DFC8;padding-top:12px;gap:0}
.bc{flex:1;padding-right:16px}
.bc+.bc{border-left:1px solid #EDE8DC;padding-left:16px}
.bt{font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${NAVY};margin-bottom:7px}
.bi{font-size:8pt;line-height:1.55;color:#333;margin-bottom:3px;position:relative;padding-left:10px}
.bi::before{content:'';position:absolute;left:0;top:5px;width:4px;height:4px;border-radius:50%;background:${GOLD}}
.bi em{font-style:italic;color:#777;font-size:7.5pt}
.qr-wrap{border-left:1px solid #EDE8DC;padding-left:16px;display:flex;flex-direction:column;align-items:center;justify-content:center}
.qr-lbl{font-size:6pt;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
</style></head><body>
<div class="h">
  <div>
    <div class="hn">${firstName} ${lastName}</div>
    <div class="hr">${role}</div>
    <div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div>
  </div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:`<div style="width:68px;height:68px;border-radius:50%;background:#F5F0E8;border:2px solid ${GOLD};flex-shrink:0"></div>`}
</div>
<div class="gold-line"></div>
<div class="b">
  ${summary?`<div class="sm" style="margin-bottom:4px">${summary}</div>`:''}
  <div>
    <div class="sec"><div class="sec-t">Expériences professionnelles</div><div class="sec-l"></div></div>
    <div class="xl">${experiences.map(e=>`<div><div class="xh"><div><div class="xt">${e.title} <span class="xi">— ${e.company}</span></div><div class="xl2">${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
  </div>
  <div>
    <div class="sec"><div class="sec-t">Formations</div><div class="sec-l"></div></div>
    <div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div>
  </div>
  <div class="bottom">
    <div class="bc"><div class="bt">Compétences</div>${skills.map(s=>`<div class="bi">${s}</div>`).join('')}</div>
    <div class="bc"><div class="bt">Langues</div>${languages.map(l=>`<div class="bi">${l.name} <em>— ${l.level}</em></div>`).join('')}</div>
    <div class="bc"><div class="bt">Intérêts</div>${interests.map(i=>`<div class="bi">${i}</div>`).join('')}</div>
    ${qrSvg?`<div class="qr-wrap"><div class="qr-lbl">LinkedIn</div><div style="width:52px;height:52px;background:#F5F0E8;padding:3px;border-radius:3px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplNavySidebar(d: TplData): string {
  // T02 Conseil strat — Space Grotesk + Inter, navy #0D1B2A / teal #1AB5A3, sidebar premium 2025
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  const NAVY='#0D1B2A',TEAL='#1AB5A3';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1E293B;background:#fff}
.sb{width:168px;background:${NAVY};flex-shrink:0;display:flex;flex-direction:column;padding:0 0 20px}
.sb-top{background:linear-gradient(180deg,#152233 0%,${NAVY} 100%);padding:24px 18px 18px}
.sp{width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid ${TEAL};display:block;margin:0 auto 12px}
.sp-ph{width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.07);border:2px solid ${TEAL};margin:0 auto 12px}
.sb-body{padding:0 18px;flex:1;display:flex;flex-direction:column;gap:16px;margin-top:14px}
.sdiv{height:1px;background:rgba(255,255,255,.1)}
.stt{font-family:'Space Grotesk',sans-serif;font-size:6pt;letter-spacing:2px;text-transform:uppercase;color:${TEAL};font-weight:600;margin-bottom:8px}
.si{font-size:7.5pt;color:#94A3B8;margin-bottom:4px;line-height:1.4;word-break:break-all}
.sk{font-size:7.5pt;color:#CBD5E1;position:relative;padding-left:10px;margin-bottom:5px}
.sk::before{content:'';position:absolute;left:0;top:5px;width:4px;height:4px;border-radius:50%;background:${TEAL}}
.sl-n{font-family:'Space Grotesk',sans-serif;font-size:8pt;color:#F1F5F9;font-weight:500;margin-bottom:1px}
.sl-l{font-size:7pt;color:#64748B;margin-bottom:6px}
.sin{font-size:7.5pt;color:#64748B;position:relative;padding-left:10px;margin-bottom:4px}
.sin::before{content:'';position:absolute;left:0;top:5px;width:4px;height:4px;border-radius:50%;background:rgba(26,181,163,.4)}
.qr-sb{margin-top:auto;padding:0 18px 0;display:flex;flex-direction:column;align-items:center}
.qr-lbl{font-size:5.5pt;color:#334155;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
.main{flex:1;display:flex;flex-direction:column;padding:0}
.mhdr{padding:22px 26px 14px;border-bottom:2px solid ${NAVY}}
.mn{font-family:'Space Grotesk',sans-serif;font-size:20pt;font-weight:700;color:${NAVY};line-height:1;letter-spacing:-.4px}
.mr{font-size:9.5pt;color:${TEAL};font-weight:500;margin-top:5px;font-family:'Space Grotesk',sans-serif}
.teal-bar{height:3px;background:${TEAL};width:40px;margin-top:8px;border-radius:2px}
.mbody{flex:1;padding:14px 26px 16px;display:flex;flex-direction:column;justify-content:space-between}
.msm{font-size:8.5pt;line-height:1.65;color:#475569;font-style:italic;border-left:2px solid ${TEAL};padding-left:10px}
.mst{font-family:'Space Grotesk',sans-serif;font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${NAVY};display:flex;align-items:center;gap:8px;margin-bottom:8px;margin-top:13px}
.mst::after{content:'';flex:1;height:1px;background:#E2E8F0}
.exps{display:flex;flex-direction:column;gap:10px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:9pt;color:${NAVY}}
.ec{font-size:7.8pt;color:#64748B;margin-top:1px}
.ed{font-size:6.8pt;color:#fff;background:${TEAL};white-space:nowrap;flex-shrink:0;padding:2px 7px;border-radius:10px;align-self:flex-start;font-family:'Space Grotesk',sans-serif;font-weight:500}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8pt;line-height:1.6;margin-bottom:2px;color:#475569;position:relative;padding-left:12px}
li::before{content:'';position:absolute;left:0;top:6px;width:4px;height:4px;border-radius:50%;background:${TEAL}}
.edu-sec{}
.edl{display:flex;flex-direction:column;gap:7px}
.edu-r{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.ede{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:8.5pt;color:${NAVY}}
.edes{font-size:7.5pt;color:#64748B;margin-top:1px}
</style></head><body>
<div class="sb">
  <div class="sb-top">
    ${photo?`<img class="sp" src="${photo}" onerror="this.style.display='none'"/>`:`<div class="sp-ph"></div>`}
    <div style="font-family:'Space Grotesk',sans-serif;font-size:11pt;font-weight:700;color:#fff;text-align:center;line-height:1.2">${firstName}<br>${lastName}</div>
    <div style="font-size:7pt;color:${TEAL};text-align:center;margin-top:4px;font-weight:500">${role}</div>
  </div>
  <div class="sb-body">
    <div><div class="stt">Contact</div>${[email,phone,city,linkedin].filter(Boolean).map(t=>`<div class="si">${t}</div>`).join('')}</div>
    <div class="sdiv"></div>
    <div><div class="stt">Compétences</div>${skills.map(s=>`<div class="sk">${s}</div>`).join('')}</div>
    <div class="sdiv"></div>
    <div><div class="stt">Langues</div>${languages.map(l=>`<div><div class="sl-n">${l.name}</div><div class="sl-l">${l.level}</div></div>`).join('')}</div>
    ${interests.length?`<div class="sdiv"></div><div><div class="stt">Intérêts</div>${interests.map(i=>`<div class="sin">${i}</div>`).join('')}</div>`:''}
    ${qrSvg?`<div class="qr-sb"><div class="qr-lbl">LinkedIn</div><div style="width:48px;height:48px;background:rgba(255,255,255,.05);padding:3px;border-radius:4px">${qrSvg}</div></div>`:''}
  </div>
</div>
<div class="main">
  <div class="mhdr">
    <div class="mn">${firstName} ${lastName}</div>
    <div class="mr">${role}</div>
    <div class="teal-bar"></div>
  </div>
  <div class="mbody">
    ${summary?`<div class="msm">${summary}</div>`:''}
    <div>
      <div class="mst">Expériences professionnelles</div>
      <div class="exps">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="ed">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
    </div>
    <div class="edu-sec">
      <div class="mst">Formations</div>
      <div class="edl">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="ed">${e.dates}</div></div>`).join('')}</div>
    </div>
  </div>
</div>
</body></html>`;
}

export function tplLegalClassic(d: TplData): string {
  // T03 Juridique/Droit — EB Garamond, 2 cols légères, centré
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'EB Garamond',serif;font-size:10pt;color:#1a1a1a;background:#F9F7F4}
.h{padding:28px 44px 16px;text-align:center;background:#fff;border-bottom:2px solid #2C1810;flex-shrink:0}
.hn{font-size:25pt;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#2C1810;line-height:1}
.hr{font-size:11pt;font-style:italic;color:#8B6952;margin-top:5px}
.hc{margin-top:9px;display:flex;justify-content:center;gap:18px;font-size:8pt;color:#666;font-family:'Inter',sans-serif}
.hp-wrap{position:absolute;right:44px;top:22px}
.hp{width:68px;height:68px;border-radius:50%;object-fit:cover;border:1.5px solid #8B6952}
.hdr-inner{position:relative}
.b{flex:1;padding:16px 44px 16px;display:flex;gap:26px}
.main{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.aside{width:180px;flex-shrink:0;display:flex;flex-direction:column;gap:14px;border-left:1px solid #D4C4B0;padding-left:20px}
.st{font-family:'Inter',sans-serif;font-size:6.8pt;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;color:#2C1810;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #D4C4B0}
.xl{display:flex;flex-direction:column;gap:11px}
.xh{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:2px}
.xt{font-weight:600;font-size:10.5pt;color:#2C1810}
.xi{font-style:italic;font-weight:400;font-size:9.5pt;color:#555}
.xd{font-family:'Inter',sans-serif;font-size:7.5pt;color:#888;white-space:nowrap;flex-shrink:0}
.xl2{font-family:'Inter',sans-serif;font-size:8pt;color:#8B6952;margin-bottom:3px;font-style:italic}
ul{margin:0 0 0 16px}li{font-size:9.5pt;line-height:1.65;margin-bottom:1px;color:#333}
.edu-l{display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:600;font-size:10pt;color:#2C1810}
.edes{font-style:italic;font-size:9pt;color:#666}
.sk-item{font-size:8.5pt;color:#333;margin-bottom:5px;padding-left:8px;text-indent:-8px}
.sk-item::before{content:'› ';color:#8B6952;font-weight:700}
.lang-n{font-size:9pt;font-weight:600;color:#2C1810}
.lang-l{font-size:8pt;font-style:italic;color:#888;margin-bottom:6px}
.int-item{font-size:8.5pt;color:#555;margin-bottom:4px}
.int-item::before{content:'— ';color:#8B6952}
.sm{font-size:9.5pt;line-height:1.65;font-style:italic;color:#555;margin-bottom:14px}
</style></head><body>
<div class="h">
  <div class="hdr-inner">
    <div class="hn">${firstName} ${lastName}</div>
    <div class="hr">${role}</div>
    <div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div>
    <div class="hp-wrap">${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}</div>
  </div>
</div>
<div class="b">
  <div class="main">
    ${summary?`<div class="sm">${summary}</div>`:''}
    <div><div class="st">Expériences professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="xh"><div class="xt">${e.title} <span class="xi">— ${e.company}</span></div><div class="xd">${e.dates}</div></div><div class="xl2">${e.location}</div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
    <div><div class="st">Formations</div><div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div></div>
  </div>
  <div class="aside">
    <div><div class="st">Compétences</div>${skills.map(s=>`<div class="sk-item">${s}</div>`).join('')}</div>
    <div><div class="st">Langues</div>${languages.map(l=>`<div><div class="lang-n">${l.name}</div><div class="lang-l">${l.level}</div></div>`).join('')}</div>
    <div><div class="st">Intérêts</div>${interests.map(i=>`<div class="int-item">${i}</div>`).join('')}</div>
  </div>
</div>
</body></html>`;
}

export function tplAuditClean(d: TplData): string {
  // T04 Audit/Expertise comptable — Inter, très propre, gris clair
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#2D3748;background:#fff}
.h{padding:22px 38px 14px;border-bottom:3px solid #2D3748;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-shrink:0}
.hn{font-size:20pt;font-weight:700;color:#1A202C;line-height:1;letter-spacing:-.3px}
.hr{font-size:9.5pt;color:#718096;margin-top:5px;font-weight:500}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:8px}
.hc span{font-size:8pt;color:#718096}
.hp{width:64px;height:64px;border-radius:6px;object-fit:cover;border:1.5px solid #CBD5E0;flex-shrink:0}
.b{flex:1;display:flex;flex-direction:column;padding:14px 38px 16px;justify-content:space-between}
.sm{font-size:8.8pt;line-height:1.6;color:#718096;border-left:3px solid #2D3748;padding-left:10px;font-style:italic}
.sec{}
.st{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#2D3748;border-bottom:2px solid #E2E8F0;padding-bottom:4px;margin-bottom:9px;display:flex;align-items:center;gap:8px}
.st-num{font-size:10pt;font-weight:800;color:#CBD5E0;margin-right:4px}
.xl{display:flex;flex-direction:column;gap:10px}
.xr{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.xt{font-weight:600;font-size:9.5pt;color:#1A202C}
.xc{font-size:8pt;color:#4A5568;margin-top:1px}
.xd{font-size:7.5pt;color:#A0AEC0;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 14px}li{font-size:8.3pt;line-height:1.6;margin-bottom:1.5px;color:#4A5568}
.bot{display:flex;gap:0;border-top:2px solid #E2E8F0;padding-top:12px}
.bc{flex:1;padding-right:16px}
.bc+.bc{border-left:1px solid #E2E8F0;padding-left:16px}
.bt{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#2D3748;margin-bottom:7px}
.bi{font-size:8.3pt;color:#4A5568;margin-bottom:4px;line-height:1.4}
.bi::before{content:'';display:inline-block;width:5px;height:1.5px;background:#2D3748;margin-right:6px;vertical-align:middle}
.edu-r{display:flex;justify-content:space-between;gap:8px;margin-bottom:8px}
.ede{font-weight:600;font-size:9pt;color:#1A202C}
.edes{font-size:8pt;color:#718096;margin-top:1px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="b">
  ${summary?`<div class="sm">${summary}</div>`:''}
  <div class="sec"><div class="st">Expériences</div><div class="xl">${experiences.map(e=>`<div><div class="xr"><div><div class="xt">${e.title}</div><div class="xc">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
  <div class="sec"><div class="st">Formations</div>${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div>
  <div class="bot">
    <div class="bc"><div class="bt">Compétences</div>${skills.map(s=>`<div class="bi">${s}</div>`).join('')}</div>
    <div class="bc"><div class="bt">Langues</div>${languages.map(l=>`<div class="bi">${l.name} — ${l.level}</div>`).join('')}</div>
    <div class="bc"><div class="bt">Intérêts</div>${interests.map(i=>`<div class="bi">${i}</div>`).join('')}</div>
  </div>
</div>
</body></html>`;
}

export function tplCorporateBlue(d: TplData): string {
  // T05 Assurance/Mutuelle — Inter, sidebar droite bleu pale, sobre
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests,accent='#1E3A5F',accentLight='#EEF2F7'} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#333;background:#fff}
.main{flex:1;display:flex;flex-direction:column;padding:24px 22px 18px 32px;justify-content:space-between}
.sb{width:190px;flex-shrink:0;background:${accentLight};border-left:2px solid ${accent};display:flex;flex-direction:column;padding:22px 16px 18px}
.mn{font-size:20pt;font-weight:700;color:${accent};letter-spacing:-.5px;line-height:1;margin-bottom:4px}
.mr{font-size:9.5pt;font-weight:500;color:#555;margin-bottom:9px}
.mc{display:flex;flex-wrap:wrap;gap:2px 12px;padding-bottom:10px;border-bottom:1.5px solid ${accent};margin-bottom:12px}
.mc span{font-size:7.8pt;color:#666}
.msm{font-size:8.8pt;line-height:1.6;color:#555;font-style:italic;margin-bottom:12px;padding-left:10px;border-left:3px solid ${accent}}
.mst{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${accent};margin-bottom:8px;display:flex;align-items:center;gap:8px}
.mst::after{content:'';flex:1;height:1px;background:#ddd}
.exps{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.exp{}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:9.5pt;color:#1a1a1a}
.ec{font-size:8pt;color:${accent};font-weight:500;margin-top:1px}
.ed{font-size:7.5pt;color:#888;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 14px}li{font-size:8.3pt;line-height:1.6;margin-bottom:1.5px;color:#555}
.edus{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:600;font-size:9pt;color:#1a1a1a}
.edes{font-size:8pt;color:#666;margin-top:1px}
.sp{width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid ${accent};display:block;margin:0 auto 14px}
.sn{font-size:11pt;font-weight:700;color:${accent};text-align:center;margin-bottom:2px;line-height:1.2}
.srole{font-size:7.5pt;color:#666;text-align:center;margin-bottom:14px;font-style:italic}
.sdiv{height:1px;background:#ccc;margin:10px 0}
.stt{font-size:6.5pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${accent};margin-bottom:8px}
.si{font-size:7.8pt;color:#333;margin-bottom:5px;padding-bottom:5px;border-bottom:1px solid #ddd;line-height:1.4}
.si:last-child{border-bottom:none}
.sln{font-size:8.5pt;font-weight:600;color:#1a1a1a}
.sll{font-size:7pt;color:#888;margin-bottom:5px}
.sin{font-size:7.5pt;color:#555;margin-bottom:4px;padding-left:7px;position:relative;line-height:1.4}
.sin::before{content:'';position:absolute;left:0;top:6px;width:4px;height:4px;border-radius:50%;background:${accent}}
.ss{flex:1}
</style></head><body>
<div class="main">
  <div class="mn">${firstName} ${lastName}</div>
  <div class="mr">${role}</div>
  <div class="mc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div>
  ${summary?`<div class="msm">${summary}</div>`:''}
  <div class="mst">Expériences professionnelles</div>
  <div class="exps">${experiences.map(e=>`<div class="exp"><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="ed">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
  <div class="edus"><div class="mst">Formations</div>${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="ed">${e.dates}</div></div>`).join('')}</div>
</div>
<div class="sb">
  ${photo?`<img class="sp" src="${photo}" onerror="this.style.display='none'"/>`:""}
  <div class="sn">${firstName} ${lastName}</div>
  <div class="srole">${role}</div>
  <div class="sdiv"></div>
  <div class="stt">Compétences</div>
  ${skills.map(s=>`<div class="si">${s}</div>`).join('')}
  <div class="sdiv"></div>
  <div class="stt">Langues</div>
  ${languages.map(l=>`<div><div class="sln">${l.name}</div><div class="sll">${l.level}</div></div>`).join('')}
  <div class="sdiv"></div>
  <div class="stt">Intérêts</div>
  ${interests.map(i=>`<div class="sin">${i}</div>`).join('')}
  <div class="ss"></div>
</div>
</body></html>`;
}

export function tplImmobilierGreen(d: TplData): string {
  // T06 Immobilier — Inter, accent vert foncé, header avec band vert discret
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const ac='#1B4332',acl='#D1FAE5';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1F2937;background:#fff}
.h{padding:22px 36px 16px;display:flex;align-items:flex-start;gap:18px;border-bottom:3px solid ${ac};flex-shrink:0}
.hp{width:70px;height:70px;border-radius:8px;object-fit:cover;border:2px solid ${ac};flex-shrink:0}
.hi{flex:1}
.hn{font-size:21pt;font-weight:700;color:${ac};letter-spacing:-.3px;line-height:1;margin-bottom:4px}
.hr{font-size:9.5pt;font-weight:500;color:#6B7280;margin-bottom:8px}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px}
.hc span{font-size:8pt;color:#6B7280}
.tagline{background:${acl};border-left:3px solid ${ac};padding:9px 14px;margin:0;font-size:8.8pt;line-height:1.6;color:#374151;font-style:italic;flex-shrink:0}
.b{flex:1;display:flex;flex-direction:column;padding:14px 36px 16px;justify-content:space-between}
.sec{}
.st{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${ac};border-bottom:1.5px solid ${ac};padding-bottom:4px;margin-bottom:9px}
.xl{display:flex;flex-direction:column;gap:11px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:9.5pt;color:#111827}
.ec{font-size:8pt;color:${ac};font-weight:500;margin-top:1px}
.ed{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#6B7280;padding-left:12px;text-indent:-12px}
li::before{content:'→ ';color:${ac};font-weight:700;font-size:8pt}
.bot{display:flex;gap:0;border-top:1px solid #E5E7EB;padding-top:12px}
.bc{flex:1;padding-right:16px}
.bc+.bc{border-left:1px solid #E5E7EB;padding-left:16px}
.bt{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${ac};margin-bottom:7px}
.bi{font-size:8.3pt;color:#374151;margin-bottom:4px;line-height:1.4}
.ede{font-weight:600;font-size:9pt;color:#111827}
.edes{font-size:8pt;color:#6B7280;margin-top:1px;margin-bottom:7px}
</style></head><body>
<div class="h">
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
  <div class="hi">
    <div class="hn">${firstName} ${lastName}</div>
    <div class="hr">${role}</div>
    <div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div>
  </div>
</div>
${summary?`<div class="tagline">${summary}</div>`:''}
<div class="b">
  <div class="sec"><div class="st">Expériences professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="ed">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
  <div class="bot">
    <div class="bc" style="flex:1.4"><div class="bt">Formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''} · ${e.dates}</div></div>`).join('')}</div>
    <div class="bc"><div class="bt">Compétences</div>${skills.slice(0,6).map(s=>`<div class="bi">${s}</div>`).join('')}</div>
    <div class="bc"><div class="bt">Langues</div>${languages.map(l=>`<div class="bi"><strong>${l.name}</strong> — ${l.level}</div>`).join('')}</div>
  </div>
</div>
</body></html>`;
}

export function tplWealthMgmt(d: TplData): string {
  // T07 Gestion de patrimoine — Playfair+Inter, or/marine, élégant sobre
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#2D2D2D;background:#fff}
.h{padding:26px 40px 16px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0B1F3F;flex-shrink:0}
.hn{font-family:'Playfair Display',serif;font-size:23pt;font-weight:700;color:#0B1F3F;line-height:1;letter-spacing:-.5px}
.hr{font-family:'Playfair Display',serif;font-style:italic;font-size:11pt;color:#B0892A;margin-top:5px}
.hc{margin-top:9px;display:flex;flex-wrap:wrap;gap:2px 16px}
.hc span{font-size:8pt;color:#555}
.hp{width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #B0892A;flex-shrink:0}
.b{flex:1;padding:14px 40px 16px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:9.5pt;line-height:1.65;font-style:italic;color:#444;padding-left:14px;border-left:3px solid #B0892A}
.st{font-family:'Playfair Display',serif;font-size:10.5pt;font-weight:600;color:#0B1F3F;margin-bottom:9px;display:flex;align-items:center;gap:10px}
.st::after{content:'';flex:1;height:1px;background:#D4B875}
.xl{display:flex;flex-direction:column;gap:12px}
.xh{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:3px}
.xt{font-weight:600;font-size:9.5pt;color:#0B1F3F}
.xc{font-size:8.5pt;color:#B0892A;font-style:italic;margin-top:1px}
.xd{font-size:7.5pt;color:#888;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 16px}li{font-size:9pt;line-height:1.65;margin-bottom:1.5px;color:#444}
.edu-l{display:flex;flex-direction:column;gap:8px}
.er{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:600;font-size:9.5pt;color:#0B1F3F}
.edes{font-style:italic;font-size:9pt;color:#666}
.bot{display:flex;border-top:1px solid #D4B875;padding-top:11px}
.bc{flex:1;padding-right:16px}
.bc+.bc{border-left:1px solid #E8DCC8;padding-left:16px}
.bt{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:500;color:#0B1F3F;margin-bottom:7px;font-family:'Inter',sans-serif}
.bi{font-size:9pt;color:#444;margin-bottom:3px}
.bi em{font-style:italic;color:#888;font-size:8.5pt}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="b">
  ${summary?`<div class="sm">${summary}</div>`:''}
  <div><div class="st">Expériences professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="xh"><div class="xt">${e.title}</div><div class="xd">${e.dates}</div></div><div class="xc">${e.company} · ${e.location}</div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
  <div><div class="st">Formations</div><div class="edu-l">${educations.map(e=>`<div class="er"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div></div>
  <div class="bot">
    <div class="bc"><div class="bt">Compétences</div>${skills.map(s=>`<div class="bi">${s}</div>`).join('')}</div>
    <div class="bc"><div class="bt">Langues</div>${languages.map(l=>`<div class="bi">${l.name} <em>— ${l.level}</em></div>`).join('')}</div>
    <div class="bc"><div class="bt">Intérêts</div>${interests.map(i=>`<div class="bi">${i}</div>`).join('')}</div>
  </div>
</div>
</body></html>`;
}

export function tplTechATS(d: TplData): string {
  // T08 Dev Senior / Architecte SI — Inter + JetBrains Mono, single col, bleu
  const {firstName,lastName,role,email,phone,city,linkedin,portfolio,photo,experiences,educations,skills,languages,interests} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#334155;background:#fff}
.h{padding:20px 40px 14px;border-bottom:2.5px solid #0F172A;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-shrink:0}
.hn{font-size:21pt;font-weight:700;color:#0F172A;letter-spacing:-1px;line-height:1}
.hr{font-size:10pt;color:#1D4ED8;margin-top:4px}
.hc{display:flex;flex-wrap:wrap;gap:2px 0;margin-top:6px}
.hc span{font-family:'JetBrains Mono',monospace;font-size:7pt;color:#64748B;padding-right:12px}
.hp{width:62px;height:62px;border-radius:50%;object-fit:cover;border:2px solid #1D4ED8;flex-shrink:0}
.sb{padding:6px 40px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:5px;flex-wrap:wrap;flex-shrink:0}
.slbl{font-family:'JetBrains Mono',monospace;font-size:6.5pt;letter-spacing:1.2px;text-transform:uppercase;color:#94A3B8;margin-right:4px}
.stag{font-family:'JetBrains Mono',monospace;font-size:7pt;background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;border-radius:3px;padding:1.5px 6px;white-space:nowrap}
.b{flex:1;padding:11px 40px 13px;display:flex;flex-direction:column;justify-content:space-between}
.exps-b{}
.stt{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.stl{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#0F172A;white-space:nowrap}
.stlne{flex:1;height:1px;background:#CBD5E1}
.xl{display:flex;flex-direction:column;gap:9px}
.exp{display:flex;gap:11px}
.tl{width:12px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding-top:5px}
.dot{width:8px;height:8px;border-radius:50%;background:#1D4ED8;border:1.5px solid #fff;outline:1px solid #1D4ED8;flex-shrink:0}
.eb{flex:1}
.etop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:1px}
.et{font-weight:600;font-size:9.5pt;color:#0F172A}
.ec{font-size:8pt;color:#334155;margin-top:1px}
.estk{font-family:'JetBrains Mono',monospace;font-size:6.5pt;color:#059669;background:#ECFDF5;border-radius:3px;display:inline-block;padding:1px 5px;margin-top:2px}
.xd{font-family:'JetBrains Mono',monospace;font-size:7pt;color:#94A3B8;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:3px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.55;margin-bottom:2px;color:#475569;padding-left:10px;text-indent:-10px}
li::before{content:'/ ';color:#1D4ED8;font-weight:700;font-family:'JetBrains Mono',monospace;font-size:7.5pt}
.ft{display:flex;gap:0;border-top:1px solid #E2E8F0;padding-top:10px}
.fc{flex:1;padding-right:13px}
.fc+.fc{border-left:1px solid #E2E8F0;padding-left:13px}
.ftl{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#0F172A;border-bottom:1.5px solid #1D4ED8;padding-bottom:3px;margin-bottom:7px}
.ede{font-weight:600;font-size:8.5pt;color:#0F172A}
.edes{font-size:7.5pt;color:#64748B;margin-top:1px}
.edt{font-family:'JetBrains Mono',monospace;font-size:7pt;color:#94A3B8;margin-top:1px;margin-bottom:5px}
.lr{display:flex;justify-content:space-between;margin-bottom:5px}
.ln{font-size:8.5pt;font-weight:500;color:#0F172A}
.ll{font-size:7pt;color:#64748B;font-family:'JetBrains Mono',monospace}
.ii{font-size:7.8pt;color:#475569;margin-bottom:4px}
.ii::before{content:'> ';color:#1D4ED8;font-weight:700}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin,portfolio||''].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="sb"><span class="slbl">Stack</span>${skills.map(s=>`<span class="stag">${s}</span>`).join('')}</div>
<div class="b">
  <div class="exps-b">
    <div class="stt"><div class="stl">Expériences</div><div class="stlne"></div></div>
    <div class="xl">${experiences.map(e=>`<div class="exp"><div class="tl"><div class="dot"></div></div><div class="eb"><div class="etop"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div>${e.stack?`<div class="estk">${e.stack}</div>`:''}</div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div></div>`).join('')}</div>
  </div>
  <div class="ft">
    <div class="fc" style="flex:1.4"><div class="ftl">Formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div><div class="edt">${e.dates}</div></div>`).join('')}</div>
    <div class="fc"><div class="ftl">Langues</div>${languages.map(l=>`<div class="lr"><span class="ln">${l.name}</span><span class="ll">${l.level}</span></div>`).join('')}</div>
    <div class="fc"><div class="ftl">Intérêts</div>${interests.map(i=>`<div class="ii">${i}</div>`).join('')}</div>
  </div>
</div>
</body></html>`;
}

export function tplDataSciPurple(d: TplData): string {
  // T09 Data Science / ML / IA — Inter + Mono, accent violet/emeraude
  const {firstName,lastName,role,email,phone,city,linkedin,portfolio,photo,experiences,educations,skills,languages,interests} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1E1B4B;background:#fff}
.h{padding:22px 40px 14px;background:#F5F3FF;border-bottom:2px solid #6D28D9;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-shrink:0}
.hn{font-size:21pt;font-weight:700;color:#1E1B4B;letter-spacing:-.5px;line-height:1}
.hr{font-size:10pt;color:#6D28D9;margin-top:4px}
.hc{display:flex;flex-wrap:wrap;gap:2px 0;margin-top:7px}
.hc span{font-family:'Space Mono',monospace;font-size:7pt;color:#6B7280;padding-right:12px}
.hp{width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #6D28D9;flex-shrink:0}
.sb{padding:6px 40px;background:#EDE9FE;border-bottom:1px solid #DDD6FE;display:flex;align-items:center;gap:5px;flex-wrap:wrap;flex-shrink:0}
.slbl{font-family:'Space Mono',monospace;font-size:6pt;letter-spacing:1px;text-transform:uppercase;color:#8B5CF6;margin-right:4px}
.stag{font-family:'Space Mono',monospace;font-size:7pt;background:#fff;border:1px solid #C4B5FD;color:#6D28D9;border-radius:3px;padding:1.5px 6px;white-space:nowrap}
.b{flex:1;padding:12px 40px 14px;display:flex;flex-direction:column;justify-content:space-between}
.stt{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.stl{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#1E1B4B;white-space:nowrap}
.stlne{flex:1;height:1px;background:#DDD6FE}
.xl{display:flex;flex-direction:column;gap:10px}
.exp{display:flex;gap:12px}
.tl{width:12px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding-top:5px}
.dot{width:8px;height:8px;border-radius:50%;background:#6D28D9;border:1.5px solid #fff;outline:1px solid #6D28D9;flex-shrink:0}
.eb{flex:1}
.etop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:1px}
.et{font-weight:600;font-size:9.5pt;color:#1E1B4B}
.ec{font-size:8pt;color:#6D28D9;margin-top:1px}
.estk{font-family:'Space Mono',monospace;font-size:6.5pt;color:#059669;background:#ECFDF5;border-radius:3px;display:inline-block;padding:1px 5px;margin-top:2px}
.xd{font-family:'Space Mono',monospace;font-size:7pt;color:#94A3B8;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:3px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.55;margin-bottom:2px;color:#374151;padding-left:10px;text-indent:-10px}
li::before{content:'λ ';color:#6D28D9;font-weight:700;font-family:'Space Mono',monospace;font-size:7pt}
.ft{display:flex;gap:0;border-top:1px solid #EDE9FE;padding-top:10px}
.fc{flex:1;padding-right:13px}
.fc+.fc{border-left:1px solid #EDE9FE;padding-left:13px}
.ftl{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#1E1B4B;border-bottom:1.5px solid #6D28D9;padding-bottom:3px;margin-bottom:7px}
.ede{font-weight:600;font-size:8.5pt;color:#1E1B4B}
.edes{font-size:7.5pt;color:#6B7280;margin-top:1px}
.edt{font-family:'Space Mono',monospace;font-size:7pt;color:#94A3B8;margin-top:1px;margin-bottom:5px}
.lr{display:flex;justify-content:space-between;margin-bottom:5px}
.ln{font-size:8.5pt;font-weight:500;color:#1E1B4B}
.ll{font-size:7pt;color:#6B7280;font-family:'Space Mono',monospace}
.ii{font-size:7.8pt;color:#374151;margin-bottom:4px}
.ii::before{content:'∑ ';color:#6D28D9;font-weight:700;font-size:7pt}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin,portfolio||''].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="sb"><span class="slbl">Stack</span>${skills.map(s=>`<span class="stag">${s}</span>`).join('')}</div>
<div class="b">
  <div>
    <div class="stt"><div class="stl">Expériences</div><div class="stlne"></div></div>
    <div class="xl">${experiences.map(e=>`<div class="exp"><div class="tl"><div class="dot"></div></div><div class="eb"><div class="etop"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div>${e.stack?`<div class="estk">${e.stack}</div>`:''}</div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div></div>`).join('')}</div>
  </div>
  <div class="ft">
    <div class="fc" style="flex:1.4"><div class="ftl">Formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div><div class="edt">${e.dates}</div></div>`).join('')}</div>
    <div class="fc"><div class="ftl">Langues</div>${languages.map(l=>`<div class="lr"><span class="ln">${l.name}</span><span class="ll">${l.level}</span></div>`).join('')}</div>
    <div class="fc"><div class="ftl">Intérêts</div>${interests.map(i=>`<div class="ii">${i}</div>`).join('')}</div>
  </div>
</div>
</body></html>`;
}

export function tplCyberSec(d: TplData): string {
  // T10 Cybersécurité / SecOps — header sombre, accent rouge/orange, mono
  const {firstName,lastName,role,email,phone,city,linkedin,portfolio,photo,experiences,educations,skills,languages,interests} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#E2E8F0;background:#0F172A}
.h{padding:22px 36px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid #1E293B;flex-shrink:0}
.hn{font-size:21pt;font-weight:700;color:#F8FAFC;letter-spacing:-.5px;line-height:1}
.hr{font-size:10pt;color:#F97316;margin-top:4px;font-family:'JetBrains Mono',monospace}
.hc{display:flex;flex-wrap:wrap;gap:2px 0;margin-top:7px}
.hc span{font-family:'JetBrains Mono',monospace;font-size:7pt;color:#64748B;padding-right:12px}
.hp{width:64px;height:64px;border-radius:6px;object-fit:cover;border:2px solid #F97316;flex-shrink:0}
.sb{padding:7px 36px;background:#1E293B;border-bottom:1px solid #334155;display:flex;align-items:center;gap:5px;flex-wrap:wrap;flex-shrink:0}
.slbl{font-family:'JetBrains Mono',monospace;font-size:6pt;letter-spacing:1px;text-transform:uppercase;color:#F97316;margin-right:4px}
.stag{font-family:'JetBrains Mono',monospace;font-size:7pt;background:#0F172A;border:1px solid #F97316;color:#F97316;border-radius:2px;padding:1.5px 6px;white-space:nowrap}
.b{flex:1;padding:12px 36px 14px;display:flex;flex-direction:column;justify-content:space-between;background:#0F172A}
.stt{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.stl{font-family:'JetBrains Mono',monospace;font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#F97316;white-space:nowrap}
.stlne{flex:1;height:1px;background:#1E293B}
.xl{display:flex;flex-direction:column;gap:10px}
.exp{display:flex;gap:12px}
.tl{width:12px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding-top:5px}
.dot{width:8px;height:8px;border-radius:2px;background:#F97316;flex-shrink:0}
.eb{flex:1}
.etop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:1px}
.et{font-weight:600;font-size:9.5pt;color:#F8FAFC}
.ec{font-size:8pt;color:#94A3B8;margin-top:1px}
.estk{font-family:'JetBrains Mono',monospace;font-size:6.5pt;color:#34D399;background:rgba(52,211,153,.1);border-radius:2px;display:inline-block;padding:1px 5px;margin-top:2px;border:1px solid rgba(52,211,153,.3)}
.xd{font-family:'JetBrains Mono',monospace;font-size:7pt;color:#475569;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.55;margin-bottom:2px;color:#CBD5E1;padding-left:12px;text-indent:-12px}
li::before{content:'[+] ';color:#34D399;font-weight:700;font-family:'JetBrains Mono',monospace;font-size:7pt}
.ft{display:flex;gap:0;border-top:1px solid #1E293B;padding-top:10px}
.fc{flex:1;padding-right:13px}
.fc+.fc{border-left:1px solid #1E293B;padding-left:13px}
.ftl{font-family:'JetBrains Mono',monospace;font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#F97316;border-bottom:1px solid #F97316;padding-bottom:3px;margin-bottom:7px}
.ede{font-weight:600;font-size:8.5pt;color:#F8FAFC}
.edes{font-size:7.5pt;color:#94A3B8;margin-top:1px}
.edt{font-family:'JetBrains Mono',monospace;font-size:7pt;color:#475569;margin-top:1px;margin-bottom:5px}
.lr{display:flex;justify-content:space-between;margin-bottom:5px}
.ln{font-size:8.5pt;font-weight:500;color:#F8FAFC}
.ll{font-size:7pt;color:#64748B;font-family:'JetBrains Mono',monospace}
.ii{font-size:7.8pt;color:#94A3B8;margin-bottom:4px}
.ii::before{content:'$ ';color:#34D399;font-weight:700;font-family:'JetBrains Mono',monospace}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin,portfolio||''].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="sb"><span class="slbl">Outils</span>${skills.map(s=>`<span class="stag">${s}</span>`).join('')}</div>
<div class="b">
  <div>
    <div class="stt"><div class="stl">// expériences</div><div class="stlne"></div></div>
    <div class="xl">${experiences.map(e=>`<div class="exp"><div class="tl"><div class="dot"></div></div><div class="eb"><div class="etop"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div>${e.stack?`<div class="estk">${e.stack}</div>`:''}</div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div></div>`).join('')}</div>
  </div>
  <div class="ft">
    <div class="fc" style="flex:1.4"><div class="ftl">// formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div><div class="edt">${e.dates}</div></div>`).join('')}</div>
    <div class="fc"><div class="ftl">// langues</div>${languages.map(l=>`<div class="lr"><span class="ln">${l.name}</span><span class="ll">${l.level}</span></div>`).join('')}</div>
    <div class="fc"><div class="ftl">// intérêts</div>${interests.map(i=>`<div class="ii">${i}</div>`).join('')}</div>
  </div>
</div>
</body></html>`;
}
