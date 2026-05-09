import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  cardOtps,
  cards,
  usedFlashPayments,
  type CardClaim,
  type CardPayload,
} from "@/db/schema";
import { env } from "@/lib/env";
import {
  generateFlashRevealKey,
  newCardId,
  signCardLink,
  verifyCardLink,
} from "@/lib/crypto";
import { buildEvidence } from "@/server/cards/evidence";
import {
  MAX_CLAIMS_PER_CARD,
  MAX_CLAIM_FIELD_CHARS,
  MAX_CLAIM_VALUE_CHARS,
  type Claim,
} from "@/server/llm/claim";
import { runVerificationDecision } from "@/server/verification/decision";

export type MintInput = {
  userId: string;
  title?: string;
  claims: Claim[];
  burnAfterRead: boolean;
  flashPaymentSessionId?: string;
};

export type MintBlocked = {
  ok: false;
  reason: "nogo" | "no_claims";
  decision: "nogo";
  decisionReason: string;
  fieldResults: Array<{
    field: string;
    claim: string;
    status: "pass" | "fail" | "unverifiable" | "skipped";
    reason: string;
    source: "face" | "linkedin" | "instagram" | "rule" | "none";
  }>;
  modelMeta: {
    callsUsed: string[];
    timeouts: string[];
    version: string;
    model: string;
  };
};

export type MintSuccess = {
  ok: true;
  cardId: string;
  url: string;
  otp: string;
  expiresAt: Date;
  decision: "go";
  decisionReason: string;
  fieldResults: Array<{
    field: string;
    claim: string;
    status: "pass" | "fail" | "unverifiable" | "skipped";
    reason: string;
    source: "face" | "linkedin" | "instagram" | "rule" | "none";
  }>;
  modelMeta: {
    callsUsed: string[];
    timeouts: string[];
    version: string;
    model: string;
  };
};

const FIXED_TTL_MINUTES = 10 * 365 * 24 * 60; // 10 years
const MAX_TITLE_LEN = 80;

/**
 * Mint a Trust Card for `userId` after running every claim through the AI
 * validator. If even one claim is not "Supported", we return early with the
 * verdicts and write nothing -- no rejected card is persisted, no audit
 * row, no OTP. The user gets to see why and edit.
 *
 * Inputs are clamped (claims count, claim text length, TTL, title length)
 * before any LLM call to keep prompt-injection surface bounded.
 */
