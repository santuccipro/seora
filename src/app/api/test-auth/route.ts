import { NextRequest, NextResponse } from "next/server";

// Dev-only endpoint for Playwright auth setup
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "dev only" }, { status: 403 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "missing email" }, { status: 400 });

  const { encode } = await import("next-auth/jwt");
  const token = await encode({
    token: { email, sub: email, name: "Test User" },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 86400 * 7,
  });

  const redirectTo = req.nextUrl.searchParams.get("redirect") || "/cv-builder";
  const response = NextResponse.redirect(new URL(redirectTo, req.url));
  // Middleware uses __Secure- prefix (from NEXTAUTH_URL=https://...).
  // localhost is exempt from the RFC Secure-on-HTTP restriction, so browsers accept this.
  response.cookies.set("__Secure-next-auth.session-token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 86400 * 7,
  });
  return response;
}
