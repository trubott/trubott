# Privacy & data inventory

This document is an exhaustive list of every field trustcard's open‑source code is capable of storing about a user, what it is used for, and how long it stays. CI enforces an allowlist (`scripts/allowed_columns.yaml`) so a pull request that adds a new column without updating this document fails the build.

## What's persisted in the database

### `users`
| field | purpose | retention |
|---|---|---|
| `id` | internal user UUID | until user deletes account |
| `google_sub` | stable identifier from Google OAuth | until user deletes account |
| `email` | account recovery, "export my data" emails | until user deletes account |
| `display_name` | shown on the dashboard greeting | until user deletes account |
| `avatar_url` | Google avatar shown in dashboard | until user deletes account |
| `created_at`, `last_seen_at` | analytics‑free session tracking (no third party tools) | until user deletes account |

### `connected_accounts` (Reddit only in v1)
Created when a user successfully verifies a handle via DM code.

| field | source | purpose | retention |
|---|---|---|---|
| `platform`, `handle`, `profile_url`, `profile_pic_url` | Reddit OAuth API | dashboard display + AI claim evidence | until user disconnects or deletes account |
| `bio`, `full_name` | Reddit OAuth API (public) | claim evidence | same |
| `account_created_at`, `link_karma`, `comment_karma` | Reddit OAuth API (public) | claim evidence | same |
| `has_verified_email`, `is_premium` | Reddit OAuth API (public) | claim evidence | same |
| `top_subreddits` (JSONB) | derived from `/user/{h}/comments` + `/submitted` | claim evidence ("Active in r/X") | same |
| `comment_count`, `submission_count` | derived | claim evidence | same |
| `raw_json` (JSONB) | full API responses for forward‑compatibility | re‑deriving distilled fields without re‑fetching | same |
| `scraped_at`, `ownership_verified_at` | timestamps | freshness, audit | same |

### `face_checks`
| field | purpose | retention |
|---|---|---|
| `passed_at`, `method`, `ip_country` | proof a live face was detected at this time, by this method version, from this country (coarse) | until user deletes account |

> **Not stored:** face images, embeddings, landmarks, or any biometric template. The server has no endpoint that accepts an image upload. CI enforces this with a regex ban on `multipart/form-data` route handlers and biometric‑template column names.

> **About `ip_country`:** only persisted when the operator opts in via `TRUST_PROXY_HEADERS=1` and a CDN/proxy is overwriting `cf-ipcountry` / `x-vercel-ip-country`. Without that flag (the default) the column is always `null`, because client‑sent values are spoofable.

> **Single‑instance replay protection:** the face‑attestation nonce store is an in‑memory `Map`. Behind a horizontally scaled deployment a successful liveness can in principle be replayed once per app instance within the 5‑minute nonce TTL. For the MVP this is acceptable; a Postgres‑backed nonce table is a Phase 2 hardening.

### `passive_sessions`
| field | purpose | retention |
|---|---|---|
| `fp_hash` | peppered SHA‑256 of an MIT‑clean, hand‑rolled browser visitor id | until user deletes account |
| `first_seen`, `last_seen`, `session_count` | "consistent user" signal | until user deletes account |

> **Not stored:** the raw visitor id. Pepper is a per‑deployment secret in `.env`, so a DB dump cannot be reversed without also stealing the host's environment.

> **Strength of this signal:** the visitor id is a hash of stable browser properties (UA, screen, timezone, canvas pixel data). A determined user can clear it by switching browsers or rotating private‑mode windows -- this is intentional. The AI validator therefore treats `consistent device` as a weak corroborator, not proof.

### `cards`
Minted Trust Cards.

| field | purpose | retention |
|---|---|---|
| `payload` (JSONB) | the claim list + AI labels + evidence excerpts the recipient sees | **hard‑deleted at `expires_at`** by the cron worker (default 30 min) |
| `expires_at`, `burn_after_read`, `viewed_count` | sharing semantics | same |
| `revoked_at` | manual revocation | same |
| `flash_reveal_key` | optional **64 hex-char secret** for paid flash cards — possession is the credential for `/flashcard/{token}` (no HMAC in URL). Null for standard signed `/c/{id}` links. | same |

