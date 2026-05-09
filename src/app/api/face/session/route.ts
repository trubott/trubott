import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { take } from "@/lib/rate-limit";
import { issueNonce } from "@/server/face/nonce";

/** Per-user nonce mint cap. Bounds CSRF/abuse blast radius. */
const NONCE_LIMIT = { capacity: 30, windowMs: 60_000 };

/**
 * GET /api/face/nonce
 * Issue an HMAC-signed nonce that the browser will return alongside its
 * "I detected a live face" attestation. The nonce binds an attestation to
 * one user + one short window + one use.
 *
 * GET is intentional: nonces are not state-changing on their own (they're
 * single-use only when consumed by /api/face/attest, which IS guarded).
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const allowance = take(`face-nonce:${userId}`, NONCE_LIMIT);
  if (!allowance.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "retry-after": Math.ceil(allowance.retryAfterMs / 1000).toString() },
      },
    );
  }
  const n = issueNonce(userId);
  return NextResponse.json(n);
}
