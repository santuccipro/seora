import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: Record<string, string> = {};

  // Test 1: DB connection
  try {
    const count = await prisma.user.count();
    results.db = `OK (${count} users)`;
  } catch (e: unknown) {
    results.db = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 2: Resend API
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: "Seora CV <onboarding@resend.dev>",
        to: "delivered@resend.dev",
        subject: "Test",
        html: "<p>Test</p>",
      });
      if (error) {
        results.resend = `FAIL: ${JSON.stringify(error)}`;
      } else {
        results.resend = `OK (id: ${data?.id})`;
      }
    } else {
      results.resend = "SKIP: no API key";
    }
  } catch (e: unknown) {
    results.resend = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 3: Env vars
  results.env_db = process.env.DATABASE_URL ? "SET" : "MISSING";
  results.env_resend = process.env.RESEND_API_KEY ? "SET" : "MISSING";
  results.env_stripe = process.env.STRIPE_SECRET_KEY ? "SET" : "MISSING";
  results.env_gemini = process.env.GEMINI_API_KEY ? "SET" : "MISSING";

  return NextResponse.json(results);
}
