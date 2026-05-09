import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { redditBackgroundPollerEnabled, redditConfigured } from "@/lib/env";
import { getVerificationStatus, processInbox } from "@/server/reddit/verify";

/**
 * GET /api/verify/reddit/status
 *
 * Polled by the verify UI every couple of seconds to detect a state change
 * (waiting -> matched | expired). Cheap: a single indexed Postgres read.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (redditConfigured() && !redditBackgroundPollerEnabled()) {
    try {
      await processInbox();
    } catch {
      // Non-fatal: status still reflects DB; inbox tick retries next poll.
    }
  }

  const status = await getVerificationStatus(userId);

  // Normalize Date -> ISO so the client can JSON.parse straightforwardly.
  if (status.state === "waiting") {
    return NextResponse.json({
      state: status.state,
      code: status.code,
      expiresAt: status.expiresAt.toISOString(),
    });
  }
  if (status.state === "matched") {
    return NextResponse.json({
      state: status.state,
      handle: status.handle,
      matchedAt: status.matchedAt.toISOString(),
    });
  }
  return NextResponse.json(status);
}
