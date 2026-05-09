import { z } from "zod";

/**
 * `next build` runs page-data collection by importing every route module.
 * Some of those modules touch `env()` at import time (NextAuth config, the
 * Drizzle pool). To keep `npm run build` working without secrets present
 * we fall back to placeholders during the build phase only -- the values
 * are never used at runtime because the build phase doesn't serve traffic.
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const BUILD_PLACEHOLDER_PREFIX = "build-only-placeholder-not-a-real-";
const buildPlaceholder = (label: string) =>
  `${BUILD_PLACEHOLDER_PREFIX}${label}-DO-NOT-USE-IN-PROD`;

/**
 * Treats empty strings as `undefined` before further validation. Compose
 * interpolation inserts empty strings for unset variables, which Zod's
 * `.optional()` does NOT accept on its own.
 */
function emptyToUndef<T extends z.ZodType<string>>(inner: T) {
  return z.preprocess((v) => (typeof v === "string" && v.length === 0 ? undefined : v), inner);
}

/**
 * Hard runtime guard -- if any "real" code path ever reaches a build-phase
 * placeholder value, throw immediately so the misconfiguration is loud
 * instead of silently using fake secrets in production.
 */
export function assertNotBuildPlaceholder(label: string, value: string): void {
  if (value.startsWith(BUILD_PLACEHOLDER_PREFIX)) {
    throw new Error(
      `${label} is a build-phase placeholder, but the runtime is using it. ` +
        "This means the production environment is missing a required env var; " +
        "see .env.example.",
    );
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(16),

  DATABASE_URL: z.string().url(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Reddit creds are optional and may arrive as empty strings via docker
  // compose interpolation when the user hasn't set them. Treat empty as
  // unset so a clean `docker compose up` boots without Reddit configured.
  REDDIT_CLIENT_ID: emptyToUndef(z.string().min(1)).optional(),
  REDDIT_CLIENT_SECRET: emptyToUndef(z.string().min(1)).optional(),
  REDDIT_USERNAME: emptyToUndef(z.string().min(1)).optional(),
  REDDIT_PASSWORD: emptyToUndef(z.string().min(1)).optional(),
  // Reddit's API rules require a UA in the form `<platform>:<id>:<version> (by /u/<owner>)`.
  // We don't validate the regex here -- an unset or arbitrary value must
  // not crash the server at boot. `redditUserAgent()` (used only when the
  // verify flow actually fires) enforces the policy at the call site.
  REDDIT_USER_AGENT: emptyToUndef(z.string().min(1)).optional(),
  LINKEDIN_BOT_ID: emptyToUndef(z.string().min(1)).optional(),
  INSTAGRAM_BOT_ID: emptyToUndef(z.string().min(1)).optional(),

  APIFY_TOKEN: emptyToUndef(z.string().min(1)).optional(),
  APIFY_REDDIT_ACTOR_ID: z.string().min(1).default("iskander/Reddit-basic-profile-scraper"),
  APIFY_LINKEDIN_ACTOR_ID: emptyToUndef(z.string().min(1)).optional(),
  APIFY_INSTAGRAM_ACTOR_ID: emptyToUndef(z.string().min(1)).optional(),
  APIFY_TWITTER_ACTOR_ID: emptyToUndef(z.string().min(1)).optional(),
  /** Legacy: continuous Reddit inbox polling (default off — use post-SENT window + status polls). */
  REDDIT_BACKGROUND_POLLER: emptyToUndef(z.enum(["0", "1"])).optional(),
  /** Minimum gap between Apify bio-verification scrapes per attempt (ms). */
  VERIFY_SCRAPE_MIN_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),
  /** Max wait for an Apify actor run to finish (ms). */
  APIFY_RUN_MAX_WAIT_MS: z.coerce.number().int().positive().default(120_000),

  LLM_BASE_URL: z.string().url().default("http://localhost:11434/v1"),
  LLM_API_KEY: z.string().min(1).default("ollama"),
  LLM_MODEL: z.string().min(1).default("llama3.1:8b"),

  FINGERPRINT_PEPPER: z.string().min(16),
  CARD_SIGNING_SECRET: z.string().min(16),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: emptyToUndef(z.string().min(1)).optional(),
  STRIPE_SECRET_KEY: emptyToUndef(z.string().min(1)).optional(),
  STRIPE_WEBHOOK_SECRET: emptyToUndef(z.string().min(1)).optional(),
  STRIPE_FLASH_CARD_PRICE_ID: emptyToUndef(z.string().min(1)).optional(),

  CARD_DEFAULT_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  PASSIVE_MIN_SESSIONS: z.coerce.number().int().positive().default(3),
  PASSIVE_MIN_DAYS: z.coerce.number().int().positive().default(2),

  RAZORPAY_KEY_ID: emptyToUndef(z.string().min(1)).optional(),
  RAZORPAY_KEY_SECRET: emptyToUndef(z.string().min(1)).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const source = isBuildPhase
    ? {
        ...process.env,
        NEXTAUTH_SECRET:
          process.env.NEXTAUTH_SECRET ?? buildPlaceholder("nextauth-secret"),
        DATABASE_URL:
          process.env.DATABASE_URL ?? "postgres://build:build@localhost:5432/build",
        GOOGLE_CLIENT_ID:
          process.env.GOOGLE_CLIENT_ID ?? buildPlaceholder("google-client-id"),
        GOOGLE_CLIENT_SECRET:
          process.env.GOOGLE_CLIENT_SECRET ??
          buildPlaceholder("google-client-secret"),
        FINGERPRINT_PEPPER:
          process.env.FINGERPRINT_PEPPER ?? buildPlaceholder("fingerprint-pepper"),
        CARD_SIGNING_SECRET:
          process.env.CARD_SIGNING_SECRET ?? buildPlaceholder("card-signing-secret"),
        STRIPE_SECRET_KEY:
          process.env.STRIPE_SECRET_KEY ?? buildPlaceholder("stripe-secret-key"),
      }
    : process.env;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nSee .env.example for required keys.`,
    );
  }
  cached = parsed.data;
  return cached;
}

export function redditConfigured(): boolean {
  const e = env();
  return Boolean(
    e.REDDIT_CLIENT_ID &&
      e.REDDIT_CLIENT_SECRET &&
      e.REDDIT_USERNAME &&
      e.REDDIT_PASSWORD &&
      e.REDDIT_USER_AGENT &&
      REDDIT_UA_RE.test(e.REDDIT_USER_AGENT),
  );
}

const REDDIT_UA_RE = /\(by \/u\/[A-Za-z0-9_-]{2,}\)/;

export function redditBackgroundPollerEnabled(): boolean {
  return env().REDDIT_BACKGROUND_POLLER === "1";
}

export function redditUserAgent(): string {
  const ua = env().REDDIT_USER_AGENT;
  if (!ua) {
    throw new Error(
      "REDDIT_USER_AGENT is not set. Reddit's API policy requires a UA in the form 'platform:appid:version (by /u/yourname)'.",
    );
  }
  if (!REDDIT_UA_RE.test(ua)) {
    throw new Error(
      `REDDIT_USER_AGENT does not follow Reddit's policy. Expected format: ` +
        `"platform:appid:version (by /u/yourname)". Got: ${ua.slice(0, 64)}...`,
    );
  }
  return ua;
}

export function stripeConfigured(): boolean {
  const e = env();
  return Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_FLASH_CARD_PRICE_ID);
}
