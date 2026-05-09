import { NextResponse } from "next/server";
import Stripe from "stripe";

import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe webhook receiver for flash-card payments.
 *
 * We still verify payment synchronously during mint (`/api/cards`) to enforce
 * "pay first, OTP later". This webhook is an audit/safety path and a hook
 * point for future async workflows (email receipts, analytics, disputes).
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      // Intentionally no PII logs. We only keep event type + Stripe event id.
      // Payment enforcement happens in /api/cards using live session checks.
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true, eventId: event.id });
}
