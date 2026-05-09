import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/csrf";
import { clientKeyFromRequest, take } from "@/lib/rate-limit";
import { revealFlashCardByKey } from "@/server/cards/mint";

const PER_IP = { capacity: 40, windowMs: 60_000 };
const PER_TOKEN = { capacity: 15, windowMs: 60_000 };

const MSG = "Sorry — either already used or not exist.";

/**
 * POST /api/flashcard/[token]/reveal
 *
 * Burns the flash card and returns the payload. Called only after the recipient
 * confirms on the warning screen — GET /flashcard/[token] never exposes claims.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const csrf = assertSameOrigin(request);
  if (csrf) return NextResponse.json({ error: csrf }, { status: 403 });

  const { token } = await ctx.params;

  const ipKey = `flash-reveal:ip:${clientKeyFromRequest(request)}`;
  const ipAllowance = take(ipKey, PER_IP);
  if (!ipAllowance.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "retry-after": String(Math.ceil(ipAllowance.retryAfterMs / 1000)),
        },
      },
    );
  }

  const tokKey = `flash-reveal:tok:${token}`;
  const tokAllowance = take(tokKey, PER_TOKEN);
  if (!tokAllowance.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "retry-after": String(Math.ceil(tokAllowance.retryAfterMs / 1000)),
        },
      },
    );
  }

  const result = await revealFlashCardByKey(token);
  if (!result.ok) {
    return NextResponse.json({ error: "unavailable", message: MSG }, { status: 404 });
  }

  return NextResponse.json({
    cardId: result.cardId,
    payload: result.payload,
    expiresAt: result.expiresAt.toISOString(),
    burned: result.burned,
  });
}
