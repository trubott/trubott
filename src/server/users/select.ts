import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Single shared projection of the signed-in user's row. Both `/api/me` and
 * the `/me` page use this so they cannot drift on which fields are
 * "user-facing safe to render".
 *
 * Notably absent: `googleSub` (internal identifier; not useful to the user,
 * not promised in PRIVACY.md to be visible).
 */
export async function selectMe(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });
}

export type Me = NonNullable<Awaited<ReturnType<typeof selectMe>>>;
