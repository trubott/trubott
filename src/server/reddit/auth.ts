import { env, redditConfigured, redditUserAgent } from "@/lib/env";

/**
 * Reddit OAuth "password grant" for script-type apps. The bot account's
 * username/password (configured in `.env`) authenticates as the bot.
 *
 * The token is held in memory here. It is never written to the database
 * and never logged.
 */

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

let cached: CachedToken | null = null;

/**
 * Returns a usable bearer token for the bot account. Refreshes ~60s before
 * the previous token would actually expire.
 */
export async function getBotToken(): Promise<string> {
  if (!redditConfigured()) {
    throw new RedditConfigurationError(
      "Reddit bot credentials missing. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD in .env.",
    );
  }
  const now = Date.now();
  if (cached && cached.expiresAtMs - now > 60_000) {
    return cached.accessToken;
  }
  cached = await fetchToken();
  return cached.accessToken;
}

async function fetchToken(): Promise<CachedToken> {
  const e = env();
  const basic = Buffer.from(`${e.REDDIT_CLIENT_ID}:${e.REDDIT_CLIENT_SECRET}`).toString(
    "base64",
  );
  const body = new URLSearchParams({
    grant_type: "password",
    username: e.REDDIT_USERNAME ?? "",
    password: e.REDDIT_PASSWORD ?? "",
  });

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "User-Agent": redditUserAgent(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    // Reddit's error body is a small JSON like {"error":"invalid_grant"} or
    // text. We capture only the well-known `error` / `error_description`
    // keys; anything else is dropped so a future addition cannot accidentally
    // surface tokens or secrets.
    const safe = await safeReadAuthError(res);
    throw new RedditAuthError(
      `Reddit token request failed (${res.status}). Verify your bot credentials.`,
      { status: res.status, code: safe },
    );
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!json.access_token) {
    throw new RedditAuthError(
      `Reddit returned no access_token (error=${json.error ?? "unknown"})`,
      { status: 200, code: json.error ?? "no_access_token" },
    );
  }
  return {
    accessToken: json.access_token,
    expiresAtMs: Date.now() + Math.max(60, json.expires_in ?? 3600) * 1000,
  };
}

/** Returns the configured bot's Reddit username, used in the verify UI. */
export function botUsername(): string {
  return env().REDDIT_USERNAME ?? "";
}

async function safeReadAuthError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as { error?: unknown; error_description?: unknown };
      const out: string[] = [];
      if (typeof j.error === "string") out.push(j.error);
      if (typeof j.error_description === "string")
        out.push(j.error_description.slice(0, 80));
      return out.join(": ") || "unknown_error";
    } catch {
      // Non-JSON: keep at most the first 40 chars and only well-known short
      // tokens to avoid accidentally including any future bearer fragment.
      return /^[a-z_ ]{1,40}$/i.test(text) ? text : "unknown_error";
    }
  } catch {
    return "unknown_error";
  }
}

export class RedditAuthError extends Error {
  readonly status: number;
  /** Reddit's machine-readable error code, e.g. "invalid_grant". */
  readonly code: string;
  constructor(message: string, init: { status: number; code: string }) {
    super(message);
    this.name = "RedditAuthError";
    this.status = init.status;
    this.code = init.code;
  }
}

export class RedditConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedditConfigurationError";
  }
}
