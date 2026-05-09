/**
 * In-memory token-bucket limiter. Adequate for a single-instance MVP; if
 * trustcard ever scales horizontally these counters need to live in
 * Postgres or Redis. The expiry worker periodically GCs old buckets so
 * memory usage is bounded by `keys * 64 bytes`.
 *
 * `take(key, opts)` returns `{ ok: true }` if the request is within budget,
 * or `{ ok: false, retryAfterMs }` otherwise.
 */

type Bucket = {
  tokens: number;
  lastRefillMs: number;
};

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export type Limit = {
  /** Refill capacity. Allow this many requests per `windowMs`. */
  capacity: number;
  windowMs: number;
};

export function take(key: string, limit: Limit): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    if (buckets.size >= MAX_KEYS) gc(now);
    b = { tokens: limit.capacity, lastRefillMs: now };
    buckets.set(key, b);
  }
  // Continuous refill: tokens accrue linearly.
  const elapsed = now - b.lastRefillMs;
  const refill = (elapsed / limit.windowMs) * limit.capacity;
  if (refill > 0) {
    b.tokens = Math.min(limit.capacity, b.tokens + refill);
    b.lastRefillMs = now;
  }
  if (b.tokens < 1) {
    const retryAfterMs = Math.ceil(((1 - b.tokens) / limit.capacity) * limit.windowMs);
    return { ok: false, retryAfterMs };
  }
  b.tokens -= 1;
  return { ok: true };
}

/**
 * Forcefully consume `n` tokens (used after a known-bad event so an
 * attacker can't spread attempts across slow polls).
 */
export function penalize(key: string, limit: Limit, n: number): void {
  const b = buckets.get(key) ?? {
    tokens: limit.capacity,
    lastRefillMs: Date.now(),
  };
  b.tokens = Math.max(0, b.tokens - n);
  buckets.set(key, b);
}

function gc(now: number) {
  for (const [k, b] of buckets) {
    // Drop any bucket idle for >1h.
    if (now - b.lastRefillMs > 60 * 60 * 1000) buckets.delete(k);
    if (buckets.size < MAX_KEYS / 2) break;
  }
}

/**
 * Best-effort client identifier from common proxy headers.
 *
 * `X-Forwarded-For`, `X-Real-IP`, and `cf-connecting-ip` are CLIENT-CONTROLLED
 * unless a trusted proxy is rewriting them. If the operator has not opted
 * in via `TRUST_PROXY_HEADERS=1`, we IGNORE these headers entirely and
 * collapse all callers into a single shared bucket. That is intentional:
 * better to share the bucket (and possibly DoS yourself) than to let a
 * direct attacker rotate `X-Forwarded-For` and bypass per-IP limits.
 *
 * In a typical deployment behind a CDN / Vercel / Cloudflare you SHOULD
 * set `TRUST_PROXY_HEADERS=1` so the limiter actually keys on the real
 * client IP. The same env flag also gates `face_checks.ip_country`.
 */
export function clientKeyFromRequest(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY_HEADERS === "1";
  if (trustProxy) {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();
    const xrip = request.headers.get("x-real-ip");
    if (xrip) return xrip;
    const cf = request.headers.get("cf-connecting-ip");
    if (cf) return cf;
  }
  return "shared";
}