### `card_otps`
| field | purpose | retention |
|---|---|---|
| `code`, `expires_at` | 6‑digit alternative to the share link | hard‑deleted at `expires_at` |

### `used_flash_payments`
One Stripe checkout session can mint exactly one flash card.

| field | purpose | retention |
|---|---|---|
| `stripe_session_id`, `user_id`, `card_id`, `used_at` | enforce one-payment -> one flash-card mint and prevent OTP resale/replay | retained until user deletes account |

### `verification_codes` and `consumed_messages`
Bookkeeping for ownership verification: Reddit uses DM codes to our bot; LinkedIn / Instagram / X use an interim flow where you place a TRST code in **public** profile text and we confirm via Apify scrapers (`harvestapi/linkedin-profile-scraper`, `apify/instagram-profile-scraper`, and your configured Twitter actor). Listen-window timestamps gate when we poll Reddit or re-scrape bios.

| table | purpose | retention |
|---|---|---|
| `verification_codes` | active TRST‑XXXX codes, optional pending platform handle, listen-window timestamps, last Apify scrape time | hard‑deleted 10 min after creation |
| `consumed_messages` | bot inbox dedup across restarts | hard‑deleted 24 h after consumption |

### `claim_evals`
For audit transparency, kept alongside the card so users can see why their card minted.

| field | purpose | retention |
|---|---|---|
| `claim_field`, `claim_value`, `label`, `reason`, `evidence_excerpt`, `llm_model` | record of what the LLM said and why | hard‑deleted with the card |

`claim_evals` is only written for **verified-mode** cards (the strict AI provability pipeline). **Self-declared flash cards** skip this audit table by design — there is no provability verdict to record, only a content-safety pass. The card payload itself stores `mode: "selfDeclared"` so the recipient view always renders the "Self-declared" label.

### Self-declared flash cards (persona reveal)

Flash cards have two pipelines, picked by the cardholder at create time:

1. **Verified claims** (default): every claim passes the strict AI validator using Reddit / face check / device-consistency evidence. Identical to a standard card except the link is single-use and paid.
2. **Persona reveal (self-declared)**: structured fields (age / gender / occupation / location / custom note). The LLM only runs a **safety review** — it blocks targeted hate, harassment, threats, jailbreak attempts, and specific PII (phone, full street address, government id, email, full birthdate). It does **not** verify the values. The recipient view labels every value with a clear "Self-declared" tag and a note that the card is anchored to a live face check at mint time.

Self-declared cards still require:
- a recent face check (server-side enforced; mint returns `needs_face_check` otherwise),
- a paid Stripe checkout session (server-side enforced; mint returns `payment_required` otherwise),
- a single-use OTP/link (the card is burned after the first read).

Flash persona cards use **`/flashcard/{token}`** (single-use reveal after confirmation); standard cards keep signed **`/c/{id}`** URLs.

## What we send to third parties

| Third party | What we send | Why | Self‑hostable alternative |
|---|---|---|---|
| Google OAuth | `email`, `profile` scope (read‑only) | login | n/a (only Google login is supported in v1) |
| Reddit OAuth API | bot account creds + your public handle | inbox poll for verification + public profile fetch | n/a (the whole point) |
| Stripe Checkout | your payment session id and payment status | paywall for flash-card OTP minting | disable flash cards or self-host own payment gateway |
| LLM provider (configured by you) | the claim drafts + evidence excerpts at preview time | label each claim Supported/NotSupported | run **Ollama** locally — that's the default |

## Right to erasure

`DELETE /api/me` cascades via Postgres `ON DELETE CASCADE` to every table above. There is no soft‑delete row marked "deleted"; the rows are physically removed.

## What we never do

- We don't run analytics or third‑party trackers. There is no `<script>` from a domain we don't control.
- We don't email you unless you explicitly request a data export.
- We don't share data with anyone outside the third parties above.
- We don't permanently store anything we'd be embarrassed to show you on the `/me` page or in `GET /api/me/export` (Phase 2 endpoint that returns the full per-row JSON of every table above). The `/me` page is a human-readable summary; the JSON export is the authoritative dump.

## Reporting privacy issues

Open a GitHub issue tagged `privacy`. For sensitive disclosures, see [SECURITY.md](SECURITY.md) (added when we have a maintainer).
