import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/server/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { take } from "@/lib/rate-limit";
import { mintCard } from "@/server/cards/mint";
import { verifyFlashPaymentSession } from "@/server/payments/flash";
import {
  MAX_CLAIM_FIELD_CHARS,
  MAX_CLAIM_VALUE_CHARS,
  MAX_CLAIMS_PER_CARD,
} from "@/server/llm/claim";

/** Per-user budget for mint calls (each call invokes the LLM). */
const MINT_LIMIT = { capacity: 10, windowMs: 60_000 };

const Schema = z.object({
  title: z.string().trim().max(80).optional(),
  cardType: z.enum(["standard", "flash"]).default("standard"),
  flashPaymentSessionId: z.string().min(1).optional(),
  burnAfterRead: z.boolean().default(false),
  claims: z
    .array(
      z.object({
        field: z.string().trim().min(1).max(MAX_CLAIM_FIELD_CHARS),
        value: z.string().trim().min(1).max(MAX_CLAIM_VALUE_CHARS),
      }),
    )
    .min(1)
    .max(MAX_CLAIMS_PER_CARD),
});

const ALLOWED_FIELDS = new Set([
  "age",
  "gender",
  "occupation",
  "location",
  "custom note",
  "custom",
  "note",
]);

/**
 * POST /api/cards
 *
 * Mint a Trust Card. The request is rejected (no DB write) if the AI
 * validator labels any claim NotSupported. On success, returns the share
 * URL + 6-digit OTP. Both expire at the same wall-clock time.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const csrf = assertSameOrigin(request);
    if (csrf) return NextResponse.json({ error: csrf }, { status: 403 });

    const allowance = take(`mint:${userId}`, MINT_LIMIT);
    if (!allowance.ok) {
      return NextResponse.json(
        { error: "rate_limited" },
        {
          status: 429,
          headers: { "retry-after": Math.ceil(allowance.retryAfterMs / 1000).toString() },
        },
      );
    }

    let body: z.infer<typeof Schema>;
    try {
      body = Schema.parse(await request.json());
    } catch {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const hasUnsupportedField = body.claims.some(
      (c) => !ALLOWED_FIELDS.has(c.field.trim().toLowerCase()),
    );
    if (hasUnsupportedField) {
      return NextResponse.json(
        { error: "unsupported_claim_field" },
        { status: 400 },
      );
    }

    const burnAfterRead =
      body.cardType === "flash" ? true : body.burnAfterRead;

    if (body.cardType === "flash") {
      if (!body.flashPaymentSessionId) {
        return NextResponse.json({ error: "payment_required" }, { status: 402 });
      }
      const paid = await verifyFlashPaymentSession({
        userId,
        stripeSessionId: body.flashPaymentSessionId,
      });
      if (!paid.paid) {
        return NextResponse.json(
          { error: paid.reason ?? "payment_required" },
          { status: 402 },
        );
      }
    }

    const result = await mintCard({
      userId,
      title: body.title,
      claims: body.claims,
      burnAfterRead,
      flashPaymentSessionId:
        body.cardType === "flash" ? body.flashPaymentSessionId : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.reason,
          decision: result.decision,
          reason: result.decisionReason,
          fieldResults: result.fieldResults,
          modelMeta: result.modelMeta,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      cardId: result.cardId,
      url: result.url,
      otp: result.otp,
      expiresAt: result.expiresAt.toISOString(),
      cardType: body.cardType,
      oneTimeLink: burnAfterRead,
      decision: result.decision,
      reason: result.decisionReason,
      fieldResults: result.fieldResults,
      modelMeta: result.modelMeta,
    });
  } catch (err) {
    console.error("[api/cards] CRITICAL FAILURE:", err);
    const pgCode = (err as { code?: string } | null)?.code;
    const constraint = (err as { constraint?: string } | null)?.constraint;
    if (pgCode === "23505" && constraint === "used_flash_payments_pkey") {
      return NextResponse.json(
        { error: "payment_already_used" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        error: "mint_failed",
        message: err instanceof Error ? err.message : "Internal mint failure",
      },
      { status: 500 },
    );
  }
}
