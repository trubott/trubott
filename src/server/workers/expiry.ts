import cron from "node-cron";

let started = false;

/**
 * How long bot-inbox dedup rows are kept after the message was consumed.
 * 24h is plenty to absorb restarts and is consistent with what PRIVACY.md
 * advertises.
 */
const CONSUMED_MESSAGE_RETENTION_HOURS = 24;

/**
 * Starts a single cron job that runs every minute and hard-deletes:
 *   - cards / card_otps past their expires_at
 *   - verification_codes past their expires_at (covers consumed + unconsumed)
 *   - consumed_messages older than CONSUMED_MESSAGE_RETENTION_HOURS
 *
 * Called from instrumentation.ts at boot time. Idempotent: a second call
 * is a no-op so HMR doesn't spawn duplicate workers in development.
 */
export function startExpiryWorker(): void {
  if (started) return;
  started = true;

  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const consumedCutoff = new Date(
      now.getTime() - CONSUMED_MESSAGE_RETENTION_HOURS * 60 * 60 * 1000,
    );
    try {
      // Keep heavy DB imports inside the cron task so instrumentation can be
      // parsed in non-node bundling paths without pulling in `pg`.
      const [{ lt }, { db }, schema] = await Promise.all([
        import("drizzle-orm"),
        import("@/db"),
        import("@/db/schema"),
      ]);
      const { cardOtps, cards, consumedMessages, verificationCodes } = schema;

      // OTPs first so a card delete can't leave orphan OTP rows even though
      // the FK has ON DELETE CASCADE.
      await db.delete(cardOtps).where(lt(cardOtps.expiresAt, now));
      await db.delete(cards).where(lt(cards.expiresAt, now));
      await db.delete(verificationCodes).where(lt(verificationCodes.expiresAt, now));
      await db
        .delete(consumedMessages)
        .where(lt(consumedMessages.consumedAt, consumedCutoff));
    } catch (err) {
      console.error("[expiry] sweep failed:", err);
    }
  });

  console.log("[expiry] worker started (runs every minute)");
}
