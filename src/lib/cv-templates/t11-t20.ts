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
  <img class="hp" src="${photo}"/>
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
  // T12 Marketing Digital / Com — Poppins, sidebar orange gauche
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const ac='#EA580C';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex}
body{font-family:'Poppins',sans-serif;font-size:9pt;color:#1F2937;background:#fff}
.sb{width:168px;flex-shrink:0;background:#FFF7ED;border-right:3px solid ${ac};display:flex;flex-direction:column;padding:24px 16px 18px}
.sp{width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid ${ac};display:block;margin:0 auto 12px}
.sn{font-size:12.5pt;font-weight:700;color:#1F2937;text-align:center;line-height:1.2;margin-bottom:2px}
.srole{font-size:8pt;color:${ac};text-align:center;margin-bottom:16px;font-weight:500}
.sdiv{height:1px;background:#FDBA74;margin:12px 0}
.stt{font-size:6.5pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;color:${ac};margin-bottom:8px}
.si{font-size:7.5pt;color:#374151;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #FDBA74;line-height:1.4}
.si:last-child{border-bottom:none}
.stt-s{font-size:6.5pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;color:${ac};margin-bottom:8px}
.sk{font-size:7.5pt;color:#374151;margin-bottom:4px;padding-left:8px;text-indent:-8px}
.sk::before{content:'▸ ';color:${ac};font-weight:700}
.sln{font-size:8.5pt;font-weight:600;color:#1F2937}
.sll{font-size:7pt;color:#9CA3AF;margin-bottom:5px}
.sin{font-size:7.5pt;color:#6B7280;margin-bottom:4px;font-style:italic}
.ss{flex:1}
.main{flex:1;display:flex;flex-direction:column;padding:24px 26px 16px}
.mn{font-size:20pt;font-weight:700;color:#1F2937;line-height:1;margin-bottom:3px;letter-spacing:-.5px}
.mr{font-size:10pt;color:${ac};font-weight:500;margin-bottom:9px}
.mc{display:flex;flex-wrap:wrap;gap:2px 12px;padding-bottom:10px;border-bottom:1.5px solid ${ac};margin-bottom:12px}
.mc span{font-size:7.8pt;color:#6B7280}
.msm{font-size:8.8pt;line-height:1.6;color:#374151;font-style:italic;margin-bottom:12px}
.stt2{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:${ac};margin-bottom:8px;display:flex;align-items:center;gap:8px}
.stt2::after{content:'';flex:1;height:1px;background:#FED7AA}
.exps{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.exp{}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:9.5pt;color:#1F2937}
.ec{font-size:8pt;color:${ac};font-weight:500;margin-top:1px}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:12px;text-indent:-12px}
li::before{content:'→ ';color:${ac};font-weight:700}
.edu-sec{}
.edl{display:flex;flex-direction:column;gap:7px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:600;font-size:9pt;color:#1F2937}
.edes{font-size:8pt;color:#6B7280;margin-top:1px}
.ed{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
</style></head><body>
<div class="sb">
<img class="sp" src="${photo}"/>
<div class="sn">${firstName} ${lastName}</div>
<div class="srole">${role}</div>
<div class="sdiv"></div>
<div class="stt">Contact</div>
${[email,phone,city,linkedin].filter(Boolean).map(t=>`<div class="si">${t}</div>`).join('')}
<div class="sdiv"></div>
<div class="stt-s">Compétences</div>
${skills.map((s: string)=>`<div class="sk">${s}</div>`).join('')}
<div class="sdiv"></div>
<div class="stt-s">Langues</div>
${languages.map(l=>`<div><div class="sln">${l.name}</div><div class="sll">${l.level}</div></div>`).join('')}
<div class="sdiv"></div>
<div class="stt-s">Intérêts</div>
${interests.map((i: string)=>`<div class="sin">${i}</div>`).join('')}
<div class="ss"></div>
</div>
<div class="main">
<div class="mn">${firstName} ${lastName}</div>
<div class="mr">${role}</div>
<div class="mc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div>
${summary?`<div class="msm">${summary}</div>`:''}
<div class="stt2">Expériences</div>
<div class="exps">${experiences.map(e=>`<div class="exp"><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
<div class="edu-sec"><div class="stt2">Formations</div><div class="edl">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="ed">${e.dates}</div></div>`).join('')}</div></div>
</div>
</body></html>`;
}

export function tplRHRecruit(d: TplData): string {
  // T13 RH / Talent Acquisition — Inter, accent rose rosé, clean moderne
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const ac='#BE185D',acl='#FCE7F3';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1F2937;background:#fff}
.h{padding:22px 40px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;background:${acl};border-bottom:2px solid ${ac};flex-shrink:0}
.hn{font-size:22pt;font-weight:700;color:#1F2937;letter-spacing:-.5px;line-height:1}
.hr{font-size:10pt;color:${ac};margin-top:4px;font-weight:500}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:8px}
.hc span{font-size:7.8pt;color:#6B7280}
.hp{width:66px;height:66px;border-radius:50%;object-fit:cover;border:2.5px solid ${ac};flex-shrink:0}
.b{flex:1;display:flex;gap:22px;padding:14px 40px 16px}
.main{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.aside{width:175px;flex-shrink:0;border-left:1px solid #F9A8D4;padding-left:18px}
.sm{font-size:8.8pt;line-height:1.6;color:#374151;border-left:3px solid ${ac};padding-left:10px;font-style:italic}
.stt{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${ac};border-bottom:1.5px solid ${ac};padding-bottom:3px;margin-bottom:9px}
.xl{display:flex;flex-direction:column;gap:10px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:9.5pt;color:#1F2937}
.ec{font-size:8pt;color:${ac};font-weight:500;margin-top:1px}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:12px;text-indent:-12px}
li::before{content:'♦ ';color:${ac};font-size:6.5pt}
.edu-l{display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:600;font-size:9pt;color:#1F2937}
.edes{font-size:8pt;color:#6B7280;margin-top:1px}
.sk-pill{display:inline-block;font-size:7.5pt;background:${acl};color:${ac};border-radius:20px;padding:2px 9px;margin:0 3px 5px 0;border:1px solid #F9A8D4}
.sln{font-size:8.5pt;font-weight:600;color:#1F2937}
.sll{font-size:7pt;color:#9CA3AF;margin-bottom:6px}
.sin{font-size:7.5pt;color:#6B7280;margin-bottom:4px;font-style:italic}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  <img class="hp" src="${photo}"/>
</div>
<div class="b">
  <div class="main">
    ${summary?`<div class="sm" style="margin-bottom:13px">${summary}</div>`:''}
    <div><div class="stt">Expériences professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
    <div><div class="stt">Formations</div><div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div></div>
  </div>
  <div class="aside">
    <div class="stt">Compétences</div>
    <div style="margin-bottom:14px">${skills.map((s: string)=>`<span class="sk-pill">${s}</span>`).join('')}</div>
    <div class="stt">Langues</div>
    <div style="margin-bottom:14px">${languages.map(l=>`<div><div class="sln">${l.name}</div><div class="sll">${l.level}</div></div>`).join('')}</div>
    <div class="stt">Intérêts</div>
    ${interests.map((i: string)=>`<div class="sin">· ${i}</div>`).join('')}
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
  ${photo?`<img class="sb-photo" src="${photo}"/>`:'<div style="width:88px;height:88px;border-radius:50%;background:rgba(200,168,75,.2);margin:0 auto 14px;border:3px solid '+GOLD+'"></div>'}
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
ul{margin:4px 0 0 16px}li{font-size:9.5pt;line-height:1.7;margin-bottom:1px;color:#3D2B1F;font-weight:300}
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
  <img class="hp" src="${photo}"/>
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
  // T16 Startup / Fintech / Entrepreneur — Inter, card design, accent gradient
  const {firstName,lastName,role,email,phone,city,linkedin,portfolio,photo,summary,experiences,educations,skills,languages,interests} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#111827;background:#F9FAFB}
.h{padding:22px 36px 16px;background:#fff;border-bottom:2px solid #F3F4F6;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-shrink:0}
.hn{font-size:21pt;font-weight:800;color:#111827;letter-spacing:-1px;line-height:1}
.hr{font-size:10pt;font-weight:600;margin-top:4px;background:linear-gradient(90deg,#7C3AED,#2563EB);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:8px}
.hc span{font-size:7.8pt;color:#6B7280}
.hp{width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0;box-shadow:0 0 0 2px #7C3AED,0 0 0 4px #fff}
.b{flex:1;padding:12px 36px 14px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:8.8pt;line-height:1.6;color:#374151;padding:8px 12px;background:#fff;border-radius:6px;border:1px solid #E5E7EB;margin-bottom:12px}
.stt{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.stl{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#111827;white-space:nowrap}
.stlne{flex:1;height:1px;background:#E5E7EB}
.xl{display:flex;flex-direction:column;gap:9px}
.xcard{background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:9px 12px;border-left:3px solid #7C3AED}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:700;font-size:9.5pt;color:#111827}
.ec{font-size:8pt;color:#7C3AED;font-weight:500;margin-top:1px}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:10px;text-indent:-10px}
li::before{content:'⚡ ';color:#7C3AED;font-size:7.5pt}
.ft{display:flex;gap:0;border-top:1px solid #E5E7EB;padding-top:11px}
.fc{flex:1;padding-right:13px}
.fc+.fc{border-left:1px solid #E5E7EB;padding-left:13px}
.ftl{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#111827;margin-bottom:7px}
.ede{font-weight:600;font-size:8.5pt;color:#111827}
.edes{font-size:7.5pt;color:#6B7280;margin-top:1px;margin-bottom:5px}
.sk-pill{display:inline-block;font-size:7.5pt;background:#EDE9FE;color:#7C3AED;border-radius:20px;padding:2px 8px;margin:0 3px 4px 0;font-weight:500}
.lr{display:flex;justify-content:space-between;margin-bottom:5px}
.ln{font-size:8.5pt;font-weight:600}
.ll{font-size:7pt;color:#9CA3AF}
.ii{font-size:7.8pt;color:#374151;margin-bottom:4px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin,portfolio||''].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  <img class="hp" src="${photo}"/>
</div>
<div class="b">
  ${summary?`<div class="sm">${summary}</div>`:''}
  <div>
    <div class="stt"><div class="stl">Expériences</div><div class="stlne"></div></div>
    <div class="xl">${experiences.map(e=>`<div class="xcard"><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
  </div>
  <div class="ft">
    <div class="fc" style="flex:1.3"><div class="ftl">Formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''} · ${e.dates}</div></div>`).join('')}</div>
    <div class="fc"><div class="ftl">Compétences</div><div style="line-height:1.8">${skills.map((s: string)=>`<span class="sk-pill">${s}</span>`).join('')}</div></div>
    <div class="fc" style="flex:.7"><div class="ftl">Langues</div>${languages.map(l=>`<div class="lr"><span class="ln">${l.name}</span><span class="ll">${l.level}</span></div>`).join('')}
    <div class="ftl" style="margin-top:9px">Intérêts</div>${interests.map((i: string)=>`<div class="ii">· ${i}</div>`).join('')}</div>
  </div>
</div>
</body></html>`;
}

export function tplSante(d: TplData): string {
  // T17 Santé / Médecine — Inter, bleu teal médical, rigoureux
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests,certifications=[]} = d;
  const ac='#0F766E';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1F2937;background:#fff}
.h{padding:22px 36px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:2px solid ${ac};flex-shrink:0}
.hn{font-size:21pt;font-weight:700;color:#1F2937;letter-spacing:-.3px;line-height:1}
.hr{font-size:10pt;color:${ac};margin-top:4px;font-weight:600}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:7px}
.hc span{font-size:7.8pt;color:#6B7280}
.hp{width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid ${ac};flex-shrink:0}
.b{flex:1;display:flex;gap:20px;padding:12px 36px 14px}
.main{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.aside{width:172px;flex-shrink:0;border-left:1.5px solid #99F6E4;padding-left:18px}
.sm{font-size:8.8pt;line-height:1.6;color:#374151;border-left:3px solid ${ac};padding-left:10px}
.stt{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${ac};border-bottom:1px solid #99F6E4;padding-bottom:3px;margin-bottom:9px}
.xl{display:flex;flex-direction:column;gap:10px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:9.5pt;color:#1F2937}
.ec{font-size:8pt;color:${ac};font-weight:500;margin-top:1px}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:12px;text-indent:-12px}
li::before{content:'· ';color:${ac};font-weight:700;font-size:12pt;line-height:.8}
.edu-l{display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:600;font-size:9pt;color:#1F2937}
.edes{font-size:8pt;color:#6B7280;margin-top:1px}
.sk-item{font-size:8pt;color:#374151;margin-bottom:5px;padding:2px 0;border-bottom:1px solid #CCFBF1}
.sk-item:last-child{border-bottom:none}
.sln{font-size:8.5pt;font-weight:600;color:#1F2937}
.sll{font-size:7pt;color:#9CA3AF;margin-bottom:5px}
.cert{font-size:7.5pt;color:#374151;margin-bottom:4px;padding-left:8px;text-indent:-8px}
.cert::before{content:'✓ ';color:${ac};font-weight:700}
.sin{font-size:7.5pt;color:#6B7280;margin-bottom:4px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  <img class="hp" src="${photo}"/>
</div>
<div class="b">
  <div class="main">
    ${summary?`<div class="sm" style="margin-bottom:13px">${summary}</div>`:''}
    <div><div class="stt">Expériences cliniques &amp; professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
    <div><div class="stt">Formations &amp; diplômes</div><div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div></div>
  </div>
  <div class="aside">
    <div class="stt">Compétences</div>
    ${skills.map((s: string)=>`<div class="sk-item">${s}</div>`).join('')}
    ${certifications.length?`<div class="stt" style="margin-top:12px">Certifications</div>${(certifications as string[]).map(c=>`<div class="cert">${c}</div>`).join('')}`:''}
    <div class="stt" style="margin-top:12px">Langues</div>
    ${languages.map(l=>`<div><div class="sln">${l.name}</div><div class="sll">${l.level}</div></div>`).join('')}
    <div class="stt" style="margin-top:12px">Intérêts</div>
    ${interests.map((i: string)=>`<div class="sin">· ${i}</div>`).join('')}
  </div>
</div>
</body></html>`;
}

export function tplEnseignement(d: TplData): string {
  // T18 Enseignement / Académique / Formation — Lora, sobre, bleu-gris
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Lora',serif;font-size:10pt;color:#1F2937;background:#fff}
.h{padding:24px 42px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:3px double #374151;flex-shrink:0}
.hn{font-size:22pt;font-weight:700;color:#1F2937;letter-spacing:-.3px;line-height:1}
.hr{font-size:11pt;font-style:italic;color:#4B5563;margin-top:4px}
.hc{display:flex;flex-wrap:wrap;gap:2px 14px;margin-top:8px}
.hc span{font-family:'Source Sans 3',sans-serif;font-size:8pt;color:#6B7280}
.hp{width:68px;height:68px;border-radius:50%;object-fit:cover;border:1.5px solid #4B5563;flex-shrink:0}
.b{flex:1;padding:14px 42px 16px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:9.5pt;line-height:1.7;font-style:italic;color:#4B5563}
.st{font-family:'Source Sans 3',sans-serif;font-size:7pt;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;color:#374151;border-bottom:1px solid #D1D5DB;padding-bottom:4px;margin-bottom:9px}
.xl{display:flex;flex-direction:column;gap:11px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:700;font-size:10pt;color:#1F2937}
.ec{font-size:9pt;font-style:italic;color:#4B5563;margin-top:1px}
.xd{font-family:'Source Sans 3',sans-serif;font-size:8pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 18px}li{font-size:9.5pt;line-height:1.7;margin-bottom:1px;color:#374151}
.edu-l{display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:700;font-size:9.5pt;color:#1F2937}
.edes{font-style:italic;font-size:9pt;color:#4B5563}
.bot{display:flex;border-top:1px double #D1D5DB;padding-top:12px;gap:24px}
.bc{flex:1}
.bt{font-family:'Source Sans 3',sans-serif;font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:#374151;margin-bottom:7px}
.bi{font-size:9.5pt;color:#374151;margin-bottom:4px}
.bi em{font-style:italic;color:#6B7280;font-size:9pt}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  <img class="hp" src="${photo}"/>
</div>
<div class="b">
  ${summary?`<div class="sm" style="margin-bottom:14px">${summary}</div>`:''}
  <div><div class="st">Expériences d'enseignement et de formation</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div class="et">${e.title}</div><div class="xd">${e.dates}</div></div><div class="ec">${e.company} · ${e.location}</div><ul>${e.bullets.map((b: string)=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
  <div><div class="st">Formations &amp; diplômes</div><div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div></div>
  <div class="bot">
    <div class="bc"><div class="bt">Compétences &amp; outils</div>${skills.map((s: string)=>`<div class="bi">· ${s}</div>`).join('')}</div>
    <div class="bc"><div class="bt">Langues</div>${languages.map(l=>`<div class="bi">${l.name} <em>— ${l.level}</em></div>`).join('')}</div>
    <div class="bc"><div class="bt">Intérêts</div>${interests.map((i: string)=>`<div class="bi">· ${i}</div>`).join('')}</div>
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
  <img class="hp" src="${photo}"/>
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
  <img class="hp" src="${photo}"/>
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
