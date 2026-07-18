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

    // 2. Short AI prompt
    const t1 = Date.now();
    const r = await fetch(`${url.replace(/\/$/, "")}/lead-advice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ system: "", prompt: "Dis bonjour en 5 mots.", model: "claude-sonnet-4-6" }),
      signal: AbortSignal.timeout(25_000),
    });
    const aiMs = Date.now() - t1;
    const aiData = await r.json().catch(() => null);

    return NextResponse.json({
      region: process.env.VERCEL_REGION ?? "unknown",
      tunnelUrl: url,
      healthMs,
      healthOk: h.ok,
      healthData,
      aiMs,
      aiOk: r.ok,
      aiText: (aiData as { text?: string } | null)?.text?.slice(0, 100),
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - t0,
    }, { status: 500 });
  }
}
