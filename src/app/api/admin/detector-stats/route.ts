import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/detector-stats
 *   ?window_hours=24  (default) — aggregates the last N hours
 *   ?signals=1        — also fetch /stats/signals (7d)
 *
 * Server-side proxy to the Python detector's /stats endpoint. Uses
 * SEORA_DETECTOR_URL + SEORA_DETECTOR_TOKEN. Auth is NextAuth admin only.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = process.env.SEORA_DETECTOR_URL;
  if (!url) {
    return NextResponse.json(
      { error: "SEORA_DETECTOR_URL non configuré" },
      { status: 500 }
    );
  }
  const token = process.env.SEORA_DETECTOR_TOKEN || "";
  const base = url.replace(/\/$/, "");

  const windowHours = Number(req.nextUrl.searchParams.get("window_hours") ?? "24");
  const wantSignals = req.nextUrl.searchParams.get("signals") === "1";

  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15_000);

  try {
    const requests: Promise<Response>[] = [
      fetch(`${base}/stats?window_hours=${windowHours}`, { headers, signal: ctrl.signal }),
      fetch(`${base}/stats?window_hours=${24 * 7}`, { headers, signal: ctrl.signal }),
      fetch(`${base}/stats?window_hours=${24 * 30}`, { headers, signal: ctrl.signal }),
    ];
    if (wantSignals) {
      requests.push(
        fetch(`${base}/stats/signals?window_hours=${24 * 7}`, { headers, signal: ctrl.signal })
      );
    }

    const responses = await Promise.all(requests);
    for (const r of responses) {
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        return NextResponse.json(
          { error: `Detector HTTP ${r.status}: ${t.slice(0, 200)}` },
          { status: 502 }
        );
      }
    }

    const [d1, d7, d30, signals] = await Promise.all(
      responses.map((r) => r.json())
    );

    return NextResponse.json({
      window_1: d1,
      window_7: d7,
      window_30: d30,
      ...(wantSignals ? { signals } : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: `Detector fetch failed: ${msg}` },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
