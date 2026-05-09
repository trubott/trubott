import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/server/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { take } from "@/lib/rate-limit";
import { buildEvidence } from "@/server/cards/evidence";
import {
  MAX_CLAIM_FIELD_CHARS,
  MAX_CLAIM_VALUE_CHARS,
  MAX_CLAIMS_PER_CARD,
} from "@/server/llm/claim";
import { runVerificationDecision } from "@/server/verification/decision";

/** Per-user budget for live previews -- generous because the UI fires it on every Validate click. */
const PREVIEW_LIMIT = { capacity: 30, windowMs: 60_000 };

const Schema = z.object({
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
 * POST /api/claims/preview
 *
 * Runs the claim validator without minting. Used by the create UI to show
 * Supported / NotSupported labels live as the user edits the claim list.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const csrf = assertSameOrigin(request);
  if (csrf) return NextResponse.json({ error: csrf }, { status: 403 });

  const allowance = take(`preview:${userId}`, PREVIEW_LIMIT);
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

  try {
    const hasUnsupportedField = body.claims.some(
      (c) => !ALLOWED_FIELDS.has(c.field.trim().toLowerCase()),
    );
    if (hasUnsupportedField) {
      return NextResponse.json(
        { error: "unsupported_claim_field" },
        { status: 400 },
      );
    }

    const evidence = await buildEvidence(userId);
    const result = await runVerificationDecision({ claims: body.claims, evidence });
    return NextResponse.json({
      decision: result.decision,
      reason: result.reason,
      fieldResults: result.fieldResults,
      modelMeta: result.modelMeta,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "validator_failed",
        message: err instanceof Error ? err.message : "validator failed",
      },
      { status: 502 },
    );
  }
}
