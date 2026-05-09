import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin } from "@/lib/csrf";
import { selectMe } from "@/server/users/select";

/**
 * GET /api/me
 * Returns a small JSON snapshot of the row in `users` for the signed-in
 * caller. The same projection is reused by the `/me` page so the two
 * surfaces cannot drift.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const u = await selectMe(userId);
  if (!u) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(u);
}

/**
 * DELETE /api/me
 * Hard-deletes the signed-in user's `users` row. Every other table that
 * references `users.id` declares `ON DELETE CASCADE`, so this is the single
 * "right to erasure" entry point promised in PRIVACY.md.
 *
 * Defence in depth: we also reject cross-origin requests (NextAuth's session
 * cookie is SameSite=Lax, but a later config change relaxing that should
 * not silently arm one-click account wipe).
 */
export async function DELETE(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return NextResponse.json({ error: csrf }, { status: 403 });

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await db.delete(users).where(eq(users.id, userId));
  // Audit line is intentionally id-less: a count is sufficient signal for
  // ops dashboards and we promise in PRIVACY.md not to log identifiers
  // for the right-to-erasure endpoint specifically.
  console.info(JSON.stringify({ event: "account_deleted" }));

  return NextResponse.json({ ok: true });
}
