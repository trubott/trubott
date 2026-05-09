import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { redditConfigured } from "@/lib/env";
import { take } from "@/lib/rate-limit";
import { botUsername } from "@/server/reddit/auth";
import { getRedditHealth } from "@/server/reddit/poller";
import { startVerification } from "@/server/reddit/verify";

/**
 * Threshold above which we consider the bot account unreachable and refuse
 * to issue new codes. ~3 consecutive failures is ~1 minute of nothing
 * working, after which telling users to DM the bot is misleading.
 */
const UNHEALTHY_FAILURE_THRESHOLD = 3;

/**
 * Per-user throttle: starting verification (or refreshing the code) is a
 * cheap DB write but still ends in a row. 6 starts/hour is plenty for a
 * legit user retrying after a typo and not enough to flood the table.
 */
const START_LIMIT = { capacity: 6, windowMs: 60 * 60 * 1000 };

/**
 * POST /api/verify/reddit/start
 *
 * Issues (or reuses) a TRST-XXXX code for the signed-in user and returns
 * the bot username they should DM. Idempotent: if an active code already
 * exists we return the same one so a page refresh doesn't break the flow.
 */
export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return NextResponse.json({ error: csrf }, { status: 403 });

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limited = take(`reddit-start:${userId}`, START_LIMIT);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: limited.retryAfterMs },
      { status: 429, headers: { "retry-after": String(Math.ceil(limited.retryAfterMs / 1000)) } },
    );
  }

  if (!redditConfigured()) {
    return NextResponse.json(
      {
        error: "reddit_not_configured",
        message:
          "The Reddit bot is not configured on this server. Ask the admin to set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD, REDDIT_USER_AGENT.",
      },
      { status: 503 },
    );
  }

  const health = getRedditHealth();
  if (health.consecutiveFailures >= UNHEALTHY_FAILURE_THRESHOLD) {
    return NextResponse.json(
      {
        error: "bot_unreachable",
        message:
          "The Reddit bot is currently unreachable (last successful poll was a while ago). Try again in a few minutes.",
      },
      { status: 503 },
    );
  }

  const { code, expiresAt } = await startVerification(userId);
  return NextResponse.json({
    code,
    expiresAt: expiresAt.toISOString(),
    botUsername: botUsername(),
    message: `DM the code below to u/${botUsername()}.`,
  });
}
