import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/server/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { take } from "@/lib/rate-limit";
import { recordPassiveBeacon } from "@/server/passive";

/** Per-user beacon cap. The client only fires once per session anyway. */
const BEACON_LIMIT = { capacity: 12, windowMs: 60_000 };

const Schema = z.object({
  // Client sends a hand-rolled browser visitor id (see lib/browser-id.ts).
  // The server peppered-hashes it before persistence; the raw value never
  // reaches the database.
  v: z.string().min(8).max(256),
});

/**
 * POST /api/passive-signal/heartbeat
 *
 * Idempotent heartbeat fired once per session by the dashboard. Returns
 * whether the device has crossed the consistency threshold so the AI claim
 * engine can label "active across multiple sessions" claims.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const csrf = assertSameOrigin(request);
  if (csrf) return NextResponse.json({ error: csrf }, { status: 403 });

  const allowance = take(`beacon:${userId}`, BEACON_LIMIT);
  if (!allowance.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "retry-after": Math.ceil(allowance.retryAfterMs / 1000).toString() },
      },
    );
  }

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await recordPassiveBeacon({
    userId,
    visitorId: body.v,
  });

  return NextResponse.json(result);
}
