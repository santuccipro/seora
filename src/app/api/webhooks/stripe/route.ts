import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { purchaseId, userId, tokens } = session.metadata || {};

    if (purchaseId && userId && tokens) {
      // Idempotency check: skip if already completed
      const existingPurchase = await prisma.tokenPurchase.findUnique({
        where: { id: purchaseId },
      });

      if (existingPurchase?.status === "completed") {
        return NextResponse.json({ received: true });
      }

      try {
        await prisma.$transaction([
          prisma.tokenPurchase.update({
            where: { id: purchaseId },
            data: { status: "completed" },
          }),
          prisma.user.update({
            where: { id: userId },
            data: { tokens: { increment: parseInt(tokens) } },
          }),
        ]);
      } catch (dbError) {
        console.error("Webhook DB error:", dbError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
