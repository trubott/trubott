import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/server/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { take } from "@/lib/rate-limit";
import {
  normalizeBioHandle,
  startBioVerification,
  type BioPlatform,
} from "@/server/social/bio-verify";

const START_LIMIT = { capacity: 10, windowMs: 60 * 60 * 1000 };

const Body = z.object({
  handle: z.string().trim().min(2).max(128),
});

const PLATFORMS = new Set<BioPlatform>(["linkedin", "instagram", "twitter", "reddit"]);

export async function POST(
  request: Request,
  ctx: { params: Promise<{ platform: string }> },
) {
  const csrf = assertSameOrigin(request);
  if (csrf) return NextResponse.json({ error: csrf }, { status: 403 });

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { platform: raw } = await ctx.params;
  if (!PLATFORMS.has(raw as BioPlatform)) {
    return NextResponse.json({ error: "bad_platform" }, { status: 400 });
  }
  const platform = raw as BioPlatform;

  const allowance = take(`verify-bio-start:${userId}:${platform}`, START_LIMIT);
  if (!allowance.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: allowance.retryAfterMs },
      { status: 429 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const { code, expiresAt } = await startBioVerification({
      userId,
      platform,
      pendingHandle: body.handle,
    });
    return NextResponse.json({
      ok: true,
      code,
      expiresAt: expiresAt.toISOString(),
      normalizedHandle: normalizeBioHandle(platform, body.handle),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "invalid_handle") {
      return NextResponse.json({ error: "invalid_handle" }, { status: 400 });
    }
    throw err;
  }
}
