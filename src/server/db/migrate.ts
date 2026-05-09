import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { env } from "@/lib/env";

/**
 * Apply any pending Drizzle migrations against `DATABASE_URL`. Idempotent
 * (drizzle-orm tracks applied migrations in a `__drizzle_migrations` table)
 * so calling this on every boot is safe.
 *
 * Called from `instrumentation.ts` in production. In development we expect
 * contributors to use `npm run db:push` instead, so we skip there to avoid
 * fighting HMR.
 */
export async function runMigrations(): Promise<void> {
  const pool = new Pool({ connectionString: env().DATABASE_URL, max: 2 });
  const db = drizzle(pool);
  const folder = path.join(process.cwd(), "src/db/migrations");
  try {
    await migrate(db, { migrationsFolder: folder });
    console.log("[migrate] applied any pending migrations");
  } finally {
    await pool.end();
  }
}
