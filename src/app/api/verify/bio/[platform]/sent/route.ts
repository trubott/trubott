import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { take } from "@/lib/rate-limit";
import { markBioListenWindow, type BioPlatform } from "@/server/social/bio-verify";

const SENT_LIMIT = { capacity: 20, windowMs: 60 * 60 * 1000 };

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

  const allowance = take(`verify-bio-sent:${userId}:${platform}`, SENT_LIMIT);
  if (!allowance.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: allowance.retryAfterMs },
      { status: 429 },
    );
  }

  const result = await markBioListenWindow(userId, platform);
  if (!result.ok) {
    return NextResponse.json({ error: "no_active_session" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
