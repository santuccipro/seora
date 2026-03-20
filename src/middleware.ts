import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/admin/:path*",
    "/tokens/:path*",
    "/referral/:path*",
    "/analyse/:path*",
    "/job-match/:path*",
    "/lettre/:path*",
    "/cover-letter/:path*",
    "/humanize/:path*",
    "/plagiarism/:path*",
    "/reformulate/:path*",
    "/email-pro/:path*",
    "/cv-editor/:path*",
  ],
};
