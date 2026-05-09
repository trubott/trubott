import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* users                                                                      */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    googleSub: text("google_sub").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    googleSubUniq: uniqueIndex("users_google_sub_uniq").on(t.googleSub),
    emailUniq: uniqueIndex("users_email_uniq").on(t.email),
  }),
);

/* -------------------------------------------------------------------------- */
/* connected_accounts                                                         */
/* In MVP, platform is always 'reddit'. Phase 2 widens it.                    */
/* -------------------------------------------------------------------------- */

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(), // 'reddit' | (future) 'linkedin' | 'instagram' | 'twitter'
    handle: text("handle").notNull(),
    profileUrl: text("profile_url"),
    profilePicUrl: text("profile_pic_url"),
    bio: text("bio"),
    aboutText: text("about_text"),
    headline: text("headline"),
    fullName: text("full_name"),
    locationText: text("location_text"),
    locationCity: text("location_city"),
    locationState: text("location_state"),
    locationCountry: text("location_country"),
    followersCount: integer("followers_count"),
    connectionsCount: integer("connections_count"),
    accountAgeDays: integer("account_age_days"),
    currentTitle: text("current_title"),
    firstWorkYear: integer("first_work_year"),
    pastRoles: jsonb("past_roles").$type<
      Array<{
        title: string;
        company: string | null;
        startYear: number | null;
        endYear: number | null;
      }>
    >(),

    accountCreatedAt: timestamp("account_created_at", { withTimezone: true }),
    linkKarma: integer("link_karma"),
    commentKarma: integer("comment_karma"),
    hasVerifiedEmail: boolean("has_verified_email"),
    isPremium: boolean("is_premium"),

    topSubreddits: jsonb("top_subreddits").$type<
      Array<{ name: string; count: number; karma: number }>
    >(),
    commentCount: integer("comment_count"),
    submissionCount: integer("submission_count"),

    rawJson: jsonb("raw_json"),

    ownershipVerifiedAt: timestamp("ownership_verified_at", { withTimezone: true }),
    scrapedAt: timestamp("scraped_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userPlatformHandleUniq: uniqueIndex("connected_accounts_user_platform_handle_uniq").on(
      t.userId,
      t.platform,
      t.handle,
    ),
    userIdx: index("connected_accounts_user_idx").on(t.userId),
  }),
);

/* -------------------------------------------------------------------------- */
/* verification_codes                                                         */
/* Active TRST-XXXX codes awaiting a DM to the bot account.                   */
/* -------------------------------------------------------------------------- */

export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(), // reddit | linkedin | instagram | twitter
    code: text("code").notNull(),
    /** Slug/handle the user claims for bio-based verification (LI/IG/X). */
    pendingHandle: text("pending_handle"),
    /** Reddit DM / bio-verify: listen window starts when user clicks SENT. */
    listenStartedAt: timestamp("listen_started_at", { withTimezone: true }),
    listenEndsAt: timestamp("listen_ends_at", { withTimezone: true }),
    /** Throttle Apify re-scrapes during bio verification window. */
    lastBioScrapeAt: timestamp("last_bio_scrape_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    consumedFromHandle: text("consumed_from_handle"),
  },
  (t) => ({
    codeIdx: index("verification_codes_code_idx").on(t.code),
    userIdx: index("verification_codes_user_idx").on(t.userId),
    expiresIdx: index("verification_codes_expires_idx").on(t.expiresAt),
  }),
);

/* -------------------------------------------------------------------------- */
/* consumed_messages                                                          */
/* Bot inbox dedup so a restart doesn't reprocess old DMs.                    */
/* -------------------------------------------------------------------------- */

export const consumedMessages = pgTable("consumed_messages", {
  platform: text("platform").notNull(),
  messageId: text("message_id").notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}, (t) => ({
  pk: primaryKey({ columns: [t.platform, t.messageId] }),
  consumedIdx: index("consumed_messages_consumed_idx").on(t.consumedAt),
}));

/* -------------------------------------------------------------------------- */
/* face_checks                                                                */
/* Browser-side liveness only. No biometric data ever stored.                 */
/* -------------------------------------------------------------------------- */

export const faceChecks = pgTable(
  "face_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    passedAt: timestamp("passed_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    method: text("method").notNull(), // e.g. 'mediapipe-blink-yaw-v1'
    ipCountry: text("ip_country"), // coarse 2-letter code, may be null
    ageMin: integer("age_min"),
    ageMax: integer("age_max"),
    genderEstimate: text("gender_estimate"),
  },
  (t) => ({
    userIdx: index("face_checks_user_idx").on(t.userId),
  }),
);

