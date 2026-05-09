import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { take } from "@/lib/rate-limit";
import { markRedditListenWindow } from "@/server/reddit/verify";

const SENT_LIMIT = { capacity: 12, windowMs: 60 * 60 * 1000 };

/**
 * POST /api/verify/reddit/sent — starts the 2-minute DM listen window after the user sends the code.
 */
export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return NextResponse.json({ error: csrf }, { status: 403 });

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const allowance = take(`verify-reddit-sent:${userId}`, SENT_LIMIT);
  if (!allowance.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: allowance.retryAfterMs },
      { status: 429 },
    );
  }

  const result = await markRedditListenWindow(userId);
  if (!result.ok) {
    return NextResponse.json({ error: "no_active_code" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
