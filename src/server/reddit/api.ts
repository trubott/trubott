import { redditUserAgent } from "@/lib/env";
import { getBotToken } from "@/server/reddit/auth";

const OAUTH_BASE = "https://oauth.reddit.com";

/**
 * Thin typed client for the public Reddit API endpoints we use.
 * All requests carry the bot's bearer token + user agent.
 */

export type RedditMessage = {
  /** Fullname of the message, e.g. "t4_abcd". Stable across the inbox. */
  name: string;
  /** Sender's username, no `u/` prefix. */
  author: string;
  body: string;
  /** Unix seconds. */
  created_utc: number;
  /** Whether we already marked it read. */
  new: boolean;
};

export type RedditUserAbout = {
  name: string;
  created_utc: number;
  link_karma: number;
  comment_karma: number;
  has_verified_email: boolean;
  is_gold: boolean;
  icon_img?: string;
  subreddit?: {
    public_description?: string;
    title?: string;
    icon_img?: string;
    display_name_prefixed?: string;
  };
};

export type RedditListingChild<T> = { kind: string; data: T };
export type RedditListing<T> = {
  kind: "Listing";
  data: { children: RedditListingChild<T>[]; after: string | null };
};

export type RedditCommentLite = {
  subreddit: string;
  score: number;
  body: string;
  created_utc: number;
};

export type RedditSubmissionLite = {
  subreddit: string;
  score: number;
  title: string;
  num_comments: number;
  created_utc: number;
};

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getBotToken();
  const url = path.startsWith("http") ? path : `${OAUTH_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "User-Agent": redditUserAgent(),
    },
    cache: "no-store",
  });
  if (res.status === 429) {
    const retryAfterSec = Number(res.headers.get("retry-after") ?? "60");
    throw new RedditRateLimitError("Reddit rate-limited the bot", {
      retryAfterSec: Number.isFinite(retryAfterSec) ? retryAfterSec : 60,
    });
  }
  return res;
}

/**
 * Fetches up to `limit` recent inbox messages addressed to the bot. We use
 * `/message/inbox` (not `/message/unread`) so a restart can re-read the
 * window in case `consumed_messages` has rows older than Reddit's cap.
 */
export async function fetchInbox(limit = 25): Promise<RedditMessage[]> {
  const res = await authedFetch(`/message/inbox?limit=${limit}&raw_json=1`);
  if (!res.ok) {
    throw new RedditApiError(`inbox fetch failed (${res.status})`, { status: res.status });
  }
  const json = (await res.json()) as RedditListing<{
    name: string;
    author: string;
    body: string;
    created_utc: number;
    new: boolean;
  }>;
  return json.data.children.map((c) => ({
    name: c.data.name,
    author: c.data.author,
    body: c.data.body,
    created_utc: c.data.created_utc,
    new: c.data.new,
  }));
}

/** Mark a single message as read. Best-effort; never throws on 4xx. */
export async function markRead(messageFullname: string): Promise<void> {
  const body = new URLSearchParams({ id: messageFullname });
  const res = await authedFetch(`/api/read_message`, { method: "POST", body });
  if (!res.ok && res.status !== 404) {
    // Don't include the message id (a Reddit-internal identifier) in the log.
    console.warn(`[reddit] markRead -> ${res.status}`);
  }
}

export async function fetchUserAbout(handle: string): Promise<RedditUserAbout> {
  const res = await authedFetch(`/user/${encodeURIComponent(handle)}/about?raw_json=1`);
  if (!res.ok) {
    throw new RedditApiError(`about(${handle}) -> ${res.status}`, { status: res.status });
  }
  const json = (await res.json()) as { kind: "t2"; data: RedditUserAbout };
  return json.data;
}

export async function fetchUserComments(
  handle: string,
  limit = 100,
): Promise<RedditCommentLite[]> {
  const res = await authedFetch(
    `/user/${encodeURIComponent(handle)}/comments?limit=${limit}&raw_json=1`,
  );
  if (!res.ok) {
    throw new RedditApiError(`comments(${handle}) -> ${res.status}`, { status: res.status });
  }
  const json = (await res.json()) as RedditListing<RedditCommentLite>;
  return json.data.children.map((c) => c.data);
}

export async function fetchUserSubmissions(
  handle: string,
  limit = 100,
): Promise<RedditSubmissionLite[]> {
  const res = await authedFetch(
    `/user/${encodeURIComponent(handle)}/submitted?limit=${limit}&raw_json=1`,
  );
  if (!res.ok) {
    throw new RedditApiError(`submitted(${handle}) -> ${res.status}`, { status: res.status });
  }
  const json = (await res.json()) as RedditListing<RedditSubmissionLite>;
  return json.data.children.map((c) => c.data);
}

export class RedditApiError extends Error {
  readonly status: number;
  constructor(message: string, init: { status: number }) {
    super(message);
    this.name = "RedditApiError";
    this.status = init.status;
  }
}

export class RedditRateLimitError extends Error {
  readonly retryAfterSec: number;
  constructor(message: string, init: { retryAfterSec: number }) {
    super(message);
    this.name = "RedditRateLimitError";
    this.retryAfterSec = init.retryAfterSec;
  }
}