export async function mintCard(input: MintInput): Promise<MintBlocked | MintSuccess> {
  const claims = sanitizeClaims(input.claims);
  if (claims.length === 0) {
    return {
      ok: false,
      reason: "no_claims",
      decision: "nogo",
      decisionReason: "No claims were provided to verify.",
      fieldResults: [],
      modelMeta: { callsUsed: [], timeouts: [], version: "v2.0.0", model: "n/a" },
    };
  }

  const ttlMin = FIXED_TTL_MINUTES;
  const evidence = await buildEvidence(input.userId);
  let decision;
  try {
    decision = await runVerificationDecision({ claims, evidence });
  } catch (err) {
    console.error("[mint] AI decision failed:", err);
    return {
      ok: false,
      reason: "llm_error",
      decision: "nogo",
      decisionReason: "The AI verification service is currently unavailable or timed out.",
      fieldResults: [],
      modelMeta: { callsUsed: [], timeouts: [], version: "v2.0.0", model: env().LLM_MODEL },
    } as any;
  }

  if (decision.decision === "nogo") {
    return {
      ok: false,
      reason: "nogo",
      decision: "nogo",
      decisionReason: decision.reason,
      fieldResults: decision.fieldResults,
      modelMeta: decision.modelMeta,
    };
  }

  const model = decision.modelMeta.model;
  const keyFor = (field: string) => field.toLowerCase().replace(/[^a-z]/g, "");
  const cardClaims: CardClaim[] = claims.map((claim) => {
    const result = decision.fieldResults.find(
      (f) => keyFor(f.field) === keyFor(claim.field),
    );
    const attribution = result
      ? result.source === "face"
        ? "Live face check"
        : result.source === "linkedin"
          ? "LinkedIn profile"
          : result.source === "instagram"
            ? "Instagram profile"
            : "Rule-based check"
      : "Rule-based check";
    return {
      field: claim.field,
      value: claim.value,
      label: "Supported",
      reason: result?.reason ?? "Consistent with available signals.",
      attribution,
    };
  });

  const cardId = newCardId();
  let flashRevealKey: string | undefined;
  if (input.flashPaymentSessionId) {
    flashRevealKey = generateFlashRevealKey();
  }
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMin * 60_000);

  const payload: CardPayload = {
    title: input.title?.slice(0, MAX_TITLE_LEN),
    claims: cardClaims,
    llmModel: model,
    generatedAt: now.toISOString(),
    mode: "verified",
    decision: "go",
    decisionReason: decision.reason,
    modelMeta: decision.modelMeta,
  };

  // OTP is the primary key in `card_otps`. With ~1M codes and overlapping
  // TTLs, a unique-violation is unlikely but possible; retry on collision
  // up to 5 times before bubbling the error to the caller.
  const getOtp = () => {
    const n = Math.floor(100000 + Math.random() * 900000);
    return String(n);
  };

  let otp = getOtp();
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(cards).values({
          id: cardId,
          userId: input.userId,
          payload,
          createdAt: now,
          expiresAt,
          burnAfterRead: input.burnAfterRead,
          viewedCount: 0,
          flashRevealKey: flashRevealKey ?? null,
        });
        if (input.flashPaymentSessionId) {
          await tx.insert(usedFlashPayments).values({
            stripeSessionId: input.flashPaymentSessionId,
            userId: input.userId,
            cardId,
          });
        }
        await tx.insert(cardOtps).values({ code: otp, cardId, expiresAt });
      });
      lastErr = null;
      break;
    } catch (err) {
      const code = (err as { code?: string; constraint?: string } | null)?.code;
      const constraint = (err as { constraint?: string } | null)?.constraint;
      // 23505 == Postgres unique_violation. Anything else is unrecoverable.
      if (code !== "23505") throw err;
      // Retry only OTP collisions; other unique collisions (like reused
      // Stripe checkout session id) must fail immediately.
      if (constraint !== "card_otps_pkey" && constraint !== "cards_flash_reveal_key_uniq")
        throw err;
      lastErr = err;
      otp = getOtp();
      if (constraint === "cards_flash_reveal_key_uniq" && input.flashPaymentSessionId) {
        flashRevealKey = generateFlashRevealKey();
      }
    }
  }
  if (lastErr) throw lastErr;

  const url = flashRevealKey
    ? buildFlashShareUrl(flashRevealKey)
    : (() => {
        const sig = signCardLink(cardId, expiresAt.getTime());
        return buildShareUrl(cardId, expiresAt.getTime(), sig);
      })();

  return {
    ok: true,
    cardId,
    url,
    otp,
    expiresAt,
    decision: "go",
    decisionReason: decision.reason,
    fieldResults: decision.fieldResults,
    modelMeta: decision.modelMeta,
  };
}

export type ResolveInput =
  | { mode: "link"; cardId: string; exp: number; sig: string }
  | { mode: "otp"; code: string };

export type ResolveResult =
  | { ok: false; reason: "not_found" | "expired" | "bad_signature" | "burnt" }
  | {
      ok: true;
      cardId: string;
      payload: CardPayload;
      expiresAt: Date;
      burned: boolean;
    };

/**
 * Resolve a card by either a signed share URL or a 6-digit OTP, atomically
 * incrementing the view counter and burning the card if `burnAfterRead` is
 * set. Concurrent calls are racy but every losing tx still gets `burned`
 * accurately because the burn is decided server-side in the same statement.
 */
