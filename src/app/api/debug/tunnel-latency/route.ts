import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const url = process.env.CLAUDE_RUNNER_URL;
  const token = process.env.CLAUDE_RUNNER_TOKEN;
  if (!url || !token) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const t0 = Date.now();
  try {
    // 1. Health check
    const h = await fetch(`${url.replace(/\/$/, "")}/health`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const healthMs = Date.now() - t0;
    const healthData = await h.json();

    // 2. Short prompt
    const t1 = Date.now();
    const r1 = await fetch(`${url.replace(/\/$/, "")}/lead-advice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ system: "", prompt: "Dis bonjour en 5 mots.", model: "claude-sonnet-4-6" }),
      signal: AbortSignal.timeout(25_000),
    });
    const shortMs = Date.now() - t1;
    const d1 = await r1.json().catch(() => null) as { text?: string } | null;

    // 3. Rewordify prompt (same as zone humanizer uses)
    const t2 = Date.now();
    const REWORDIFY_TEXT = "Je tiens à remercier tout particulièrement mon maître de stage, Monsieur CHAUMONT Louis, pour la confiance accordée et pour la latitude laissée dans la prise d initiatives, condition sine qua non d un apprentissage réel. Je tiens également à remercier l ensemble des équipes du cabinet Goodvest pour m avoir intégré dans une structure.";
    const r2 = await fetch(`${url.replace(/\/$/, "")}/lead-advice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ system: "", prompt: `Réécris ce texte en remplaçant environ 35% des mots par des synonymes contextuels appropriés. Garde exactement la même structure de phrase, le même registre et le même ton. IMPORTANT: réponds avec SEULEMENT le texte réécrit, sans aucune explication, liste, titre ou markdown.\n\nTexte :\n${REWORDIFY_TEXT}`, model: "claude-sonnet-4-6" }),
      signal: AbortSignal.timeout(25_000),
    });
    const rewordifyMs = Date.now() - t2;
    const d2 = await r2.json().catch(() => null) as { text?: string } | null;

    return NextResponse.json({
      region: process.env.VERCEL_REGION ?? "unknown",
      tunnelUrl: url,
      healthMs,
      shortMs,
      shortText: d1?.text?.slice(0, 60),
      rewordifyMs,
      rewordifyOk: r2.ok,
      rewordifyText: d2?.text?.slice(0, 120),
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - t0,
    }, { status: 500 });
  }
}
