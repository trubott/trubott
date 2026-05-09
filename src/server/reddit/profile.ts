import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import {
  fetchUserAbout,
  fetchUserComments,
  fetchUserSubmissions,
  type RedditUserAbout,
} from "@/server/reddit/api";

const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const TOP_SUBREDDIT_LIMIT = 10;

/**
 * Distill a Reddit user's public profile into the row-level columns we
 * actually display ("Active in r/X", "5 years old", "12k karma") and keep a
 * `raw_json` blob with a *fixed* allowlist of keys for forward compatibility.
 *
 * Idempotent: `INSERT ... ON CONFLICT DO UPDATE` so two concurrent processes
 * cannot violate the unique index on `(user_id, platform, handle)`. Marks
 * `ownership_verified_at` only on the first verification (preserved across
 * subsequent refreshes via `COALESCE` semantics in the upsert).
 */
export async function upsertRedditProfile(args: {
  userId: string;
  handle: string;
  ownershipJustVerified: boolean;
}): Promise<void> {
  const { userId, handle, ownershipJustVerified } = args;

  const [about, comments, submissions] = await Promise.all([
    fetchUserAbout(handle),
    fetchUserComments(handle, 100).catch(() => []),
    fetchUserSubmissions(handle, 100).catch(() => []),
  ]);

  const top = topSubreddits(
    comments.map((c) => ({ subreddit: c.subreddit, score: c.score })),
    submissions.map((s) => ({ subreddit: s.subreddit, score: s.score })),
  );

  const rawJsonAllowlisted = redactAbout(about);
  const accountCreatedAt = new Date(about.created_utc * 1000);
  const profileUrl = `https://www.reddit.com/user/${about.name}`;
  const profilePicUrl = about.subreddit?.icon_img ?? about.icon_img ?? null;

  const now = new Date();
  const verifiedAt = ownershipJustVerified ? now : null;

  await db
    .insert(connectedAccounts)
    .values({
      userId,
      platform: "reddit",
      handle: about.name,
      profileUrl,
      profilePicUrl,
      bio: about.subreddit?.public_description ?? null,
      fullName: about.subreddit?.title ?? null,
      accountCreatedAt,
      linkKarma: about.link_karma,
      commentKarma: about.comment_karma,
      hasVerifiedEmail: about.has_verified_email,
      isPremium: about.is_gold,
      topSubreddits: top,
      commentCount: comments.length,
      submissionCount: submissions.length,
      rawJson: rawJsonAllowlisted,
      ownershipVerifiedAt: verifiedAt,
      scrapedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        connectedAccounts.userId,
        connectedAccounts.platform,
        connectedAccounts.handle,
      ],
      set: {
        profileUrl,
        profilePicUrl,
        bio: about.subreddit?.public_description ?? null,
        fullName: about.subreddit?.title ?? null,
        accountCreatedAt,
        linkKarma: about.link_karma,
        commentKarma: about.comment_karma,
        hasVerifiedEmail: about.has_verified_email,
        isPremium: about.is_gold,
        topSubreddits: top,
        commentCount: comments.length,
        submissionCount: submissions.length,
        rawJson: rawJsonAllowlisted,
        scrapedAt: now,
        // Preserve the original verification timestamp on subsequent refreshes;
        // only set it for the very first verification.
        ownershipVerifiedAt: ownershipJustVerified
          ? sql`COALESCE(${connectedAccounts.ownershipVerifiedAt}, ${now})`
          : sql`${connectedAccounts.ownershipVerifiedAt}`,
      },
    });
}

/**
 * Lazy refresh: re-pull from Reddit if `scraped_at` is older than 7 days.
 */
export async function refreshIfStale(args: {
  userId: string;
  handle: string;
}): Promise<void> {
  const existing = await db.query.connectedAccounts.findFirst({
    where: and(
      eq(connectedAccounts.userId, args.userId),
      eq(connectedAccounts.platform, "reddit"),
      eq(connectedAccounts.handle, args.handle),
    ),
  });
  if (!existing) return;
  const age = Date.now() - new Date(existing.scrapedAt).getTime();
  if (age < STALE_AFTER_MS) return;
  await upsertRedditProfile({ ...args, ownershipJustVerified: false });
}

/**
 * Reduce two activity streams into a top-N list of subreddits sorted by
 * descending activity count, with summed karma as a tiebreaker.
 */
function topSubreddits(
  comments: Array<{ subreddit: string; score: number }>,
  submissions: Array<{ subreddit: string; score: number }>,
): Array<{ name: string; count: number; karma: number }> {
  const map = new Map<string, { count: number; karma: number }>();
  const bump = (sub: string, score: number) => {
    const norm = sub.toLowerCase();
    const cur = map.get(norm) ?? { count: 0, karma: 0 };
    cur.count += 1;
    cur.karma += score;
    map.set(norm, cur);
  };
  comments.forEach((c) => bump(c.subreddit, c.score));
  submissions.forEach((s) => bump(s.subreddit, s.score));
  return [...map.entries()]
    .map(([name, v]) => ({ name, count: v.count, karma: v.karma }))
    .sort((a, b) => b.count - a.count || b.karma - a.karma)
    .slice(0, TOP_SUBREDDIT_LIMIT);
}

/**
 * Allowlist the keys we copy from `/user/{}/about` into `raw_json`. A future
 * Reddit-side schema change cannot silently land in our DB.
 */
function redactAbout(about: RedditUserAbout): Record<string, unknown> {
  return {
    name: about.name,
    created_utc: about.created_utc,
    link_karma: about.link_karma,
    comment_karma: about.comment_karma,
    has_verified_email: about.has_verified_email,
    is_gold: about.is_gold,
    icon_img: about.icon_img,
    subreddit: about.subreddit
      ? {
          public_description: about.subreddit.public_description,
          title: about.subreddit.title,
          icon_img: about.subreddit.icon_img,
          display_name_prefixed: about.subreddit.display_name_prefixed,
        }
      : null,
  };
}
