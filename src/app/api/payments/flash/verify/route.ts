import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { verifyFlashPaymentSession } from "@/server/payments/flash";

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const stripeSessionId = url.searchParams.get("session_id") ?? "";
  if (!stripeSessionId) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }
  const result = await verifyFlashPaymentSession({ userId, stripeSessionId });
  if (!result.paid) {
    return NextResponse.json(
      { error: result.reason ?? "not_paid", paid: false },
      { status: 402 },
    );
  }
  return NextResponse.json({ paid: true, sessionId: stripeSessionId });
}
