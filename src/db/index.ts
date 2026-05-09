import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
type PgModule = typeof import("pg");
type Pool = import("pg").Pool;

import { assertNotBuildPlaceholder, env } from "@/lib/env";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as {
  __pgPool?: Pool;
  __db?: NodePgDatabase<typeof schema>;
};

export function getPool(): Pool {
  if (!globalForDb.__pgPool) {
    // Use runtime require so non-node bundling paths don't try to resolve
    // optional `pg` internals (like fs/pg-native) at compile time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as PgModule;
    const url = env().DATABASE_URL;
    // The shared placeholder-prefix guard catches every label minted via
    // `buildPlaceholder()`; the explicit `build:build@` check catches the
    // one URL-shaped placeholder we use for `DATABASE_URL` (which never
    // gets the prefix because it has to look like a real connection URL).
    assertNotBuildPlaceholder("DATABASE_URL", url);
    if (url.includes("build:build@")) {
      throw new Error(
        "DATABASE_URL is the build-phase placeholder. Set DATABASE_URL in your environment.",
      );
    }
    globalForDb.__pgPool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalForDb.__pgPool;
}

function getDb(): NodePgDatabase<typeof schema> {
  if (!globalForDb.__db) {
    globalForDb.__db = drizzle(getPool(), { schema, casing: "snake_case" });
  }
  return globalForDb.__db;
}

/**
 * Lazily-resolved Drizzle client. We never instantiate the pool or read env
 * vars at module-eval time; the underlying connection is created on first
 * property access. This is what lets `next build` collect page data without
 * a populated `.env`.
 */
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    if (typeof value === "function") return (value as (...a: unknown[]) => unknown).bind(real);
    return value;
  },
});

export type DB = NodePgDatabase<typeof schema>;
export { schema };
