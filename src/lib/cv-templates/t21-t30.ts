// Templates T21-T30
import type { TplData } from './types';

export function tplCommunication(d: TplData): string {
  // T21 Relations Publiques / Community Manager — Inter, rose/violet tendance
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const ac='#9333EA';
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Nunito',sans-serif;font-size:9pt;color:#1F1035;background:#fff}
.h{padding:22px 38px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-shrink:0;position:relative}
.h::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,${ac},#EC4899,#F59E0B)}
.hn{font-size:22pt;font-weight:800;color:#1F1035;letter-spacing:-.5px;line-height:1}
.hr{font-size:10pt;color:${ac};margin-top:4px;font-weight:600}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:8px}
.hc span{font-size:7.8pt;color:#6B7280}
.hp{width:66px;height:66px;border-radius:50%;object-fit:cover;border:3px solid ${ac};flex-shrink:0}
.b{flex:1;padding:13px 38px 14px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:8.8pt;line-height:1.6;color:#374151;border-left:3px solid ${ac};padding-left:10px;font-style:italic}
.stt{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${ac};display:flex;align-items:center;gap:8px;margin-bottom:8px}
.stt::after{content:'';flex:1;height:2px;background:linear-gradient(90deg,${ac},transparent)}
.xl{display:flex;flex-direction:column;gap:10px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:700;font-size:9.5pt;color:#1F1035}
.ec{font-size:8pt;color:${ac};font-weight:600;margin-top:1px}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:12px;position:relative}
li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:${ac}}
.bot{display:flex;gap:0;border-top:2px solid;border-image:linear-gradient(90deg,${ac},#EC4899,#F59E0B) 1;padding-top:12px}
.bc{flex:1;padding-right:16px}
.bc+.bc{border-left:1px solid #F3E8FF;padding-left:16px}
.bt{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${ac};margin-bottom:7px}
.bi{font-size:8.3pt;color:#374151;margin-bottom:4px;line-height:1.4}
.sk-pill{display:inline-block;font-size:7.5pt;background:#F3E8FF;color:${ac};border-radius:20px;padding:2px 8px;margin:0 3px 4px 0;font-weight:600}
.ede{font-weight:700;font-size:9pt;color:#1F1035}
.edes{font-size:8pt;color:#6B7280;margin-top:1px;margin-bottom:6px}
.qr-wrap{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;flex-shrink:0;padding-left:14px}
.qr-lbl{font-size:6pt;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="b">
  ${summary?`<div class="sm" style="margin-bottom:12px">${summary}</div>`:''}
  <div><div class="stt">Expériences</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
  <div class="bot">
    <div class="bc" style="flex:1.3"><div class="bt">Formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''} · ${e.dates}</div></div>`).join('')}</div>
    <div class="bc"><div class="bt">Compétences</div><div style="line-height:1.8">${skills.map(s=>`<span class="sk-pill">${s}</span>`).join('')}</div></div>
    <div class="bc" style="flex:.75">
      <div class="bt">Langues</div>${languages.map(l=>`<div class="bi"><strong>${l.name}</strong> — ${l.level}</div>`).join('')}
      <div class="bt" style="margin-top:8px">Intérêts</div>${interests.map(i=>`<div class="bi">· ${i}</div>`).join('')}
    </div>
    ${qrSvg?`<div class="qr-wrap"><div class="qr-lbl">LinkedIn</div><div style="width:48px;height:48px;background:#F5F5F5;padding:3px;border-radius:3px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplPharmacieRecherche(d: TplData): string {
  // T22 Pharmacie / Recherche clinique — Merriweather + Inter, vert bio
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const certifications: string[] = (d as any).certifications || [];
  const ac='#166534';
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1F2937;background:#fff}
.h{padding:22px 38px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-shrink:0;border-bottom:2.5px solid ${ac}}
.hn{font-family:'Merriweather',serif;font-size:20pt;font-weight:700;color:#1F2937;letter-spacing:-.3px;line-height:1}
.hr{font-family:'Merriweather',serif;font-size:10pt;font-style:italic;color:${ac};margin-top:4px}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:7px}
.hc span{font-size:7.8pt;color:#6B7280}
.hp{width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid ${ac};flex-shrink:0}
.b{flex:1;padding:12px 38px 14px;display:flex;gap:22px}
.main{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.aside{width:170px;flex-shrink:0;border-left:1.5px solid #BBF7D0;padding-left:18px;display:flex;flex-direction:column}
.sm{font-family:'Merriweather',serif;font-size:9.5pt;line-height:1.7;font-style:italic;color:#374151}
.stt{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${ac};border-bottom:1px solid #BBF7D0;padding-bottom:3px;margin-bottom:8px}
.xl{display:flex;flex-direction:column;gap:10px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:9.5pt;color:#1F2937}
.ec{font-size:8pt;color:${ac};font-weight:500;margin-top:1px}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:12px;position:relative}li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:${ac}}
.edu-l{display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:600;font-size:9pt;color:#1F2937}
.edes{font-size:8pt;color:#6B7280;margin-top:1px}
.sk-item{font-size:8pt;color:#374151;margin-bottom:5px;padding:2px 0;border-bottom:1px dashed #BBF7D0}
.sk-item:last-child{border-bottom:none}
.cert{font-size:7.5pt;color:#374151;margin-bottom:5px;padding-left:8px;text-indent:-8px}
.cert::before{content:'✓ ';color:${ac};font-weight:700}
.sln{font-size:8.5pt;font-weight:600;color:#1F2937}
.sll{font-size:7pt;color:#9CA3AF;margin-bottom:6px}
.sin{font-size:7.5pt;color:#6B7280;margin-bottom:4px}
.qr-lbl{font-size:6pt;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="b">
  <div class="main">
    ${summary?`<div class="sm" style="margin-bottom:13px">${summary}</div>`:''}
    <div><div class="stt">Expériences professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
    <div><div class="stt">Formations &amp; diplômes</div><div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div></div>
  </div>
  <div class="aside">
    <div class="stt">Compétences</div>
    ${skills.map(s=>`<div class="sk-item">${s}</div>`).join('')}
    ${certifications.length?`<div class="stt" style="margin-top:12px">Certifications</div>${certifications.map(c=>`<div class="cert">${c}</div>`).join('')}`:''}
    <div class="stt" style="margin-top:12px">Langues</div>
    ${languages.map(l=>`<div><div class="sln">${l.name}</div><div class="sll">${l.level}</div></div>`).join('')}
    <div class="stt" style="margin-top:12px">Intérêts</div>
    ${interests.map(i=>`<div class="sin">· ${i}</div>`).join('')}
    ${qrSvg?`<div style="margin-top:auto;display:flex;flex-direction:column;align-items:center;padding-top:12px"><div class="qr-lbl">LinkedIn</div><div style="width:48px;height:48px;background:#F0FDF4;padding:3px;border-radius:3px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplCreativeDesign(d: TplData): string {
  // T23 Design UX/UI / Graphisme / Créatif — asymétrique, font créative
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const portfolio = (d as any).portfolio || '';
  const ac='#0F172A';
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex}
body{font-family:'DM Sans',sans-serif;font-size:9pt;color:#1F2937;background:#fff}
.sb{width:58px;flex-shrink:0;background:#0F172A;display:flex;flex-direction:column;align-items:center;padding-top:28px;gap:0}
.sv{writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);font-size:7pt;letter-spacing:3px;text-transform:uppercase;font-weight:600;color:#64748B;margin-bottom:12px;white-space:nowrap}
.sv2{writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);font-size:8.5pt;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;white-space:nowrap;margin-bottom:auto}
.sl{width:1px;background:#1E293B;flex:1;margin:10px 0}
.sp{width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #64748B;margin-bottom:14px}
.main{flex:1;display:flex;flex-direction:column}
.htop{padding:22px 28px 14px 20px;border-bottom:2px solid ${ac}}
.hn{font-size:22pt;font-weight:700;color:${ac};letter-spacing:-.5px;line-height:1}
.hr{font-size:10pt;color:#7C3AED;margin-top:4px;font-weight:500}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:7px}
.hc span{font-size:7.5pt;color:#6B7280;font-family:'DM Mono',monospace}
.phwrap{display:flex;gap:0}
.info{flex:1}
.ph{width:64px;height:64px;border-radius:8px;object-fit:cover;border:2px solid ${ac};flex-shrink:0;margin-left:14px}
.b{flex:1;padding:11px 28px 13px 20px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:8.8pt;line-height:1.6;color:#374151;font-style:italic;border-left:3px solid #7C3AED;padding-left:9px}
.stt{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${ac};display:flex;align-items:center;gap:8px;margin-bottom:7px}
.stt::after{content:'';flex:1;height:1px;background:#E5E7EB}
.xl{display:flex;flex-direction:column;gap:9px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:1px}
.et{font-weight:600;font-size:9.5pt;color:${ac}}
.ec{font-size:8pt;color:#7C3AED;font-weight:500;margin-top:1px}
.xd{font-family:'DM Mono',monospace;font-size:7pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:3px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:12px;position:relative}
li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:#7C3AED}
.ft{display:flex;gap:0;border-top:1px solid #E5E7EB;padding-top:10px}
.fc{flex:1;padding-right:12px}
.fc+.fc{border-left:1px solid #E5E7EB;padding-left:12px}
.ftl{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${ac};margin-bottom:7px}
.ede{font-weight:600;font-size:8.5pt;color:${ac}}
.edes{font-size:7.5pt;color:#6B7280;margin-top:1px;margin-bottom:5px}
.sk-pill{display:inline-block;font-size:7.5pt;background:#F3F4F6;color:${ac};border-radius:4px;padding:2px 7px;margin:0 3px 4px 0;font-weight:500;font-family:'DM Mono',monospace}
.lr{display:flex;justify-content:space-between;margin-bottom:5px}
.ln{font-size:8.5pt;font-weight:600;color:${ac}}
.ll{font-size:7pt;color:#9CA3AF;font-family:'DM Mono',monospace}
.qr-lbl{font-size:6pt;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
</style></head><body>
<div class="sb">
  <div class="sv">portfolio</div>
  <div class="sv2">${firstName} ${lastName}</div>
  <div class="sl"></div>
  ${photo?`<img class="sp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="main">
  <div class="htop">
    <div class="phwrap">
      <div class="info">
        <div class="hn">${firstName} ${lastName}</div>
        <div class="hr">${role}</div>
        <div class="hc">${[email,phone,city,linkedin,portfolio].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div>
      </div>
    </div>
  </div>
  <div class="b">
    ${summary?`<div class="sm" style="margin-bottom:11px">${summary}</div>`:''}
    <div>
      <div class="stt">Expériences</div>
      <div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
    </div>
    <div class="ft">
      <div class="fc" style="flex:1.2"><div class="ftl">Formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''} · ${e.dates}</div></div>`).join('')}</div>
      <div class="fc"><div class="ftl">Outils</div><div style="line-height:1.8">${skills.map(s=>`<span class="sk-pill">${s}</span>`).join('')}</div></div>
      <div class="fc" style="flex:.7"><div class="ftl">Langues</div>${languages.map(l=>`<div class="lr"><span class="ln">${l.name}</span><span class="ll">${l.level}</span></div>`).join('')}</div>
      ${qrSvg?`<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;flex-shrink:0;padding-left:10px"><div class="qr-lbl">LinkedIn</div><div style="width:48px;height:48px;background:#F3F4F6;padding:3px;border-radius:3px">${qrSvg}</div></div>`:''}
    </div>
  </div>
</div>
</body></html>`;
}

export function tplConseilStrat(d: TplData): string {
  // T24 Conseil Stratégie / McKinsey style — Garamond, noir / blanc, rigueur
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'EB Garamond',serif;font-size:10pt;color:#111;background:#fff}
.h{padding:24px 42px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-shrink:0}
.hn{font-size:24pt;font-weight:700;color:#111;letter-spacing:.5px;line-height:1;text-transform:uppercase}
.hr{font-size:11pt;font-style:italic;color:#444;margin-top:5px}
.hc{display:flex;flex-wrap:wrap;gap:2px 16px;margin-top:7px}
.hc span{font-family:'Inter',sans-serif;font-size:7.5pt;color:#666}
.hp{width:68px;height:68px;border-radius:50%;object-fit:cover;border:1.5px solid #888;flex-shrink:0}
.sep{height:2px;background:#111;margin:0 42px;flex-shrink:0}
.sep2{height:1px;background:#999;margin:0 42px;flex-shrink:0}
.b{flex:1;padding:14px 42px 16px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:9.5pt;line-height:1.7;font-style:italic;color:#444}
.st{font-family:'Inter',sans-serif;font-size:7pt;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;color:#111;margin-bottom:8px}
.xl{display:flex;flex-direction:column;gap:11px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:11pt;color:#111}
.xc{font-size:9.5pt;font-style:italic;color:#444;margin-top:2px}
.xd{font-family:'Inter',sans-serif;font-size:7.5pt;color:#888;white-space:nowrap;flex-shrink:0;margin-top:3px}
ul{margin:4px 0 0 0;list-style:none}li{font-size:9.5pt;line-height:1.7;margin-bottom:1px;color:#333;padding-left:12px;position:relative}li::before{content:'';position:absolute;left:0;top:8px;width:5px;height:5px;border-radius:50%;background:#111}
.edu-l{display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:600;font-size:10pt;color:#111}
.edes{font-style:italic;font-size:9.5pt;color:#444}
.bot{display:flex;border-top:1px solid #bbb;padding-top:11px}
.bc{flex:1;padding-right:18px}
.bc+.bc{border-left:1px solid #ddd;padding-left:18px}
.bt{font-family:'Inter',sans-serif;font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:#111;margin-bottom:6px}
.bi{font-size:9.5pt;color:#333;margin-bottom:3px}
.bi em{font-style:italic;color:#666;font-size:9pt}
.qr-lbl{font-family:'Inter',sans-serif;font-size:6pt;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="sep"></div>
<div class="b">
  ${summary?`<div class="sm" style="margin-bottom:13px">${summary}</div>`:''}
  <div><div class="st">Expériences professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div class="et">${e.title}</div><div class="xd">${e.dates}</div></div><div class="xc">${e.company} · ${e.location}</div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
  <div><div class="st">Formations</div><div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div></div>
  <div class="sep2" style="margin:0 0 11px"></div>
  <div class="bot">
    <div class="bc"><div class="bt">Compétences</div>${skills.map(s=>`<div class="bi">· ${s}</div>`).join('')}</div>
    <div class="bc"><div class="bt">Langues</div>${languages.map(l=>`<div class="bi">${l.name} <em>— ${l.level}</em></div>`).join('')}</div>
    <div class="bc"><div class="bt">Intérêts</div>${interests.map(i=>`<div class="bi">· ${i}</div>`).join('')}</div>
    ${qrSvg?`<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;flex-shrink:0;padding-left:16px"><div class="qr-lbl">LinkedIn</div><div style="width:48px;height:48px;background:#F5F5F5;padding:3px;border-radius:3px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplRetail(d: TplData): string {
  // T25 Retail / Distribution / Responsable magasin — Inter, accent rouge brique
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const kpis: Array<{val: string; label: string}> = (d as any).kpis || [];
  const ac='#B91C1C';
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1F2937;background:#fff}
.h{padding:20px 36px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:3px solid ${ac};flex-shrink:0}
.hn{font-size:21pt;font-weight:800;color:#1F2937;letter-spacing:-.5px;line-height:1}
.hr{font-size:10pt;color:${ac};margin-top:4px;font-weight:600}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:7px}
.hc span{font-size:7.8pt;color:#6B7280}
.hp{width:64px;height:64px;border-radius:6px;object-fit:cover;border:2px solid ${ac};flex-shrink:0}
.kpis{display:flex;padding:8px 36px;background:#FEF2F2;gap:0;border-bottom:1.5px solid #FECACA;flex-shrink:0}
.kp{flex:1;text-align:center;border-right:1px solid #FECACA}
.kp:last-child{border-right:none}
.kv{font-size:15pt;font-weight:800;color:${ac};line-height:1.1}
.kl{font-size:7pt;color:#991B1B;margin-top:2px;font-weight:500}
.b{flex:1;padding:12px 36px 14px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:8.8pt;line-height:1.6;color:#374151;border-left:3px solid ${ac};padding-left:10px;font-style:italic}
.stt{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${ac};border-bottom:1.5px solid ${ac};padding-bottom:3px;margin-bottom:8px}
.xl{display:flex;flex-direction:column;gap:9px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:700;font-size:9.5pt;color:#1F2937}
.ec{font-size:8pt;color:${ac};font-weight:500;margin-top:1px}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:3px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:12px;position:relative}
li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:${ac}}
.bot{display:flex;gap:0;border-top:1px solid #FEE2E2;padding-top:12px}
.bc{flex:1;padding-right:15px}
.bc+.bc{border-left:1px solid #FEE2E2;padding-left:15px}
.bt{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${ac};margin-bottom:7px}
.bi{font-size:8.3pt;color:#374151;margin-bottom:4px;line-height:1.4}
.ede{font-weight:600;font-size:9pt;color:#1F2937}
.edes{font-size:8pt;color:#6B7280;margin-top:1px;margin-bottom:5px}
.qr-lbl{font-size:6pt;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
${kpis.length?`<div class="kpis">${kpis.map(k=>`<div class="kp"><div class="kv">${k.val}</div><div class="kl">${k.label}</div></div>`).join('')}</div>`:''}
<div class="b">
  ${summary?`<div class="sm" style="margin-bottom:12px">${summary}</div>`:''}
  <div><div class="stt">Expériences professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
  <div class="bot">
    <div class="bc" style="flex:1.4"><div class="bt">Formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''} · ${e.dates}</div></div>`).join('')}</div>
    <div class="bc"><div class="bt">Compétences</div>${skills.map(s=>`<div class="bi">· ${s}</div>`).join('')}</div>
    <div class="bc" style="flex:.8"><div class="bt">Langues</div>${languages.map(l=>`<div class="bi"><strong>${l.name}</strong> — ${l.level}</div>`).join('')}<div class="bt" style="margin-top:9px">Intérêts</div>${interests.map(i=>`<div class="bi">${i}</div>`).join('')}</div>
    ${qrSvg?`<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;flex-shrink:0;padding-left:12px"><div class="qr-lbl">LinkedIn</div><div style="width:48px;height:48px;background:#FEF2F2;padding:3px;border-radius:3px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplDirection(d: TplData): string {
  // T26 Direction générale / C-level — Playfair, premium, marine/or
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1A1A2E;background:#fff}
.h{padding:26px 44px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-shrink:0;border-bottom:2px solid #B0892A}
.hn{font-family:'Playfair Display',serif;font-size:25pt;font-weight:700;color:#1A1A2E;letter-spacing:-.5px;line-height:1}
.hr{font-family:'Playfair Display',serif;font-style:italic;font-size:12pt;color:#B0892A;margin-top:5px}
.hc{display:flex;flex-wrap:wrap;gap:2px 16px;margin-top:8px}
.hc span{font-size:7.5pt;color:#555}
.hp{width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid #B0892A;flex-shrink:0}
.b{flex:1;padding:14px 44px 16px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-family:'Playfair Display',serif;font-size:10pt;line-height:1.7;font-style:italic;color:#374151;border-left:3px solid #B0892A;padding-left:12px}
.st{font-size:7pt;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;color:#1A1A2E;margin-bottom:9px;display:flex;align-items:center;gap:10px}
.st::after{content:'';flex:1;height:1px;background:#D4B875}
.xl{display:flex;flex-direction:column;gap:12px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-family:'Playfair Display',serif;font-weight:600;font-size:10.5pt;color:#1A1A2E}
.xc{font-size:8.5pt;color:#B0892A;font-style:italic;margin-top:2px}
.xd{font-size:7.5pt;color:#888;white-space:nowrap;flex-shrink:0;margin-top:3px}
ul{margin:4px 0 0 0;list-style:none}li{font-size:9pt;line-height:1.7;margin-bottom:1.5px;color:#374151;padding-left:12px;position:relative}li::before{content:'';position:absolute;left:0;top:7px;width:5px;height:5px;border-radius:50%;background:#B0892A}
.edu-l{display:flex;flex-direction:column;gap:8px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-family:'Playfair Display',serif;font-weight:600;font-size:10pt;color:#1A1A2E}
.edes{font-size:8.5pt;font-style:italic;color:#555}
.bot{display:flex;border-top:1px solid #D4B875;padding-top:11px}
.bc{flex:1;padding-right:18px}
.bc+.bc{border-left:1px solid #E8DCC8;padding-left:18px}
.bt{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:500;color:#1A1A2E;margin-bottom:7px}
.bi{font-size:9pt;color:#333;margin-bottom:3px}
.bi em{font-style:italic;color:#777;font-size:8.5pt}
.qr-lbl{font-size:6pt;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="b">
  ${summary?`<div class="sm" style="margin-bottom:14px">${summary}</div>`:''}
  <div><div class="st">Expériences de direction</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div class="et">${e.title}</div><div class="xd">${e.dates}</div></div><div class="xc">${e.company} · ${e.location}</div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
  <div><div class="st">Formations</div><div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div></div>
  <div class="bot">
    <div class="bc"><div class="bt">Domaines d'expertise</div>${skills.map(s=>`<div class="bi">· ${s}</div>`).join('')}</div>
    <div class="bc"><div class="bt">Langues</div>${languages.map(l=>`<div class="bi">${l.name} <em>— ${l.level}</em></div>`).join('')}</div>
    <div class="bc"><div class="bt">Intérêts</div>${interests.map(i=>`<div class="bi">· ${i}</div>`).join('')}</div>
    ${qrSvg?`<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;flex-shrink:0;padding-left:16px"><div class="qr-lbl">LinkedIn</div><div style="width:48px;height:48px;background:#FFFBEB;padding:3px;border-radius:3px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplRestauHotel(d: TplData): string {
  // T27 Restauration / Hôtellerie — Cormorant, sobre culinaire, brun chaud
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const ac='#78350F';
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Cormorant Garamond',serif;font-size:10pt;color:#1C0D02;background:#FDFAF6}
.h{padding:24px 40px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1.5px solid ${ac};flex-shrink:0;background:#FDFAF6}
.hn{font-size:24pt;font-weight:700;color:#1C0D02;letter-spacing:.5px;line-height:1}
.hr{font-size:11pt;font-style:italic;color:${ac};margin-top:5px}
.hc{display:flex;flex-wrap:wrap;gap:2px 14px;margin-top:8px}
.hc span{font-family:'Inter',sans-serif;font-size:7.5pt;color:#6B5D4E}
.hp{width:68px;height:68px;border-radius:50%;object-fit:cover;border:1.5px solid ${ac};flex-shrink:0}
.orn{text-align:center;font-size:12pt;color:#C9A84C;letter-spacing:8px;padding:5px 0;flex-shrink:0;background:#FDFAF6}
.b{flex:1;padding:12px 40px 14px;display:flex;gap:22px}
.main{flex:1;display:flex;flex-direction:column;justify-content:space-between}
.aside{width:168px;flex-shrink:0;border-left:1px solid #D4AE8A;padding-left:18px;display:flex;flex-direction:column}
.sm{font-size:10pt;line-height:1.7;font-style:italic;font-weight:400;color:#4A3728}
.st{font-family:'Inter',sans-serif;font-size:6.5pt;letter-spacing:2.5px;text-transform:uppercase;color:${ac};margin-bottom:9px;font-weight:600}
.xl{display:flex;flex-direction:column;gap:11px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:10.5pt;color:#1C0D02}
.ec{font-size:9pt;font-style:italic;color:#78350F;margin-top:2px}
.xd{font-family:'Inter',sans-serif;font-size:7.5pt;color:#A09080;white-space:nowrap;flex-shrink:0;margin-top:3px}
ul{margin:4px 0 0 0;list-style:none}li{font-size:9.5pt;line-height:1.7;margin-bottom:1px;color:#4A3728;font-weight:400;padding-left:12px;position:relative}li::before{content:'';position:absolute;left:0;top:7px;width:5px;height:5px;border-radius:50%;background:#78350F}
.edu-l{display:flex;flex-direction:column;gap:7px}
.edu-r{display:flex;justify-content:space-between;gap:8px}
.ede{font-weight:600;font-size:10pt;color:#1C0D02}
.edes{font-style:italic;font-size:9pt;color:#78350F}
.sk-item{font-size:9pt;color:#4A3728;margin-bottom:5px;padding-left:8px;text-indent:-8px;font-weight:300}
.sk-item::before{content:'✦ ';color:#C9A84C;font-size:7pt}
.sln{font-size:9.5pt;font-weight:600;color:#1C0D02}
.sll{font-size:8pt;font-style:italic;color:#A09080;margin-bottom:6px}
.sin{font-size:9pt;color:#6B5D4E;margin-bottom:4px;font-style:italic;font-weight:300}
.stt{font-family:'Inter',sans-serif;font-size:6.5pt;letter-spacing:2.5px;text-transform:uppercase;color:${ac};margin-bottom:8px;margin-top:12px;font-weight:600}
.stt:first-child{margin-top:0}
.qr-lbl{font-family:'Inter',sans-serif;font-size:6pt;color:#A09080;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="orn">⁂ ⁂ ⁂</div>
<div class="b">
  <div class="main">
    ${summary?`<div class="sm" style="margin-bottom:13px">${summary}</div>`:''}
    <div><div class="st">Expériences</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div class="et">${e.title}</div><div class="xd">${e.dates}</div></div><div class="ec">${e.company} · ${e.location}</div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
    <div><div class="st">Formations</div><div class="edu-l">${educations.map(e=>`<div class="edu-r"><div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div></div><div class="xd">${e.dates}</div></div>`).join('')}</div></div>
  </div>
  <div class="aside">
    <div class="stt">Compétences</div>
    ${skills.map(s=>`<div class="sk-item">${s}</div>`).join('')}
    <div class="stt">Langues</div>
    ${languages.map(l=>`<div><div class="sln">${l.name}</div><div class="sll">${l.level}</div></div>`).join('')}
    <div class="stt">Intérêts</div>
    ${interests.map(i=>`<div class="sin">${i}</div>`).join('')}
    ${qrSvg?`<div style="margin-top:auto;display:flex;flex-direction:column;align-items:center;padding-top:12px"><div class="qr-lbl">LinkedIn</div><div style="width:48px;height:48px;background:#FDF6EE;padding:3px;border-radius:3px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplLogistique(d: TplData): string {
  // T28 Logistique / Supply Chain / Transport — Inter, gris technique, efficace
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const ac='#374151';
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#1F2937;background:#fff}
.h{display:flex;flex-shrink:0}
.h-l{background:#374151;padding:20px 22px 16px 28px;flex:1;display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.hn{font-size:20pt;font-weight:700;color:#fff;letter-spacing:-.3px;line-height:1}
.hr{font-size:9.5pt;color:#9CA3AF;margin-top:4px;font-weight:400}
.hc{display:flex;flex-wrap:wrap;gap:2px 10px;margin-top:7px}
.hc span{font-size:7.5pt;color:#D1D5DB}
.hp{width:62px;height:62px;border-radius:4px;object-fit:cover;border:2px solid #4B5563;flex-shrink:0}
.h-r{background:#F9FAFB;border-left:3px solid #9CA3AF;width:180px;flex-shrink:0;padding:20px 16px 16px;display:flex;flex-direction:column}
.stt{font-size:6.5pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${ac};margin-bottom:7px}
.sk{font-size:8pt;color:#374151;margin-bottom:4px;padding:2px 0;border-bottom:1px solid #E5E7EB}
.sk:last-child{border-bottom:none}
.b{flex:1;padding:12px 28px 14px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:8.8pt;line-height:1.6;color:#374151;border-left:3px solid ${ac};padding-left:10px;font-style:italic}
.st{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${ac};border-bottom:1.5px solid ${ac};padding-bottom:3px;margin-bottom:8px}
.xl{display:flex;flex-direction:column;gap:9px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:600;font-size:9.5pt;color:#1F2937}
.ec{font-size:8pt;color:${ac};font-weight:500;margin-top:1px}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:3px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:12px;position:relative}
li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:${ac}}
.bot{display:flex;border-top:1px solid #E5E7EB;padding-top:11px}
.bc{flex:1;padding-right:15px}
.bc+.bc{border-left:1px solid #E5E7EB;padding-left:15px}
.bt{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${ac};margin-bottom:7px}
.bi{font-size:8.3pt;color:#374151;margin-bottom:4px}
.ede{font-weight:600;font-size:9pt;color:#1F2937}
.edes{font-size:8pt;color:#6B7280;margin-top:1px;margin-bottom:5px}
.qr-lbl{font-size:6pt;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
</style></head><body>
<div class="h">
  <div class="h-l">
    <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
    ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
  </div>
  <div class="h-r">
    <div class="stt">Compétences</div>
    ${skills.slice(0,8).map(s=>`<div class="sk">${s}</div>`).join('')}
  </div>
</div>
<div class="b">
  ${summary?`<div class="sm" style="margin-bottom:12px">${summary}</div>`:''}
  <div><div class="st">Expériences professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
  <div class="bot">
    <div class="bc" style="flex:1.4"><div class="bt">Formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''} · ${e.dates}</div></div>`).join('')}</div>
    <div class="bc"><div class="bt">Langues</div>${languages.map(l=>`<div class="bi"><strong>${l.name}</strong> — ${l.level}</div>`).join('')}</div>
    <div class="bc"><div class="bt">Intérêts</div>${interests.map(i=>`<div class="bi">· ${i}</div>`).join('')}</div>
    ${qrSvg?`<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;flex-shrink:0;padding-left:12px"><div class="qr-lbl">LinkedIn</div><div style="width:48px;height:48px;background:#F9FAFB;padding:3px;border-radius:3px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplITCloud(d: TplData): string {
  // T29 IT Infrastructure / Cloud / DevOps — terminal-inspired, dark bands
  const {firstName,lastName,role,email,phone,city,linkedin,photo,experiences,educations,skills,languages,interests} = d;
  const portfolio = (d as any).portfolio || '';
  const ac='#0EA5E9';
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#E2E8F0;background:#0F172A}
.h{padding:20px 36px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid #1E293B;flex-shrink:0}
.hn{font-size:20pt;font-weight:700;color:#F8FAFC;letter-spacing:-.5px;line-height:1}
.hr{font-size:10pt;color:${ac};margin-top:4px;font-family:'Fira Code',monospace;font-size:9pt}
.hc{display:flex;flex-wrap:wrap;gap:2px 0;margin-top:7px}
.hc span{font-family:'Fira Code',monospace;font-size:7pt;color:#64748B;padding-right:12px}
.hp{width:60px;height:60px;border-radius:6px;object-fit:cover;border:2px solid ${ac};flex-shrink:0}
.sb{padding:7px 36px;background:#1E293B;border-bottom:1px solid #334155;display:flex;align-items:center;gap:4px;flex-wrap:wrap;flex-shrink:0}
.slbl{font-family:'Fira Code',monospace;font-size:6pt;letter-spacing:1px;text-transform:uppercase;color:${ac};margin-right:4px}
.stag{font-family:'Fira Code',monospace;font-size:7pt;background:#0F172A;border:1px solid #334155;color:#94A3B8;border-radius:2px;padding:1.5px 6px;white-space:nowrap}
.b{flex:1;padding:11px 36px 13px;display:flex;flex-direction:column;justify-content:space-between}
.stt{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.stl{font-family:'Fira Code',monospace;font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;color:${ac};white-space:nowrap}
.stlne{flex:1;height:1px;background:#1E293B}
.xl{display:flex;flex-direction:column;gap:9px}
.exp{border-left:2px solid #1E293B;padding-left:11px;position:relative}
.exp::before{content:'';position:absolute;left:-5px;top:5px;width:8px;height:8px;border-radius:2px;background:${ac}}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:1px}
.et{font-weight:600;font-size:9.5pt;color:#F8FAFC}
.ec{font-size:8pt;color:#64748B;margin-top:1px}
.estk{font-family:'Fira Code',monospace;font-size:6.5pt;color:#34D399;background:rgba(52,211,153,.08);border-radius:2px;display:inline-block;padding:1px 5px;margin-top:2px;border:1px solid rgba(52,211,153,.2)}
.xd{font-family:'Fira Code',monospace;font-size:7pt;color:#475569;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:4px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.55;margin-bottom:2px;color:#CBD5E1;padding-left:12px;text-indent:-12px}
li::before{content:'$ ';color:${ac};font-weight:700;font-family:'Fira Code',monospace;font-size:7.5pt}
.ft{display:flex;gap:0;border-top:1px solid #1E293B;padding-top:10px}
.fc{flex:1;padding-right:13px}
.fc+.fc{border-left:1px solid #1E293B;padding-left:13px}
.ftl{font-family:'Fira Code',monospace;font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;color:${ac};border-bottom:1px solid #1E293B;padding-bottom:3px;margin-bottom:7px}
.ede{font-weight:600;font-size:8.5pt;color:#F8FAFC}
.edes{font-size:7.5pt;color:#64748B;margin-top:1px}
.edt{font-family:'Fira Code',monospace;font-size:7pt;color:#475569;margin-top:1px;margin-bottom:5px}
.lr{display:flex;justify-content:space-between;margin-bottom:5px}
.ln{font-size:8.5pt;font-weight:500;color:#F8FAFC}
.ll{font-size:7pt;color:#64748B;font-family:'Fira Code',monospace}
.ii{font-size:7.5pt;color:#94A3B8;margin-bottom:4px;font-family:'Fira Code',monospace}
.qr-lbl{font-family:'Fira Code',monospace;font-size:6pt;color:#475569;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin,portfolio].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
<div class="sb"><span class="slbl">Stack</span>${skills.map(s=>`<span class="stag">${s}</span>`).join('')}</div>
<div class="b">
  <div>
    <div class="stt"><div class="stl">// expériences</div><div class="stlne"></div></div>
    <div class="xl">${experiences.map(e=>`<div class="exp"><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div>${(e as any).stack?`<div class="estk">${(e as any).stack}</div>`:''}</div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
  </div>
  <div class="ft">
    <div class="fc" style="flex:1.4"><div class="ftl">// formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''}</div><div class="edt">${e.dates}</div></div>`).join('')}</div>
    <div class="fc"><div class="ftl">// langues</div>${languages.map(l=>`<div class="lr"><span class="ln">${l.name}</span><span class="ll">${l.level}</span></div>`).join('')}</div>
    <div class="fc"><div class="ftl">// intérêts</div>${interests.map(i=>`<div class="ii">&gt; ${i}</div>`).join('')}</div>
    ${qrSvg?`<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;flex-shrink:0;padding-left:10px"><div class="qr-lbl">// qr</div><div style="width:48px;height:48px;background:#1E293B;padding:3px;border-radius:3px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}

export function tplBusinessDev(d: TplData): string {
  // T30 Business Dev / Partenariats — Inter, teal/bleu clair, focus growth
  const {firstName,lastName,role,email,phone,city,linkedin,photo,summary,experiences,educations,skills,languages,interests} = d;
  const portfolio = (d as any).portfolio || '';
  const kpis: Array<{val: string; label: string}> = (d as any).kpis || [];
  const ac='#0F766E';
  const qrSvg = (d as Record<string,unknown>).qrSvg as string|undefined;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column}
body{font-family:'Inter',sans-serif;font-size:9pt;color:#134E4A;background:#fff}
.h{padding:20px 36px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:3px solid ${ac};flex-shrink:0}
.hn{font-size:22pt;font-weight:800;color:#134E4A;letter-spacing:-1px;line-height:1}
.hr{font-size:10pt;color:${ac};margin-top:4px;font-weight:600}
.hc{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:7px}
.hc span{font-size:7.8pt;color:#6B7280}
.hp{width:64px;height:64px;border-radius:50%;object-fit:cover;border:2.5px solid ${ac};flex-shrink:0}
${kpis.length?`.kpis{display:flex;padding:8px 36px;background:#F0FDF9;gap:0;border-bottom:1.5px solid #99F6E4;flex-shrink:0}
.kp{flex:1;text-align:center;border-right:1px solid #99F6E4}.kp:last-child{border-right:none}
.kv{font-size:15pt;font-weight:800;color:${ac};line-height:1.1}.kl{font-size:7pt;color:#134E4A;margin-top:2px;font-weight:500}`:''}
.b{flex:1;padding:12px 36px 14px;display:flex;flex-direction:column;justify-content:space-between}
.sm{font-size:8.8pt;line-height:1.6;color:#374151;border-left:3px solid ${ac};padding-left:10px;font-style:italic}
.stt{font-size:7pt;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${ac};border-bottom:1.5px solid ${ac};padding-bottom:3px;margin-bottom:8px}
.xl{display:flex;flex-direction:column;gap:9px}
.er{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px}
.et{font-weight:700;font-size:9.5pt;color:#134E4A}
.ec{font-size:8pt;color:${ac};font-weight:500;margin-top:1px}
.xd{font-size:7.5pt;color:#9CA3AF;white-space:nowrap;flex-shrink:0;margin-top:2px}
ul{margin:3px 0 0 0;list-style:none}
li{font-size:8.3pt;line-height:1.6;margin-bottom:2px;color:#374151;padding-left:12px;position:relative}
li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:${ac}}
.bot{display:flex;gap:0;border-top:1px solid #CCFBF1;padding-top:12px}
.bc{flex:1;padding-right:15px}
.bc+.bc{border-left:1px solid #CCFBF1;padding-left:15px}
.bt{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${ac};margin-bottom:7px}
.bi{font-size:8.3pt;color:#374151;margin-bottom:4px;line-height:1.4}
.ede{font-weight:600;font-size:9pt;color:#134E4A}
.edes{font-size:8pt;color:#6B7280;margin-top:1px;margin-bottom:5px}
.qr-lbl{font-size:6pt;color:#aaa;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
</style></head><body>
<div class="h">
  <div><div class="hn">${firstName} ${lastName}</div><div class="hr">${role}</div><div class="hc">${[email,phone,city,linkedin,portfolio].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>
  ${photo?`<img class="hp" src="${photo}" onerror="this.style.display='none'"/>`:""}
</div>
${kpis.length?`<div class="kpis">${kpis.map(k=>`<div class="kp"><div class="kv">${k.val}</div><div class="kl">${k.label}</div></div>`).join('')}</div>`:''}
<div class="b">
  ${summary?`<div class="sm" style="margin-bottom:12px">${summary}</div>`:''}
  <div><div class="stt">Expériences professionnelles</div><div class="xl">${experiences.map(e=>`<div><div class="er"><div><div class="et">${e.title}</div><div class="ec">${e.company} · ${e.location}</div></div><div class="xd">${e.dates}</div></div><ul>${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('')}</div></div>
  <div class="bot">
    <div class="bc" style="flex:1.4"><div class="bt">Formations</div>${educations.map(e=>`<div><div class="ede">${e.degree}</div><div class="edes">${e.school} · ${e.location}${e.mention?` — ${e.mention}`:''} · ${e.dates}</div></div>`).join('')}</div>
    <div class="bc"><div class="bt">Compétences</div>${skills.map(s=>`<div class="bi">· ${s}</div>`).join('')}</div>
    <div class="bc" style="flex:.8"><div class="bt">Langues</div>${languages.map(l=>`<div class="bi"><strong>${l.name}</strong> — ${l.level}</div>`).join('')}<div class="bt" style="margin-top:8px">Intérêts</div>${interests.map(i=>`<div class="bi">${i}</div>`).join('')}</div>
    ${qrSvg?`<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;flex-shrink:0;padding-left:12px"><div class="qr-lbl">LinkedIn</div><div style="width:48px;height:48px;background:#F0FDF9;padding:3px;border-radius:3px">${qrSvg}</div></div>`:''}
  </div>
</div>
</body></html>`;
}