export async function resolveCardForView(
  input: ResolveInput,
): Promise<ResolveResult> {
  let cardId: string;
  if (input.mode === "link") {
    if (!verifyCardLink(input.cardId, input.exp, input.sig)) {
      return { ok: false, reason: "bad_signature" };
    }
    if (input.exp < Date.now()) return { ok: false, reason: "expired" };
    cardId = input.cardId;
  } else {
    const otpRow = await db
      .select({ cardId: cardOtps.cardId, expiresAt: cardOtps.expiresAt })
      .from(cardOtps)
      .where(eq(cardOtps.code, input.code))
      .limit(1);
    const row = otpRow[0];
    if (!row) return { ok: false, reason: "not_found" };
    if (row.expiresAt < new Date()) return { ok: false, reason: "expired" };
    cardId = row.cardId;
  }

  const result = await db.transaction(async (tx) => {
    const [card] = await tx
      .select({
        id: cards.id,
        payload: cards.payload,
        expiresAt: cards.expiresAt,
        burnAfterRead: cards.burnAfterRead,
        revokedAt: cards.revokedAt,
      })
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1);

    if (!card) return { ok: false as const, reason: "not_found" as const };
    if (card.revokedAt) return { ok: false as const, reason: "burnt" as const };
    if (card.expiresAt < new Date())
      return { ok: false as const, reason: "expired" as const };

    if (card.burnAfterRead) {
      await tx
        .update(cards)
        .set({
          viewedCount: sql`${cards.viewedCount} + 1`,
          revokedAt: new Date(),
        })
        .where(eq(cards.id, card.id));
    } else {
      await tx
        .update(cards)
        .set({ viewedCount: sql`${cards.viewedCount} + 1` })
        .where(eq(cards.id, card.id));
    }

    return {
      ok: true as const,
      cardId: card.id,
      payload: card.payload,
      expiresAt: card.expiresAt,
      burned: card.burnAfterRead,
    };
  });

  return result;
}

function sanitizeClaims(claims: Claim[]): Claim[] {
  const out: Claim[] = [];
  for (const c of claims.slice(0, MAX_CLAIMS_PER_CARD)) {
    const field = (c.field ?? "").trim().slice(0, MAX_CLAIM_FIELD_CHARS);
    const value = (c.value ?? "").trim().slice(0, MAX_CLAIM_VALUE_CHARS);
    if (!field || !value) continue;
    out.push({ field, value });
  }
  return out;
}
function buildShareUrl(cardId: string, expMs: number, sig: string): string {
  const base = env().NEXTAUTH_URL.replace(/\/+$/, "");
  return `${base}/c/${cardId}?exp=${expMs}&sig=${encodeURIComponent(sig)}`;
}

function buildFlashShareUrl(flashKey: string): string {
  const base = env().NEXTAUTH_URL.replace(/\/+$/, "");
  return `${base}/flashcard/${flashKey}`;
}

/** 64 lowercase hex chars — possession is the credential for `/flashcard/{token}`. */
export const FLASH_REVEAL_KEY_HEX_LEN = 64;

export function isValidFlashRevealKey(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

/**
 * Atomically burns a flash card (revokes + increments views) and returns the
 * payload. Used only after the recipient confirms on the warning screen.
 */
export async function revealFlashCardByKey(token: string): Promise<
  | { ok: true; cardId: string; payload: CardPayload; expiresAt: Date; burned: boolean }
  | { ok: false }
> {
  if (!isValidFlashRevealKey(token)) return { ok: false };

  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: cards.id,
        payload: cards.payload,
        expiresAt: cards.expiresAt,
        revokedAt: cards.revokedAt,
        burnAfterRead: cards.burnAfterRead,
      })
      .from(cards)
      .where(eq(cards.flashRevealKey, token))
      .limit(1);
    const card = rows[0];
    if (!card) return { ok: false as const };
    if (!card.burnAfterRead) return { ok: false as const };
    if (card.revokedAt) return { ok: false as const };
    if (card.expiresAt < new Date()) return { ok: false as const };

    await tx
      .update(cards)
      .set({
        viewedCount: sql`${cards.viewedCount} + 1`,
        revokedAt: new Date(),
      })
      .where(eq(cards.id, card.id));

    return {
      ok: true as const,
      cardId: card.id,
      payload: card.payload,
      expiresAt: card.expiresAt,
      burned: card.burnAfterRead,
    };
  });

  return result;
}
