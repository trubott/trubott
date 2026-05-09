import { redditBackgroundPollerEnabled, redditConfigured } from "@/lib/env";
import { RedditRateLimitError } from "@/server/reddit/api";
import { processInbox, pruneOldConsumedMessages } from "@/server/reddit/verify";

const POLL_INTERVAL_MS = 10_000;
const PRUNE_EVERY_N_TICKS = 60; // every ~10 minutes
const BACKOFF_MAX_MS = 5 * 60 * 1000;

let started = false;

/** Module-level health snapshot read by `/api/verify/reddit/start`. */
type Health = {
  consecutiveFailures: number;
  lastErrorAt: number | null;
  lastSuccessAt: number | null;
};
const health: Health = {
  consecutiveFailures: 0,
  lastErrorAt: null,
  lastSuccessAt: null,
};

export function getRedditHealth(): Readonly<Health> {
  return health;
}

/**
 * Background loop: every 10s, poll the bot inbox for incoming TRST-XXXX
 * codes and consume them. Started once from `instrumentation.ts`. Idempotent
 * (a second call is a no-op).
 *
 * On a 429 from Reddit we honour `Retry-After`; on repeated auth/network
 * failures we exponential-backoff up to 5 minutes so a suspended bot
 * account or revoked credential doesn't trigger a tight retry loop.
 */
export function startRedditPoller(): void {
  if (started) return;
  if (!redditBackgroundPollerEnabled()) {
    console.warn(
      "[reddit] background poller disabled (set REDDIT_BACKGROUND_POLLER=1 to enable legacy always-on inbox polling)",
    );
    return;
  }
  if (!redditConfigured()) {
    console.warn("[reddit] poller not started: Reddit bot creds not configured");
    return;
  }
  started = true;

  let tick = 0;
  const loop = async () => {
    let nextDelayMs = POLL_INTERVAL_MS;
    try {
      await processInbox();
      health.consecutiveFailures = 0;
      health.lastSuccessAt = Date.now();
    } catch (err) {
      health.consecutiveFailures += 1;
      health.lastErrorAt = Date.now();
      if (err instanceof RedditRateLimitError) {
        nextDelayMs = Math.max(POLL_INTERVAL_MS, err.retryAfterSec * 1000);
        console.warn(`[reddit] rate-limited; backing off ${nextDelayMs}ms`);
      } else {
        // Exponential backoff: 10s, 20s, 40s, 80s, ... cap 5min.
        const k = Math.min(8, health.consecutiveFailures);
        nextDelayMs = Math.min(BACKOFF_MAX_MS, POLL_INTERVAL_MS * 2 ** (k - 1));
        console.warn(
          `[reddit] poll tick failed (#${health.consecutiveFailures}); next in ${nextDelayMs}ms:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    tick++;
    if (tick % PRUNE_EVERY_N_TICKS === 0) {
      pruneOldConsumedMessages().catch(() => {});
    }
    setTimeout(loop, nextDelayMs);
  };

  // Defer the first tick so server startup isn't blocked on Reddit.
  setTimeout(loop, 5_000);
  console.log("[reddit] inbox poller started");
}
