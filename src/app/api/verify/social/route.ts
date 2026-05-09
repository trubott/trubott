import { NextResponse } from "next/server";

/**
 * Deprecated batch endpoint — replaced by per-platform flows:
 * `/verify/reddit`, `/verify/linkedin`, `/verify/instagram`, `/verify/twitter`
 * and `/api/verify/bio/[platform]/*`.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "deprecated",
      message:
        "Use /verify/reddit and /verify/linkedin (etc.) — batch social verification was removed.",
    },
    { status: 410 },
  );
}
