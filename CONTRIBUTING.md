# Contributing to trustcard

Thanks for considering a contribution. trustcard is an open‑source project with a stricter‑than‑usual privacy posture, so a few rules exist to keep that posture honest.

## Local setup

```bash
git clone https://github.com/your/trustcard.git
cd trustcard
cp .env.example .env
docker compose up db -d
npm install
npm run db:push
npm run dev
```

## Before opening a PR

1. `npm run typecheck` — must pass.
2. `npm run lint` — must pass.
3. `npm run verify-no-pii` — must pass.
4. If you added or changed a database column, update **all four** of these in the same PR:
   - `src/db/schema.ts`
   - `scripts/allowed_columns.yaml`
   - `PRIVACY.md`
   - The relevant README section.
   The CI guardrail will fail the build otherwise. This is on purpose.
5. Apify cost / rate: if you touch bio verification, document any new env tunables (`VERIFY_SCRAPE_MIN_INTERVAL_MS`, actor IDs) in `.env.example` and README.
6. Run the OSS reviewer subagent locally (see [REVIEW.md](REVIEW.md)) and address any `BLOCK` items.

## Trust contract rules (do not break)

These are non‑negotiable. Pull requests that violate them will be closed without review.

1. **No `multipart/form-data` route handlers.** Liveness runs in the browser; the server has no endpoint that accepts an image. CI enforces this.
2. **No raw biometric data, OAuth tokens, or unhashed device fingerprints in any database column.**
3. **No analytics or third‑party trackers added to the frontend.**
4. **Every public route handler verifies auth or a signed token.**

## Style

- TypeScript strict mode is on. New `any` requires a `// eslint-disable-next-line` and a comment explaining why.
- Server code lives in `src/server/`, route handlers in `src/app/api/**/route.ts`. Keep route handlers thin (parse → call server function → respond).
- Use Drizzle for all database access. No raw SQL except in migrations.
- Prefer Server Components; reach for `"use client"` only for interactivity.

## License

By contributing you agree your contribution is licensed under MIT.
