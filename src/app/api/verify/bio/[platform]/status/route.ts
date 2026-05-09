import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { take } from "@/lib/rate-limit";
import { getBioVerificationStatus, type BioPlatform } from "@/server/social/bio-verify";

const STATUS_LIMIT = { capacity: 120, windowMs: 60 * 1000 };

const PLATFORMS = new Set<BioPlatform>(["linkedin", "instagram", "twitter", "reddit"]);

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ platform: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { platform: raw } = await ctx.params;
  if (!PLATFORMS.has(raw as BioPlatform)) {
    return NextResponse.json({ error: "bad_platform" }, { status: 400 });
  }
  const platform = raw as BioPlatform;

  const allowance = take(`verify-bio-status:${userId}:${platform}`, STATUS_LIMIT);
  if (!allowance.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: allowance.retryAfterMs },
      { status: 429 },
    );
  }

  const status = await getBioVerificationStatus(userId, platform);

  if (status.state === "matched") {
    return NextResponse.json({
      state: status.state,
      handle: status.handle,
      matchedAt: status.matchedAt.toISOString(),
    });
  }
  if (status.state === "waiting") {
    return NextResponse.json({
      state: status.state,
      code: status.code,
      expiresAt: status.expiresAt.toISOString(),
      pendingHandle: status.pendingHandle,
      listenActive: status.listenActive,
      listenEndsAt: status.listenEndsAt?.toISOString(),
    });
  }
  if (status.state === "expired") {
    return NextResponse.json({ state: status.state, code: status.code });
  }
  if (status.state === "listen_expired") {
    return NextResponse.json({
      state: status.state,
      code: status.code,
      expiresAt: status.expiresAt.toISOString(),
      pendingHandle: status.pendingHandle,
    });
  }
  if (status.state === "blocked") {
    return NextResponse.json({ state: status.state, reason: status.reason });
  }
  return NextResponse.json({ state: status.state });
}
