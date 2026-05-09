import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://trustcard:trustcard@localhost:5432/trustcard",
  },
  strict: true,
  verbose: process.env.DRIZZLE_VERBOSE === "1",
} satisfies Config;
