// Templates T11-T20
import type { TplData } from './types';

export function tplProductManager(d: TplData): string {
  // T11 Product Manager / UX/UI — Inter, violet discret, métriques en ligne
  const {firstName,lastName,role,email,phone,city,linkedin,portfolio,photo,summary,experiences,educations,skills,languages,interests,kpis=[]} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1F1F1F;background:#fff}
.h{padding:22px 36px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1.5px solid #7C3AED;flex-shrink:0}
.hn{font-size:21pt;font-weight:700;color:#1F1F1F;letter-spacing:-.5px;line-height:1}
.hr{font-size:10pt;color:#7C3AED;margin-top:4px;font-weight:500}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:7px}
.hc span{font-size:7.8pt;color:#6B7280}
.hp{width:64px;height:64px;border-radius:10px;object-fit:cover;border:2px solid #7C3AED;flex-shrink:0}
.kpis{display:flex;padding:9px 36px;background:#F9F5FF;gap:0;border-bottom:1px solid #E5D9FF;flex-shrink:0}
.kp{flex:1;text-align:center;border-right:1px solid #E5D9FF}
.kp:last-child{border-right:none}
.kv{font-size:14pt;font-weight:700;color:#7C3AED;line-height:1.1}
.kl{font-size:7pt;color:#6B7280;margin-top:2px}
.b{flex:1;padding:12px 36px 14px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:8.8pt;line-height:1.6;color:#374151;border-left:3px solid #7C3AED;padding-left:10px;font-style:italic;margin-bottom:12px}
.stt{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.stl{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#7C3AED;white-space:nowrap}
.stlne{flex:1;height:1px;background:#E5D9FF}
.xl{display:flex;flex-direction:column;gap:9px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:9.5pt;color:#1F1F1F}
.ec{font-size:8pt;color:#6B7280;margin-top:1px}
.ec strong{color:#7C3AED}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:12px;text-indent:-12px}
li::before{content:'• ';color:#7C3AED;font-weight:700}
.ft{display:flex;gap:0;border-top:1px solid #F0EBFF;padding-top:11px}
.fc{flex:1;padding-right:13px}
.fc+.fc{border-left:1px solid #F0EBFF;padding-left:13px}
.ftl{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#7C3AED;margin-bottom:7px}
.ede{font-weight:600;font-size:8.5pt;color:#1F1F1F}
.edes{font-size:7.5pt;color:#6B7280;margin-top:1px;margin-bottom:5px}
.bi{font-size:8pt;color:#374151;margin-bottom:4px;padding:2px 7px;background:#F9F5FF;border-radius:3px;display:inline-block;margin-right:3px}
.lr{display:flex;justify-content:space-between;margin-bottom:5px}
.ln{font-size:8.5pt;font-weight:500}
.ll{font-size:7pt;color:#9CA3AF}
.ii{font-size:7.8pt;color:#374151;margin-bottom:4px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin,portfolio||''].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
${kpis.length?`<div class="kpis">${kpis.map((k: {val:string;label:string})=>`<div class="kp"><div class="kv">${k.val}</div><div class="kl">${k.label}</div></div>`).join('')}</div>`:''}
<div class="b">
  ${summary?`<div class="sm">${summary}</div>`:''}
  <div>
    <div class="stt"><div class="stl">Expériences</div><div class="stlne"></div></div>
    <div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec"><strong>${e.company}</strong> · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
  </div>
  <div class="ft">
    <div class="fc" style="flex:1.4"><div class="ftl">Formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''} · ${e.dates}</div></div>`).join('')}</div>
    <div class="fc"><div class="ftl">Compétences</div><div style="line-height:1.8">${skills.map((s: string)=>`<span class="bi">${s}</span>`).join('')}</div></div>
    <div class="fc" style="flex:.7">
      <div class="ftl">Langues</div>${languages.map(l=>`<div class="lr"><span class="ln">${l.name}</span><span class="ll">${l.level}</span></div>`).join('')}
      <div class="ftl" style="margin-top:9px">Intérêts</div>${interests.map((i: string)=>`<div class="ii">· ${i}</div>`).join('')}
    </div>
  </div>
</div>
</body></html>`;
}

export function tplMarketingCom(d: TplData): string {
  // T12 Marketing Digital / Com — DM Sans, coral/dark, hero header + right sidebar, 2025
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  const CORAL='#C84B0C',DARK='#1A1626',CREAM='#FFF8F5';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'DM Sans',sans-serif;font-size:9pt;color:${DARK};background:#fff}
.hero{padding:22px 34px 18px;background:${DARK};display:flex;align-items:center;justify-content:space-between;gap:18px;flex-shrink:0}
.hero-left{}
.hn{font-family:'DM Serif Display',serif;font-size:25pt;color:#fff;letter-spacing:-.5px;line-height:1}
.hr{font-size:10pt;color:${CORAL};margin-top:5px;font-weight:500;letter-spacing:.2px}
.hc{display:flex;flex-wrap:wrap;gap:0 16px;margin-top:10px}
.hc span{font-size:7.5pt;color:rgba(255,255,255,.55)}
.hc span+span::before{content:'·';margin-right:16px;color:rgba(255,255,255,.2)}
.hp{width:72px;height:72px;border-radius:50%;object-fit:cover;border:2.5px solid ${CORAL};flex-shrink:0}
.hp-ph{width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.06);border:2.5px solid ${CORAL};flex-shrink:0}
.hero-bar{height:3px;background:linear-gradient(90deg,${CORAL} 0%,#FF8C42 60%,${DARK} 100%);flex-shrink:0}
.body{flex:1;display:flex}
.main{flex:1;padding:16px 24px 14px;display:flex;flex-direction:column;justify-content:space-between}
.aside{width:162px;flex-shrink:0;background:${CREAM};border-left:3px solid ${CORAL};padding:16px 14px 16px;display:flex;flex-direction:column;gap:14px}
.sm{font-size:8.5pt;line-height:1.65;color:#4A3728;font-style:italic;border-left:3px solid ${CORAL};padding-left:10px;margin-bottom:10px}
.sec{font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${DARK};display:flex;align-items:center;gap:8px;margin-bottom:8px;margin-top:12px}
.sec-l{flex:1;height:1px;background:rgba(200,75,12,.2)}
.exps{display:flex;flex-direction:column;gap:10px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:700;font-size:9.5pt;color:${DARK}}
.ec{font-size:7.8pt;color:${CORAL};font-weight:500;margin-top:1px}
.xd{font-size:6.8pt;color:#fff;background:${CORAL};white-space:nowrap;flex-shrink:0;padding:2px 7px;border-radius:10px;align-self:flex-start;font-weight:600}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#3D2B1F;position:relative;padding-left:12px}
li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:${CORAL}}
.edl{display:flex;flex-direction:column;gap:7px}
.edu-r{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.ede{font-weight:600;font-size:8.8pt;color:${DARK}}
.edes{font-size:7.5pt;color:#6B5848;margin-top:1px}
.adt{font-size:6pt;letter-spacing:1.8px;text-transform:uppercase;font-weight:700;color:${CORAL};margin-bottom:8px}
.ask{font-size:7.5pt;color:#3D2B1F;position:relative;padding-left:10px;margin-bottom:5px}
.ask::before{content:'';position:absolute;left:0;top:5px;width:4px;height:4px;border-radius:50%;background:${CORAL};opacity:.7}
.aln-n{font-size:8.5pt;font-weight:600;color:${DARK};margin-bottom:1px}
.aln-l{font-size:7pt;color:#9C8578;margin-bottom:6px}
.ain{font-size:7.5pt;color:#6B5848;margin-bottom:4px;font-style:italic}
.qr-a{margin-top:auto;text-align:center}
.qr-lbl{font-size:5.5pt;color:#C4A89A;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
</style></head><body>
<div class="hero">
  <div class="hero-left">
    <div class="hn">${firstName} ${lastName}</div>
    <div class="hr">${role}</div>
    <div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div>
  </div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:`<div class="hp-ph"></div>`}
</div>
<div class="hero-bar"></div>
<div class="body">
  <div class="main">
    ${summary?`<div class="sm">${summary}</div>`:''}
    <div>
      <div class="sec" style="margin-top:0"><span>Expériences professionnelles</span><div class="sec-l"></div></div>
      <div class="exps">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
    </div>
    <div>
      <div class="sec"><span>Formations</span><div class="sec-l"></div></div>
      <div class="edl">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div>
    </div>
  </div>
  <div class="aside">
    <div><div class="adt">Compétences</div>${skills.map((s: string)=>`<div class="ask">${s}</div>`).join('')}</div>
    <div style="height:1px;background:rgba(200,75,12,.15)"></div>
    <div><div class="adt">Langues</div>${languages.map(l=>`<div><div class="aln-n">${l.name}</div><div class="aln-l">${l.level}</div></div>`).join('')}</div>
    ${interests.length?`<div style="height:1px;background:rgba(200,75,12,.15)"></div><div><div class="adt">Intérêts</div>${interests.map((i: string)=>`<div class="ain">${i}</div>`).join('')}</div>`:''}
    ${qrSvg?`<div class="qr-a" style="margin-top:auto"><div class="qr-lbl">LinkedIn</div><div style="width:50px;height:50px;background:#FFF0EB;padding:3px;border-radius:4px;margin:0 auto">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplRHRecruit(d: TplData): string {
  // T13 RH / Talent Acquisition — Playfair Display + Inter, violet, header top + right sidebar
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  const DARK='#1E293B',ACC='#7C3AED',ACCl='#EDE9FE';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:${DARK};background:#fff}
.h{padding:20px 36px 16px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:3px solid ${ACC};flex-shrink:0;background:#FAFAFF}
.hn{font-family:'Playfair Display',serif;font-size:23pt;font-weight:700;color:${DARK};letter-spacing:-.3px;line-height:1}
.hr{font-size:10pt;color:${ACC};margin-top:4px;font-weight:400;font-style:italic}
.hc{display:flex;flex-wrap:wrap;gap:0 14px;margin-top:8px}
.hc span{font-size:7.8pt;color:#64748B}
.hp{width:70px;height:70px;border-radius:50%;object-fit:cover;border:2.5px solid ${ACC};flex-shrink:0}
.body{flex:1;display:flex;padding:14px 36px 14px;gap:24px}
.main{flex:1;display:flex;flex-direction:column}
.side{width:164px;flex-shrink:0;border-left:1px solid #E8E5F5;padding-left:18px}
.sm{font-size:8.8pt;line-height:1.65;color:#475569;border-left:3px solid ${ACC};padding-left:10px;font-style:italic;margin-bottom:14px}
.sec{font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${ACC};border-bottom:1.5px solid ${ACCl};padding-bottom:3px;margin-bottom:9px;margin-top:13px}
.xrow{margin-bottom:10px}
.xtop{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.xt{font-weight:600;font-size:9.5pt;color:${DARK}}
.xdt{font-size:6.8pt;color:${ACC};white-space:nowrap;flex-shrink:0;background:${ACCl};padding:2px 7px;border-radius:4px;margin-top:1px}
.xc{font-size:8pt;color:${ACC};font-weight:500;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.2pt;line-height:1.58;color:#475569;position:relative;padding-left:12px;margin-bottom:2px}
li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:${ACC}}
.erow{display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;align-items:flex-start}
.edeg{font-weight:600;font-size:8.8pt;color:${DARK}}
.esch{font-size:7.8pt;color:#64748B;margin-top:2px}
.edt{font-size:7pt;color:#94A3B8;white-space:nowrap;flex-shrink:0}
.sk-tag{display:inline-block;font-size:7.5pt;background:${ACCl};color:${ACC};border-radius:4px;padding:2px 8px;margin:0 4px 5px 0;font-weight:500}
.ln-row{display:flex;justify-content:space-between;margin-bottom:5px}
.ln-n{font-size:8.5pt;font-weight:500;color:${DARK}}
.ln-l{font-size:7pt;color:#94A3B8}
.it{font-size:7.5pt;color:#64748B;font-style:italic;margin-bottom:4px}
.qr-w{margin-top:auto;padding-top:10px;text-align:center}
.qr-lbl{font-size:6pt;color:#94A3B8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:`<div style="width:70px;height:70px;border-radius:50%;background:${ACCl};border:2.5px solid ${ACC};flex-shrink:0"></div>`}
</div>
<div class="body">
  <div class="main">
    ${summary?`<div class="sm">${summary}</div>`:''}
    <div class="sec" style="margin-top:0">Expériences professionnelles</div>
    ${experiences.map(e=>`<div class="xrow"><div class="xtop"><div class="xt">${e.title}</div><div class="xdt">${e.dates}</div></div><div class="xc">${e.company} · ${e.location}</div><ul>${e.bullets.map((b:string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}
    <div class="sec">Formations</div>
    ${educations.map(e=>`<div class="erow"><div><div class="edeg">${e.degree}</div><div class="esch">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="edt">${e.dates}</div></div>`).join('')}
  </div>
  <div class="side">
    <div class="sec" style="margin-top:0">Compétences</div>
    <div style="margin-bottom:14px">${skills.map((s:string)=>`<span class="sk-tag">${s}</span>`).join('')}</div>
    <div class="sec">Langues</div>
    <div style="margin-bottom:14px">${languages.map(l=>`<div class="ln-row"><span class="ln-n">${l.name}</span><span class="ln-l">${l.level}</span></div>`).join('')}</div>
    <div class="sec">Intérêts</div>
    ${interests.map((i:string)=>`<div class="it">· ${i}</div>`).join('')}
    ${qrSvg?`<div class="qr-w"><div class="qr-lbl">LinkedIn</div><div style="width:58px;height:58px;margin:0 auto;background:${ACCl};padding:3px;border-radius:4px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplCommerceB2B(d: TplData): string {
  // T14 Commerce B2B / Sales — "Executive B2B" — 3 couleurs max, QR code, typographie choc 2025
  // Palette : #0B2447 (navy primary) · #C8A84B (or accent) · #fff (fond) — RIEN D'AUTRE
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  const NAVY='#0B2447';
  const GOLD='#C8A84B';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:210mm;height:297mm;overflow:hidden;display:flex;font-family:'Inter',sans-serif;font-size:9pt;background:#fff;color:${NAVY}}
/* ── SIDEBAR ── */
.sb{width:62mm;background:${NAVY};padding:22px 16px 16px;display:flex;flex-direction:column;flex-shrink:0}
.sb-photo{width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid ${GOLD};display:block;margin:0 auto 14px}
.sb-name{font-family:'Montserrat',sans-serif;font-size:13pt;font-weight:800;color:#fff;text-align:center;line-height:1.2;letter-spacing:-.3px}
.sb-role{font-size:7.5pt;color:${GOLD};text-align:center;font-weight:600;margin-top:4px;margin-bottom:18px;line-height:1.4;letter-spacing:.3px}
.sb-sec{font-family:'Montserrat',sans-serif;font-size:5.5pt;letter-spacing:2.5px;text-transform:uppercase;font-weight:700;color:${GOLD};margin:14px 0 8px;padding-bottom:4px;border-bottom:1px solid rgba(200,168,75,.25)}
.sb-sec:first-of-type{margin-top:0}
.sb-c{font-size:7.5pt;color:rgba(255,255,255,.6);margin-bottom:5px;line-height:1.5;word-break:break-all}
.sk{font-size:7.8pt;color:rgba(255,255,255,.85);padding:4px 8px;background:rgba(255,255,255,.07);border-radius:3px;margin-bottom:4px;border-left:2.5px solid ${GOLD};line-height:1.3}
.lng-n{font-size:8.3pt;font-weight:600;color:#fff}
.lng-l{font-size:7pt;color:rgba(255,255,255,.45);margin-bottom:7px}
.int-i{font-size:7.5pt;color:rgba(255,255,255,.55);margin-bottom:3px}
.qr-wrap{margin-top:auto;padding-top:12px;text-align:center}
.qr-lbl{font-size:6pt;color:rgba(255,255,255,.4);letter-spacing:1px;text-transform:uppercase;margin-top:5px}
/* ── MAIN ── */
.mn{flex:1;display:flex;flex-direction:column;padding:22px 22px 16px 20px;gap:13px}
.sec-t{font-family:'Montserrat',sans-serif;font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${NAVY};margin-bottom:9px;display:flex;align-items:center;gap:8px}
.sec-t::before{content:'';display:inline-block;width:20px;height:3px;background:${GOLD};border-radius:2px;flex-shrink:0}
.summ{font-size:8.8pt;line-height:1.75;color:#374151;font-style:italic;border-left:2px solid ${GOLD};padding-left:10px}
/* exp */
.exp{margin-bottom:10px}
.exp-top{display:flex;justify-content:space-between;align-items:flex-start;gap:6px}
.exp-title{font-family:'Montserrat',sans-serif;font-size:9.5pt;font-weight:700;color:${NAVY};line-height:1.2}
.exp-dt{font-size:7pt;color:#94A3B8;white-space:nowrap;flex-shrink:0;background:#F8FAFC;padding:2px 7px;border-radius:20px;margin-top:2px;font-weight:500}
.exp-co{font-size:8.3pt;color:${GOLD};font-weight:600;margin:3px 0 5px}
ul{list-style:none;padding:0;margin:0}
li{font-size:8.2pt;line-height:1.7;color:#374151;padding-left:13px;position:relative;margin-bottom:1px}
li::before{content:'';position:absolute;left:0;top:8px;width:5px;height:5px;border-radius:50%;background:${GOLD}}
/* edu */
.edu-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px}
.edu{padding:8px 10px;background:#F8F9FA;border-radius:4px;border-top:2px solid ${GOLD}}
.edu-deg{font-family:'Montserrat',sans-serif;font-size:8pt;font-weight:700;color:${NAVY};line-height:1.3}
.edu-sch{font-size:7.5pt;color:#64748B;margin-top:2px}
.edu-dt{font-size:7pt;color:${GOLD};font-weight:600;margin-top:3px}
</style></head><body>
<div class="sb">
  ${photo?`<img class="sb-photo" src="${photo}" onerror="this.style.display='none'"/>`:'<div style="width:88px;height:88px;border-radius:50%;background:rgba(200,168,75,.2);margin:0 auto 14px;border:3px solid '+GOLD+'"></div>'}
  <div class="sb-name">${firstName}<br>${lastName}</div>
  <div class="sb-role">${role}</div>
  <div class="sb-sec">Contact</div>
  ${email?`<div class="sb-c">${email}</div>`:''}
  ${phone?`<div class="sb-c">${phone}</div>`:''}
  ${city?`<div class="sb-c">${city}</div>`:''}
  ${linkedin?`<div class="sb-c">${linkedin}</div>`:''}
  <div class="sb-sec">Compétences</div>
  ${skills.map((s:string)=>`<div class="sk">${s}</div>`).join('')}
  <div class="sb-sec">Langues</div>
  ${languages.map(l=>`<div><div class="lng-n">${l.name}</div><div class="lng-l">${l.level}</div></div>`).join('')}
  ${interests.length?`<div class="sb-sec">Intérêts</div>${interests.map((i:string)=>`<div class="int-i">· ${i}</div>`).join('')}`:''}
  ${qrSvg?`<div class="qr-wrap"><div style="width:64px;height:64px;margin:0 auto;background:#fff;padding:4px;border-radius:4px">${qrSvg}</div><div class="qr-lbl">Mon LinkedIn</div></div>`:''}
</div>
<div class="mn">
  ${summary?`<div><div class="sec-t">Profil</div><div class="summ">${summary}</div></div>`:''}
  <div>
    <div class="sec-t">Expériences professionnelles</div>
    ${experiences.map(e=>`<div class="exp"><div class="exp-top"><div class="exp-title">${e.title}</div><div class="exp-dt">${e.dates}</div></div><div class="exp-co">${e.company}${e.location?' · '+e.location:''}</div><ul>${e.bullets.filter((b:string)=>b.trim()).map((b:string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}
  </div>
  <div>
    <div class="sec-t">Formations</div>
    <div class="edu-grid">${educations.map(e=>`<div class="edu"><div class="edu-deg">${e.degree}</div><div class="edu-sch">${e.school}${e.location?' · '+e.location:''}${e.mention?' — '+e.mention:''}</div><div class="edu-dt">${e.dates}</div></div>`).join('')}</div>
  </div>
</div>
</body></html>`;
}

export function tplLuxury(d: TplData): string {
  // T15 Luxe / Mode / Hospitality haut de gamme — Cormorant Garamond, or/crème
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Cormorant Garamond',serif;font-size:10pt;color:#1A1209;background:#FDFBF7}
.h{padding:26px 44px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid #C9A84C;flex-shrink:0}
.hn{font-size:26pt;font-weight:600;color:#1A1209;letter-spacing:2px;text-transform:uppercase;line-height:1}
.hr{font-size:12pt;font-style:italic;font-weight:300;color:#C9A84C;margin-top:5px;letter-spacing:1px}
.hc{display:flex;flex-wrap:wrap;gap:2px 16px;margin-top:9px}
.hc span{font-family:'Montserrat',sans-serif;font-size:7.5pt;color:#6B5D4E;letter-spacing:.5px}
.hp{width:72px;height:72px;border-radius:50%;object-fit:cover;border:1.5px solid #C9A84C;flex-shrink:0}
.deco{height:3px;background:linear-gradient(90deg,#C9A84C,#F5E7C1,#C9A84C);flex-shrink:0}
.b{flex:1;padding:14px 44px 16px;display:flex;gap:24px}
.main{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.aside{width:170px;flex-shrink:0;border-left:1px solid #E8D8B8;padding-left:20px}
.sm{font-size:10.5pt;line-height:1.7;font-style:italic;font-weight:300;color:#3D2B1F}
.st{font-family:'Montserrat',sans-serif;font-size:6.5pt;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin-bottom:10px;font-weight:600}
.xl{display:flex;flex-direction:column;gap:12px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:10.5pt;color:#1A1209;letter-spacing:.5px}
.ec{font-size:9pt;font-style:italic;color:#6B5D4E;margin-top:2px}
.xd{font-family:'Montserrat',sans-serif;font-size:7pt;color:#A09080;white-space:nowrap;flex-shrink:0;margin-top:3px}
ul{margin:4px 0 0 0;list-style:none}li{font-size:9.5pt;line-height:1.7;margin-bottom:1px;color:#3D2B1F;font-weight:300;position:relative;padding-left:14px}li::before{content:'—';position:absolute;left:0;color:#C9A84C;font-weight:300}
.edu-l{display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:600;font-size:10pt;color:#1A1209}
.edes{font-style:italic;font-size:9pt;color:#6B5D4E}
.sk-item{font-size:9pt;color:#3D2B1F;margin-bottom:5px;padding-left:8px;text-indent:-8px;font-weight:300}
.sk-item::before{content:'— ';color:#C9A84C}
.sln{font-size:10pt;font-weight:600;color:#1A1209}
.sll{font-size:8pt;font-style:italic;color:#A09080;margin-bottom:7px}
.sin{font-size:9pt;color:#6B5D4E;margin-bottom:4px;font-style:italic;font-weight:300}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="deco"></div>
<div class="b">
  <div class="main">
    ${summary?`<div class="sm" style="margin-bottom:14px">${summary}</div>`:''}
    <div><div class="st">Expériences professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div class="et">${e.title}</div><div class="xd">${e.dates}</div></div><div class="ec">${e.company} · ${e.location}</div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
    <div><div class="st">Formations</div><div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div></div>
  </div>
  <div class="aside">
    <div class="st">Compétences</div>
    ${skills.map((s: string)=>`<div class="sk-item">${s}</div>`).join('')}
    <div class="st" style="margin-top:14px">Langues</div>
    ${languages.map(l=>`<div><div class="sln">${l.name}</div><div class="sll">${l.level}</div></div>`).join('')}
    <div class="st" style="margin-top:14px">Intérêts</div>
    ${interests.map((i: string)=>`<div class="sin">${i}</div>`).join('')}
  </div>
</div>
</body></html>`;
}

export function tplStartup(d: TplData): string {
  // T16 Générique universel — sidebar dark slate/indigo, layout premium 2025
  const {firstName,lastName,role,email,phone,city,linkedin,portfolio,photo,summary,experiences,educations,skills,languages,interests} = d;
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  const DARK='#1E293B',ACC='#6366F1';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex}
body{font-family:'Inter',sans-serif;font-size:9pt;background:#fff}
.sb{width:178px;min-height:100%;background:${DARK};padding:20px 16px;display:flex;flex-direction:column;flex-shrink:0}
.sb-photo{width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid ${ACC};display:block;margin:0 auto 16px}
.sb-div{height:1px;background:rgba(255,255,255,.12);margin-bottom:14px}
.sb-sec{font-family:'Montserrat',sans-serif;font-size:6pt;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.38);margin-bottom:7px;font-weight:700}
.sb-ci{font-size:7.5pt;color:rgba(255,255,255,.65);margin-bottom:5px;line-height:1.4;word-break:break-all}
.sb-sk{display:flex;align-items:flex-start;gap:7px;margin-bottom:5px}
.sb-sk::before{content:'';width:5px;height:5px;border-radius:50%;background:${ACC};flex-shrink:0;margin-top:4px}
.sb-sk span{font-size:7.8pt;color:rgba(255,255,255,.78);line-height:1.35}
.sb-ln{display:flex;justify-content:space-between;margin-bottom:5px}
.sb-ln-n{font-size:8pt;color:rgba(255,255,255,.82);font-weight:500}
.sb-ln-l{font-size:7pt;color:rgba(255,255,255,.4)}
.sb-it{font-size:7.5pt;color:rgba(255,255,255,.52);font-style:italic;margin-bottom:4px}
.qr-w{margin-top:auto;padding-top:12px;text-align:center}
.qr-lbl{font-size:6pt;color:rgba(255,255,255,.28);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
.mn{flex:1;padding:22px 28px 16px;display:flex;flex-direction:column}
.mn-nm{font-family:'Montserrat',sans-serif;font-size:24pt;font-weight:900;color:${DARK};letter-spacing:-1px;line-height:1}
.mn-rl{font-size:10.5pt;color:${ACC};font-weight:400;font-style:italic;margin-top:4px}
.mn-sm{font-size:8.8pt;line-height:1.65;color:#475569;border-left:3px solid ${ACC};padding-left:10px;margin-top:13px;margin-bottom:14px;font-style:italic}
.sec{display:flex;align-items:center;gap:9px;margin-bottom:9px;margin-top:14px}
.sec-t{font-family:'Montserrat',sans-serif;font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${DARK};white-space:nowrap}
.sec-l{flex:1;height:1.5px;background:${ACC};opacity:.22}
.xrow{margin-bottom:10px}
.xtop{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.xt{font-weight:600;font-size:9.5pt;color:${DARK}}
.xdt{font-size:6.8pt;color:#94A3B8;white-space:nowrap;background:#F1F5F9;padding:2px 7px;border-radius:4px;flex-shrink:0;margin-top:2px}
.xc{font-size:8pt;color:${ACC};margin-top:2px;font-weight:500}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.2pt;line-height:1.58;color:#475569;position:relative;padding-left:12px;margin-bottom:2px}
li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:${ACC}}
.erow{display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;align-items:flex-start}
.edeg{font-weight:600;font-size:8.8pt;color:${DARK}}
.esch{font-size:7.8pt;color:#64748B;margin-top:2px}
.edt{font-size:7pt;color:#94A3B8;white-space:nowrap;flex-shrink:0}
</style></head><body>
<div class="sb">
  ${photo?`<img class="sb-photo" src="${photo}" onerror="this.style.display='none'"/>`:`<div style="width:80px;height:80px;border-radius:50%;background:rgba(99,102,241,.2);margin:0 auto 16px;border:3px solid ${ACC}"></div>`}
  <div class="sb-div"></div>
  <div class="sb-sec">Contact</div>
  ${[email,phone,city,linkedin,portfolio||''].filter(Boolean).map(t=>`<div class="sb-ci">${t}</div>`).join('')}
  ${skills.length?`<div class="sb-sec" style="margin-top:14px">Compétences</div>${skills.map((s:string)=>`<div class="sb-sk"><span>${s}</span></div>`).join('')}`:''}
  ${languages.length?`<div class="sb-sec" style="margin-top:14px">Langues</div>${languages.map(l=>`<div class="sb-ln"><span class="sb-ln-n">${l.name}</span><span class="sb-ln-l">${l.level}</span></div>`).join('')}`:''}
  ${interests.length?`<div class="sb-sec" style="margin-top:14px">Intérêts</div>${interests.map((i:string)=>`<div class="sb-it">· ${i}</div>`).join('')}`:''}
  ${qrSvg?`<div class="qr-w"><div class="qr-lbl">LinkedIn</div><div style="width:58px;height:58px;margin:0 auto;background:#fff;padding:3px;border-radius:4px">${qrSvg}</div></div>`:''}
</div>
<div class="mn">
  <div class="mn-nm">${firstName} ${lastName}</div>
  <div class="mn-rl">${role}</div>
  ${summary?`<div class="mn-sm">${summary}</div>`:''}
  <div class="sec" style="margin-top:${summary?'0':'14px'}"><div class="sec-t">Expériences professionnelles</div><div class="sec-l"></div></div>
  ${experiences.map(e=>`<div class="xrow"><div class="xtop"><div class="xt">${e.title}</div><div class="xdt">${e.dates}</div></div><div class="xc">${e.company} · ${e.location}</div><ul>${e.bullets.map((b:string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}
  <div class="sec"><div class="sec-t">Formations</div><div class="sec-l"></div></div>
  ${educations.map(e=>`<div class="erow"><div><div class="edeg">${e.degree}</div><div class="esch">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="edt">${e.dates}</div></div>`).join('')}
</div>
</body></html>`;
}

export function tplSante(d: TplData): string {
  // T17 Santé / Médecine — Space Grotesk + Inter, teal médical, CSS dot bullets 2025
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests,certifications=[]} = d;
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  const TEAL='#0D7377',TEAL_LT='#E0F4F4',DARK='#0A2027';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:${DARK};background:#fff}
.h{padding:20px 34px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-shrink:0}
.hn{font-family:'Space Grotesk',sans-serif;font-size:22pt;font-weight:700;color:${DARK};letter-spacing:-.5px;line-height:1}
.hr{font-size:10pt;color:${TEAL};margin-top:4px;font-weight:600;font-family:'Space Grotesk',sans-serif}
.hc{display:flex;flex-wrap:wrap;gap:0 14px;margin-top:9px}
.hc span{font-size:7.5pt;color:#4A6070;padding-right:14px;border-right:1px solid #B2D8D8}
.hc span:last-child{border-right:none}
.hp{width:66px;height:66px;border-radius:50%;object-fit:cover;border:2px solid ${TEAL};flex-shrink:0}
.hp-ph{width:66px;height:66px;border-radius:50%;background:${TEAL_LT};border:2px solid ${TEAL};flex-shrink:0}
.teal-bar{height:2px;background:linear-gradient(90deg,${TEAL} 0%,#4DB6BB 60%,${TEAL_LT} 100%);margin:14px 34px 0;flex-shrink:0}
.body{flex:1;display:flex;gap:0;padding:14px 34px 14px}
.main{flex:1;padding-right:20px;display:flex;flex-direction:column;justify-content:space-between}
.aside{width:164px;flex-shrink:0;border-left:2px solid ${TEAL_LT};padding-left:16px;display:flex;flex-direction:column;gap:13px}
.sm{font-size:8.5pt;line-height:1.65;color:#2D4A56;border-left:3px solid ${TEAL};padding-left:10px;font-style:italic;margin-bottom:11px}
.stt{font-family:'Space Grotesk',sans-serif;font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${TEAL};border-bottom:1.5px solid ${TEAL_LT};padding-bottom:3px;margin-bottom:9px}
.xl{display:flex;flex-direction:column;gap:10px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:9.5pt;color:${DARK}}
.ec{font-size:7.8pt;color:${TEAL};font-weight:500;margin-top:1px}
.xd{font-size:6.8pt;color:#fff;background:${TEAL};white-space:nowrap;flex-shrink:0;padding:2px 6px;border-radius:8px;align-self:flex-start;font-family:'Space Grotesk',sans-serif;font-weight:500}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;position:relative;padding-left:12px}
li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:${TEAL}}
.edu-l{display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.ede{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:8.8pt;color:${DARK}}
.edes{font-size:7.5pt;color:#4A6070;margin-top:1px}
.sk-item{font-size:7.8pt;color:#2D4A56;margin-bottom:5px;position:relative;padding-left:10px}
.sk-item::before{content:'';position:absolute;left:0;top:5px;width:4px;height:4px;border-radius:50%;background:${TEAL};opacity:.7}
.cert-item{font-size:7.5pt;color:#2D4A56;margin-bottom:4px;position:relative;padding-left:10px}
.cert-item::before{content:'';position:absolute;left:0;top:5px;width:4px;height:4px;border-radius:50%;background:${TEAL}}
.sln{font-family:'Space Grotesk',sans-serif;font-size:8pt;font-weight:600;color:${DARK};margin-bottom:1px}
.sll{font-size:7pt;color:#64808F;margin-bottom:5px}
.sin{font-size:7.5pt;color:#64808F;margin-bottom:4px;position:relative;padding-left:10px}
.sin::before{content:'';position:absolute;left:0;top:5px;width:4px;height:4px;border-radius:50%;background:${TEAL};opacity:.4}
.qr-sb{margin-top:auto;text-align:center}
.qr-lbl{font-size:5.5pt;color:#99B8C0;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
</style></head><body>
<div class="h">
  <div>
    <div class="hn">${firstName} ${lastName}</div>
    <div class="hr">${role}</div>
    <div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div>
  </div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:`<div class="hp-ph"></div>`}
</div>
<div class="teal-bar"></div>
<div class="body">
  <div class="main">
    ${summary?`<div class="sm">${summary}</div>`:''}
    <div>
      <div class="stt">Expériences cliniques &amp; professionnelles</div>
      <div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
    </div>
    <div>
      <div class="stt">Formations &amp; diplômes</div>
      <div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div>
    </div>
  </div>
  <div class="aside">
    <div><div class="stt">Compétences</div>${skills.map((s: string)=>`<div class="sk-item">${s}</div>`).join('')}</div>
    ${(certifications as string[]).length?`<div><div class="stt">Certifications</div>${(certifications as string[]).map(c=>`<div class="cert-item">${c}</div>`).join('')}</div>`:''}
    <div><div class="stt">Langues</div>${languages.map(l=>`<div><div class="sln">${l.name}</div><div class="sll">${l.level}</div></div>`).join('')}</div>
    ${interests.length?`<div><div class="stt">Intérêts</div>${interests.map((i: string)=>`<div class="sin">${i}</div>`).join('')}</div>`:''}
    ${qrSvg?`<div class="qr-sb"><div class="qr-lbl">LinkedIn</div><div style="width:48px;height:48px;background:${TEAL_LT};padding:3px;border-radius:4px;margin:0 auto">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplEnseignement(d: TplData): string {
  // T18 Enseignement / Académique — Raleway + Inter, bleu ardoise, CSS dot bullets, 2025
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  const SLATE='#2D4A7A',SLATE_LT='#EEF2FA',CREAM='#F9F8F6';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1E2D40;background:#fff}
.h{padding:22px 38px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;background:${CREAM};border-bottom:3px solid ${SLATE};flex-shrink:0}
.hn{font-family:'Raleway',sans-serif;font-size:23pt;font-weight:800;color:${SLATE};letter-spacing:-.5px;line-height:1}
.hr{font-size:10pt;color:#5A7FA8;margin-top:5px;font-family:'Raleway',sans-serif;font-weight:500;font-style:italic}
.hc{display:flex;flex-wrap:wrap;gap:0 14px;margin-top:9px}
.hc span{font-size:7.5pt;color:#5D6F82;padding-right:14px;border-right:1px solid #C8D5E6}
.hc span:last-child{border-right:none}
.hp{width:68px;height:68px;border-radius:50%;object-fit:cover;border:2.5px solid ${SLATE};flex-shrink:0}
.hp-ph{width:68px;height:68px;border-radius:50%;background:${SLATE_LT};border:2.5px solid ${SLATE};flex-shrink:0}
.b{flex:1;padding:14px 38px 14px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:9pt;line-height:1.7;font-style:italic;color:#3D5270;border-left:3px solid ${SLATE};padding-left:11px;margin-bottom:11px}
.sec{display:flex;align-items:center;gap:10px;margin-bottom:8px;margin-top:13px}
.sec-t{font-family:'Raleway',sans-serif;font-size:6.5pt;letter-spacing:2.5px;text-transform:uppercase;font-weight:700;color:${SLATE};white-space:nowrap}
.sec-l{flex:1;height:1px;background:${SLATE};opacity:.18}
.xl{display:flex;flex-direction:column;gap:11px}
.xh{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:2px}
.et{font-family:'Raleway',sans-serif;font-weight:700;font-size:10pt;color:${SLATE}}
.ec{font-size:8pt;font-style:italic;color:#5A7FA8;margin-top:1px}
.xd{font-size:6.8pt;color:${SLATE};white-space:nowrap;flex-shrink:0;background:${SLATE_LT};padding:2px 7px;border-radius:4px;font-weight:600;font-family:'Raleway',sans-serif}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.5pt;line-height:1.65;margin-bottom:2px;color:#374151;position:relative;padding-left:12px}
li::before{content:'';position:absolute;left:0;top:6.5px;width:4px;height:4px;border-radius:50%;background:${SLATE}}
.edu-l{display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.ede{font-family:'Raleway',sans-serif;font-weight:700;font-size:9pt;color:${SLATE}}
.edes{font-size:7.8pt;font-style:italic;color:#5A7FA8;margin-top:1px}
.bot{display:flex;border-top:1px solid ${SLATE_LT};padding-top:12px;gap:0}
.bc{flex:1;padding-right:16px}
.bc+.bc{border-left:1px solid ${SLATE_LT};padding-left:16px}
.bt{font-family:'Raleway',sans-serif;font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${SLATE};margin-bottom:8px}
.bi{font-size:8pt;color:#1E2D40;margin-bottom:4px;position:relative;padding-left:10px}
.bi::before{content:'';position:absolute;left:0;top:5px;width:4px;height:4px;border-radius:50%;background:${SLATE};opacity:.5}
.bi em{font-style:italic;color:#6B7280;font-size:7.5pt}
.qr-wrap{border-left:1px solid ${SLATE_LT};padding-left:16px;display:flex;flex-direction:column;align-items:center;justify-content:center}
.qr-lbl{font-size:6pt;color:#a0aab8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
</style></head><body>
<div class="h">
  <div>
    <div class="hn">${firstName} ${lastName}</div>
    <div class="hr">${role}</div>
    <div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div>
  </div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:`<div class="hp-ph"></div>`}
</div>
<div class="b">
  ${summary?`<div class="sm">${summary}</div>`:''}
  <div>
    <div class="sec" style="margin-top:0"><div class="sec-t">Expériences d'enseignement et de formation</div><div class="sec-l"></div></div>
    <div class="xl">${experiences.map(e=>`<div><div class="xh"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
  </div>
  <div>
    <div class="sec"><div class="sec-t">Formations &amp; diplômes</div><div class="sec-l"></div></div>
    <div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div>
  </div>
  <div class="bot">
    <div class="bc"><div class="bt">Compétences &amp; outils</div>${skills.map((s: string)=>`<div class="bi">${s}</div>`).join('')}</div>
    <div class="bc"><div class="bt">Langues</div>${languages.map(l=>`<div class="bi">${l.name} <em>— ${l.level}</em></div>`).join('')}</div>
    <div class="bc"><div class="bt">Intérêts</div>${interests.map((i: string)=>`<div class="bi">${i}</div>`).join('')}</div>
    ${qrSvg?`<div class="qr-wrap"><div class="qr-lbl">LinkedIn</div><div style="width:50px;height:50px;background:${SLATE_LT};padding:3px;border-radius:4px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplIndustriel(d: TplData): string {
  // T19 Ingénierie Industrie / BTP / Logistique — Inter, band bleu marine
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests,certifications=[]} = d;
  const ac='#1E3A5F';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1F2937;background:#fff}
.h{padding:20px 36px 12px;background:${ac};display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-shrink:0}
.hn{font-size:21pt;font-weight:700;color:#fff;letter-spacing:-.3px;line-height:1}
.hr{font-size:9.5pt;color:#93C5FD;margin-top:4px;font-weight:500}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:7px}
.hc span{font-size:7.5pt;color:#CBD5E1}
.hp{width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #93C5FD;flex-shrink:0}
.sb{display:flex;padding:7px 36px;background:#1E3A5F22;border-bottom:2px solid ${ac};gap:6px;flex-wrap:wrap;align-items:center;flex-shrink:0}
.slbl{font-size:6.5pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${ac};margin-right:4px}
.stag{font-size:7.5pt;background:#EFF6FF;border:1px solid #BFDBFE;color:${ac};border-radius:3px;padding:1.5px 7px}
.b{flex:1;padding:12px 36px 14px;display:flex;gap:20px}
.main{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.aside{width:168px;flex-shrink:0;border-left:1.5px solid #BFDBFE;padding-left:18px}
.sm{font-size:8.8pt;line-height:1.6;color:#374151;border-left:3px solid ${ac};padding-left:10px}
.stt{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${ac};border-bottom:1.5px solid ${ac};padding-bottom:3px;margin-bottom:9px}
.xl{display:flex;flex-direction:column;gap:10px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:9.5pt;color:#1F2937}
.ec{font-size:8pt;color:${ac};font-weight:500;margin-top:1px}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:12px;text-indent:-12px}
li::before{content:'▸ ';color:${ac};font-weight:700}
.edu-l{display:flex;flex-direction:column;gap:7px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:600;font-size:9pt;color:#1F2937}
.edes{font-size:8pt;color:#6B7280;margin-top:1px}
.sk-item{font-size:7.8pt;color:#374151;margin-bottom:5px;padding:2.5px 0;border-bottom:1px solid #BFDBFE}
.sk-item:last-child{border-bottom:none}
.cert{font-size:7.5pt;color:#374151;margin-bottom:4px;padding-left:8px;text-indent:-8px}
.cert::before{content:'▪ ';color:${ac}}
.sln{font-size:8.5pt;font-weight:600;color:#1F2937}
.sll{font-size:7pt;color:#9CA3AF;margin-bottom:5px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="sb"><span class="slbl">Outils</span>${skills.map((s: string)=>`<span class="stag">${s}</span>`).join('')}</div>
<div class="b">
  <div class="main">
    ${summary?`<div class="sm" style="margin-bottom:12px">${summary}</div>`:''}
    <div><div class="stt">Expériences professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
    <div><div class="stt">Formations</div><div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div></div>
  </div>
  <div class="aside">
    <div class="stt">Domaines d'expertise</div>
    ${skills.slice(0,7).map((s: string)=>`<div class="sk-item">${s}</div>`).join('')}
    ${certifications.length?`<div class="stt" style="margin-top:12px">Certifications</div>${(certifications as string[]).map(c=>`<div class="cert">${c}</div>`).join('')}`:''}
    <div class="stt" style="margin-top:12px">Langues</div>
    ${languages.map(l=>`<div><div class="sln">${l.name}</div><div class="sll">${l.level}</div></div>`).join('')}
    <div class="stt" style="margin-top:12px">Intérêts</div>
    ${interests.map((i: string)=>`<div class="cert">${i}</div>`).join('')}
  </div>
</div>
</body></html>`;
}

export function tplFinancePublic(d: TplData): string {
  // T20 Finance publique / Administration — sobre, inter, tricolore discret
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1F2937;background:#fff}
.h{padding:22px 38px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-shrink:0;border-bottom:4px solid #002395}
.hn{font-size:21pt;font-weight:700;color:#1F2937;letter-spacing:-.3px;line-height:1}
.hr{font-size:10pt;color:#002395;margin-top:4px;font-weight:600}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:7px}
.hc span{font-size:7.8pt;color:#6B7280}
.hp{width:64px;height:64px;border-radius:4px;object-fit:cover;border:1.5px solid #002395;flex-shrink:0}
.tricolor{height:3px;background:linear-gradient(90deg,#002395 33%,#fff 33%,#fff 66%,#ED2939 66%);flex-shrink:0}
.b{flex:1;padding:12px 38px 14px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:8.8pt;line-height:1.6;color:#374151;font-style:italic;border-left:3px solid #002395;padding-left:10px}
.stt{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#002395;border-bottom:1.5px solid #002395;padding-bottom:3px;margin-bottom:9px}
.xl{display:flex;flex-direction:column;gap:10px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:9.5pt;color:#1F2937}
.ec{font-size:8pt;color:#002395;font-weight:500;margin-top:1px}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 14px}li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151}
.bot{display:flex;border-top:1.5px solid #E5E7EB;padding-top:12px}
.bc{flex:1;padding-right:16px}
.bc+.bc{border-left:1px solid #E5E7EB;padding-left:16px}
.bt{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#002395;margin-bottom:7px}
.bi{font-size:8.3pt;color:#374151;margin-bottom:4px;line-height:1.4}
.ede{font-weight:600;font-size:9pt;color:#1F2937}
.edes{font-size:8pt;color:#6B7280;margin-top:1px;margin-bottom:6px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="tricolor"></div>
<div class="b">
  ${summary?`<div class="sm" style="margin-bottom:13px">${summary}</div>`:''}
  <div><div class="stt">Parcours professionnel</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
  <div class="bot">
    <div class="bc" style="flex:1.4"><div class="bt">Formations &amp; concours</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''} · ${e.dates}</div></div>`).join('')}</div>
    <div class="bc"><div class="bt">Compétences</div>${skills.map((s: string)=>`<div class="bi">· ${s}</div>`).join('')}</div>
    <div class="bc" style="flex:.8">
      <div class="bt">Langues</div>${languages.map(l=>`<div class="bi"><strong>${l.name}</strong> — ${l.level}</div>`).join('')}
      <div class="bt" style="margin-top:9px">Intérêts</div>${interests.map((i: string)=>`<div class="bi">${i}</div>`).join('')}
    </div>
  </div>
</div>
</body></html>`;
}
