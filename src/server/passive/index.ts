import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { passiveSessions } from "@/db/schema";
import { hashFingerprint } from "@/lib/crypto";
import { env } from "@/lib/env";

/**
 * Upsert a "consistent device" row keyed by `(userId, peppered hash of the
 * FingerprintJS visitorId)`. The visitorId is hashed *before* the DB touch
 * so the row never sees the unhashed value.
 *
 * Returns whether this device has now crossed the consistency threshold
 * (see `PASSIVE_MIN_SESSIONS` / `PASSIVE_MIN_DAYS`) so the AI claim engine
 * can label "Active across multiple sessions" claims as Supported.
 */
export async function recordPassiveBeacon(args: {
  userId: string;
  visitorId: string;
}): Promise<{ consistent: boolean; sessionCount: number }> {
  const fpHash = hashFingerprint(args.visitorId);
  const now = new Date();

  await db
    .insert(passiveSessions)
    .values({
      userId: args.userId,
      fpHash,
      firstSeen: now,
      lastSeen: now,
      sessionCount: 1,
    })
    .onConflictDoUpdate({
      target: [passiveSessions.userId, passiveSessions.fpHash],
      set: {
        lastSeen: now,
        sessionCount: sql`${passiveSessions.sessionCount} + 1`,
      },
    });

  const row = await db.query.passiveSessions.findFirst({
    where: and(
      eq(passiveSessions.userId, args.userId),
      eq(passiveSessions.fpHash, fpHash),
    ),
    columns: { sessionCount: true, firstSeen: true, lastSeen: true },
  });

  if (!row) return { consistent: false, sessionCount: 0 };

  const e = env();
  const ageDays =
    (row.lastSeen.getTime() - row.firstSeen.getTime()) / (1000 * 60 * 60 * 24);
  const consistent =
    row.sessionCount >= e.PASSIVE_MIN_SESSIONS && ageDays >= e.PASSIVE_MIN_DAYS;

  return { consistent, sessionCount: row.sessionCount };
}
