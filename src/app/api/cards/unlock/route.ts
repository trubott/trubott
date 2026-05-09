import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { cardOtps, cards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signCardLink } from "@/lib/crypto";
import { assertSameOrigin } from "@/lib/csrf";
import { clientKeyFromRequest, penalize, take } from "@/lib/rate-limit";

const Schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

/**
 * Rate limits.
 *
 * - Per-IP: 20 attempts per minute. Forces an attacker to spread attempts.
 * - Per-code: 5 attempts before the code itself is locked out for the day.
 *   With 10^6 codes and 5 guesses, the per-code success probability is
 *   ~5e-6 -- negligible in the 30-min default window.
 */
const PER_IP = { capacity: 20, windowMs: 60_000 };
const PER_CODE = { capacity: 5, windowMs: 24 * 60 * 60 * 1000 };

/**
 * POST /api/cards/unlock
 *
 * Exchange a 6-digit OTP for a one-time signed share URL. We do not return
 * the card payload here: the redirect to /c/{id} is the single read path,
 * so burn-after-read works the same whether the recipient was given the
 * URL or the OTP.
 *
 * This endpoint does NOT require the requester to be signed in -- the OTP
 * is the credential.
 */
export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return NextResponse.json({ error: csrf }, { status: 403 });

  const ipKey = `unlock:ip:${clientKeyFromRequest(request)}`;
  const ipAllowance = take(ipKey, PER_IP);
  if (!ipAllowance.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "retry-after": Math.ceil(ipAllowance.retryAfterMs / 1000).toString() },
      },
    );
  }

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const codeKey = `unlock:code:${body.code}`;
  const codeAllowance = take(codeKey, PER_CODE);
  if (!codeAllowance.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "retry-after": Math.ceil(codeAllowance.retryAfterMs / 1000).toString() },
      },
    );
  }

  const rows = await db
    .select({
      cardId: cardOtps.cardId,
      expiresAt: cardOtps.expiresAt,
    })
    .from(cardOtps)
    .where(eq(cardOtps.code, body.code))
    .limit(1);

  const row = rows[0];
  if (!row) {
    // Burn an extra attempt slot so a brute-forcer doesn't get full budget.
    penalize(codeKey, PER_CODE, 1);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.expiresAt < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const [cardRow] = await db
    .select({ flashRevealKey: cards.flashRevealKey })
    .from(cards)
    .where(eq(cards.id, row.cardId))
    .limit(1);

  if (cardRow?.flashRevealKey) {
    return NextResponse.json({
      flashPath: `/flashcard/${cardRow.flashRevealKey}`,
    });
  }

  const exp = row.expiresAt.getTime();
  const sig = signCardLink(row.cardId, exp);
  return NextResponse.json({ cardId: row.cardId, exp, sig });
}
