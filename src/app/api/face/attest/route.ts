import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/server/auth";
import { db } from "@/db";
import { faceChecks } from "@/db/schema";
import { assertSameOrigin } from "@/lib/csrf";
import { take } from "@/lib/rate-limit";
import { verifyAndConsume } from "@/server/face/nonce";

/**
 * Accepted MediaPipe pipeline versions. CI / `verify-no-pii.mjs` ensures the
 * server never accepts a multipart upload, so this is the *only* surface
 * face-related attestations come through.
 */
const ALLOWED_METHODS = new Set(["mediapipe-blink-yaw-v1"]);

const ATTEST_LIMIT = { capacity: 10, windowMs: 60_000 };

const Schema = z.object({
  nonce: z.string().min(8),
  exp: z.number().int().positive(),
  sig: z.string().min(8),
  method: z.string().min(1),
  ageMin: z.number().int().min(0).max(120).optional(),
  ageMax: z.number().int().min(0).max(120).optional(),
  genderEstimate: z.string().trim().min(1).max(32).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const csrf = assertSameOrigin(request);
  if (csrf) return NextResponse.json({ error: csrf }, { status: 403 });

  const allowance = take(`face-attest:${userId}`, ATTEST_LIMIT);
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

  if (!ALLOWED_METHODS.has(body.method)) {
    return NextResponse.json({ error: "unknown_method" }, { status: 400 });
  }

  const verdict = verifyAndConsume({
    userId,
    nonce: body.nonce,
    exp: body.exp,
    sig: body.sig,
  });
  if (!verdict.ok) {
    return NextResponse.json({ error: verdict.reason }, { status: 401 });
  }

  // Coarse country code from CDN/proxy headers ONLY if the operator has
  // explicitly opted in by setting TRUST_PROXY_HEADERS=1. Otherwise the
  // headers can be spoofed by the client itself, which would let a user
  // claim any country on their face check. Default: store null.
  const trustProxy = process.env.TRUST_PROXY_HEADERS === "1";
  const ipCountry = trustProxy
    ? (
        request.headers.get("cf-ipcountry") ??
        request.headers.get("x-vercel-ip-country") ??
        null
      )?.toUpperCase() ?? null
    : null;

  await db.insert(faceChecks).values({
    userId,
    method: body.method,
    ipCountry,
    ageMin: body.ageMin ?? null,
    ageMax: body.ageMax ?? null,
    genderEstimate: body.genderEstimate ?? null,
  });

  return NextResponse.json({ ok: true });
}
