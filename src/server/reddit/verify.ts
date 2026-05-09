import { and, eq, gt, isNull, lt } from "drizzle-orm";

import { db } from "@/db";
import { connectedAccounts, consumedMessages, verificationCodes } from "@/db/schema";
import { generateVerificationCode } from "@/lib/crypto";
import { redditBackgroundPollerEnabled } from "@/lib/env";
import { fetchInbox, markRead } from "@/server/reddit/api";
import { upsertRedditProfile } from "@/server/reddit/profile";

const CODE_TTL_MINUTES = 10;
const CONSUMED_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const REDDIT_LISTEN_WINDOW_MS = 2 * 60 * 1000;
const CODE_REGEX = /\bHI-([A-Z0-9]{4,})\b/i;

/**
 * Starts the 2-minute Reddit DM listen window for the user's active code.
 * Called when the user clicks "I've sent it".
 */
export async function markRedditListenWindow(userId: string): Promise<{ ok: boolean }> {
  const now = new Date();
  const row = await db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.userId, userId),
      eq(verificationCodes.platform, "reddit"),
      isNull(verificationCodes.consumedAt),
      gt(verificationCodes.expiresAt, now),
    ),
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
  });
  if (!row) return { ok: false };
  const ends = new Date(now.getTime() + REDDIT_LISTEN_WINDOW_MS);
  await db
    .update(verificationCodes)
    .set({ listenStartedAt: now, listenEndsAt: ends })
    .where(eq(verificationCodes.id, row.id));
  return { ok: true };
}

/**
 * Generate (or reuse) a TRST-XXXX code for the given user. If an active,
 * unconsumed code already exists we return it instead of issuing a new one
 * so the user can refresh the page mid-flow without invalidating their DM.
 */
export async function startVerification(userId: string): Promise<{
  code: string;
  expiresAt: Date;
}> {
  const now = new Date();
  const existing = await db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.userId, userId),
      eq(verificationCodes.platform, "reddit"),
      isNull(verificationCodes.consumedAt),
      gt(verificationCodes.expiresAt, now),
    ),
  });
  if (existing) return { code: existing.code, expiresAt: existing.expiresAt };

  const code = generateVerificationCode();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60_000);
  await db.insert(verificationCodes).values({
    userId,
    platform: "reddit",
    code,
    expiresAt,
  });
  return { code, expiresAt };
}

export type VerificationStatus =
  | { state: "no_active_code" }
  | { state: "waiting"; code: string; expiresAt: Date }
  | { state: "matched"; handle: string; matchedAt: Date }
  | { state: "expired"; code: string };

/**
 * Latest status of any verification code this user has issued. The "matched"
 * branch is derived from `connected_accounts` (which is permanent until the
 * user disconnects) rather than `verification_codes` (which expires + is
 * pruned by the cron worker), so a user revisiting `/verify/reddit` weeks
 * later still sees their verified state.
 */
export async function getVerificationStatus(userId: string): Promise<VerificationStatus> {
  const matchedAccount = await db.query.connectedAccounts.findFirst({
    where: and(
      eq(connectedAccounts.userId, userId),
      eq(connectedAccounts.platform, "reddit"),
    ),
    orderBy: (t, { desc }) => [desc(t.ownershipVerifiedAt)],
    columns: { handle: true, ownershipVerifiedAt: true },
  });
  if (matchedAccount?.ownershipVerifiedAt) {
    return {
      state: "matched",
      handle: matchedAccount.handle,
      matchedAt: matchedAccount.ownershipVerifiedAt,
    };
  }

  const latest = await db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.userId, userId),
      eq(verificationCodes.platform, "reddit"),
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  if (!latest) return { state: "no_active_code" };
  if (latest.expiresAt.getTime() < Date.now()) {
    return { state: "expired", code: latest.code };
  }
  return { state: "waiting", code: latest.code, expiresAt: latest.expiresAt };
}

/**
 * Process all current inbox messages for the bot account, consuming any
 * that match an active TRST-XXXX. Idempotent: replays of the same message
 * are filtered by the `consumed_messages` table.
 */
export async function processInbox(): Promise<{ processed: number; matched: number }> {
  const messages = await fetchInbox(25);
  let processed = 0;
  let matched = 0;

  for (const m of messages) {
    processed++;
    const already = await db.query.consumedMessages.findFirst({
      where: and(
        eq(consumedMessages.platform, "reddit"),
        eq(consumedMessages.messageId, m.name),
      ),
    });
    if (already) continue;

    const codeMatch = CODE_REGEX.exec(m.body);
    if (!codeMatch) {
      await db
        .insert(consumedMessages)
        .values({ platform: "reddit", messageId: m.name })
        .onConflictDoNothing();
      continue;
    }
    const code = `HI-${codeMatch[1].toUpperCase()}`;
    const now = new Date();
    const verif = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.code, code),
        eq(verificationCodes.platform, "reddit"),
        isNull(verificationCodes.consumedAt),
        gt(verificationCodes.expiresAt, now),
      ),
    });
    if (!verif) {
      // Code is unknown / expired / already consumed: mark message dedup'd
      // so we don't re-evaluate it, but don't take any action.
      await db
        .insert(consumedMessages)
        .values({ platform: "reddit", messageId: m.name })
        .onConflictDoNothing();
      continue;
    }

    if (!redditBackgroundPollerEnabled()) {
      const nowMs = Date.now();
      if (
        !verif.listenStartedAt ||
        !verif.listenEndsAt ||
        nowMs < verif.listenStartedAt.getTime() ||
        nowMs > verif.listenEndsAt.getTime()
      ) {
        await db
          .insert(consumedMessages)
          .values({ platform: "reddit", messageId: m.name })
          .onConflictDoNothing();
        continue;
      }
    }

    // Atomic claim: only proceed if this transaction wins the consumedAt
    // assignment. Drizzle's `update` with a where clause is enough since
    // `consumedAt` is null in the predicate.
    const claim = await db
      .update(verificationCodes)
      .set({
        consumedAt: now,
        consumedFromHandle: m.author,
      })
      .where(
        and(
          eq(verificationCodes.id, verif.id),
          isNull(verificationCodes.consumedAt),
        ),
      )
      .returning({ id: verificationCodes.id, userId: verificationCodes.userId });

    if (claim.length === 0) continue;
    const { userId } = claim[0];

    try {
      await upsertRedditProfile({
        userId,
        handle: m.author,
        ownershipJustVerified: true,
      });
    } catch (err) {
      // Log the verification-code uuid (internal id), never the Reddit handle.
      console.warn(
        `[reddit] profile fetch failed for verif=${verif.id}:`,
        err instanceof Error ? err.message : err,
      );
      // We still keep the verification matched -- the user will see the
      // handle and we'll lazily refresh the profile next time they hit /me.
    }

    await db
      .insert(consumedMessages)
      .values({ platform: "reddit", messageId: m.name })
      .onConflictDoNothing();
    await markRead(m.name).catch(() => {});
    matched++;
  }
  return { processed, matched };
}

/** Sweep `consumed_messages` rows older than the dedup window. */
export async function pruneOldConsumedMessages(): Promise<void> {
  const cutoff = new Date(Date.now() - CONSUMED_DEDUP_WINDOW_MS);
  await db.delete(consumedMessages).where(lt(consumedMessages.consumedAt, cutoff));
}