/* -------------------------------------------------------------------------- */
/* passive_sessions                                                           */
/* Peppered SHA-256 of a FingerprintJS hash. Never the raw fingerprint.       */
/* -------------------------------------------------------------------------- */

export const passiveSessions = pgTable(
  "passive_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fpHash: text("fp_hash").notNull(),
    firstSeen: timestamp("first_seen", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    lastSeen: timestamp("last_seen", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    sessionCount: integer("session_count").notNull().default(1),
  },
  (t) => ({
    userFpUniq: uniqueIndex("passive_sessions_user_fp_uniq").on(t.userId, t.fpHash),
    userIdx: index("passive_sessions_user_idx").on(t.userId),
  }),
);

/* -------------------------------------------------------------------------- */
/* cards                                                                      */
/* Minted Trust Cards. Hard-deleted at expires_at by the cron worker.         */
/* -------------------------------------------------------------------------- */

export type CardClaim = {
  field: string;
  value: string;
  label: "Supported" | "NotSupported" | "SelfDeclared";
  reason: string;
  evidenceExcerpt?: string;
  attribution: string; // e.g. "Reddit u/foo (verified 2026-04-27)"
};

export type CardMode = "verified" | "selfDeclared";

export type CardPayload = {
  title?: string;
  claims: CardClaim[];
  llmModel: string;
  generatedAt: string;
  decision?: "go" | "nogo";
  decisionReason?: string;
  modelMeta?: {
    callsUsed: string[];
    timeouts: string[];
    version: string;
  };
  /**
   * "verified" cards put each claim through the strict AI validator and
   * only mint when every claim is Supported. "selfDeclared" cards are flash
   * persona reveals: claim values are user-declared, the LLM only does a
   * safety review (no toxicity / no PII / no jailbreak), and every claim is
   * labelled SelfDeclared at view time so the recipient knows the source.
   */
  mode?: CardMode;
};

export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(), // base64url, ~16 chars
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    payload: jsonb("payload").$type<CardPayload>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    burnAfterRead: boolean("burn_after_read").notNull().default(false),
    viewedCount: integer("viewed_count").notNull().default(0),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    /**
     * Flash-card recipient links only: 64 lowercase hex chars (256-bit secret).
     * No HMAC — possession of this string is the credential. Null for standard
     * cards that use signed `/c/{id}` URLs instead.
     */
    flashRevealKey: text("flash_reveal_key"),
  },
  (t) => ({
    userIdx: index("cards_user_idx").on(t.userId),
    expiresIdx: index("cards_expires_idx").on(t.expiresAt),
    flashRevealKeyUniq: uniqueIndex("cards_flash_reveal_key_uniq").on(t.flashRevealKey),
  }),
);

/* -------------------------------------------------------------------------- */
/* card_otps                                                                  */
/* 6-digit alternative to the share link.                                     */
/* -------------------------------------------------------------------------- */

export const cardOtps = pgTable(
  "card_otps",
  {
    code: text("code").primaryKey(), // 6-digit, globally unique while live
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    cardIdx: index("card_otps_card_idx").on(t.cardId),
    expiresIdx: index("card_otps_expires_idx").on(t.expiresAt),
  }),
);

/* -------------------------------------------------------------------------- */
/* claim_evals                                                                */
/* Audit trail of what the LLM said for each claim on each card.              */
/* -------------------------------------------------------------------------- */

export const claimEvals = pgTable(
  "claim_evals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    claimField: text("claim_field").notNull(),
    claimValue: text("claim_value").notNull(),
    label: text("label").notNull(), // 'Supported' | 'NotSupported'
    reason: text("reason").notNull(),
    evidenceExcerpt: text("evidence_excerpt"),
    llmModel: text("llm_model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    cardIdx: index("claim_evals_card_idx").on(t.cardId),
  }),
);

/* -------------------------------------------------------------------------- */
/* used_flash_payments                                                        */
/* One Stripe checkout session may mint exactly one flash card.               */
/* -------------------------------------------------------------------------- */

export const usedFlashPayments = pgTable(
  "used_flash_payments",
  {
    stripeSessionId: text("stripe_session_id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    usedAt: timestamp("used_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdx: index("used_flash_payments_user_idx").on(t.userId),
    cardIdx: uniqueIndex("used_flash_payments_card_uniq").on(t.cardId),
  }),
);

/* -------------------------------------------------------------------------- */
/* type exports                                                               */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type NewConnectedAccount = typeof connectedAccounts.$inferInsert;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type FaceCheck = typeof faceChecks.$inferSelect;
export type PassiveSession = typeof passiveSessions.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type CardOtp = typeof cardOtps.$inferSelect;
export type ClaimEval = typeof claimEvals.$inferSelect;
export type UsedFlashPayment = typeof usedFlashPayments.$inferSelect;
