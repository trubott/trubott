import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { stripeConfigured } from "@/lib/env";
import { createFlashCheckoutSession } from "@/server/payments/flash";

const PAYPAL_HOSTED_BUTTON_ID = "B2Z7CWHD8UBQQ";

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return NextResponse.json({ error: csrf }, { status: 403 });

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        provider: "paypal_hosted",
        url: `https://www.paypal.com/ncp/payment/${PAYPAL_HOSTED_BUTTON_ID}`,
        id: `paypal_hosted_${Date.now()}_${userId.slice(0, 8)}`,
      },
      { status: 200 },
    );
  }

  const base = new URL(request.url).origin;
  const success = `${base}/cards/new?flashPaid=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancel = `${base}/cards/new?flashPaid=0`;

  const checkout = await createFlashCheckoutSession({
    userId,
    successUrl: success,
    cancelUrl: cancel,
  });
  if (!checkout.url) {
    return NextResponse.json({ error: "checkout_create_failed" }, { status: 502 });
  }
  return NextResponse.json({ url: checkout.url, id: checkout.id });
}
