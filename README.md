# trustcard

> **Selective Trust Card for Redditors.** Prove your Reddit cred and live presence. Stay anonymous on the rest.

trustcard lets a Reddit user assemble a few trust signals (handle ownership, profile history, live face check, session consistency), pick which claims to share, and mint a one‑time **Trust Card** that they can give to one specific person — by short link or 6‑digit code — that expires in minutes.

The recipient sees only the labelled claims the author chose; nothing else. Every claim on a card is **strictly gated**: it can only appear if the AI claim engine concludes the user's connected Reddit history actually backs it.

This is the open‑source MVP. It is intentionally narrow: **Reddit‑only ownership in v1**, with LinkedIn / Instagram / Twitter and stronger biometric checks planned for Phase 2.

---

## Quickstart (Docker)

Requires Docker and Docker Compose.

```bash
git clone https://github.com/your/trustcard.git
cd trustcard
cp .env.example .env
# Required to use the app at all: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
# NEXTAUTH_SECRET, FINGERPRINT_PEPPER, CARD_SIGNING_SECRET.
# REDDIT_* is OPTIONAL -- leave blank to boot without the Reddit DM
# verification pillar. The app starts; the verify-Reddit page just shows
# "not configured" until you fill the Reddit creds in.
docker compose up --build
```

App is at `http://localhost:3000`.

> The LLM defaults to a local **Ollama** instance at `http://host.docker.internal:11434/v1` with model `llama3.1:8b`. Install Ollama on your host (`brew install ollama && ollama pull llama3.1:8b`) or swap to OpenAI / Groq / OpenRouter / Together by editing `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` in `.env`.

## Quickstart (local dev)

```bash
# 1. Env: required = GOOGLE_*, NEXTAUTH_SECRET, FINGERPRINT_PEPPER,
#         CARD_SIGNING_SECRET. REDDIT_* is optional (see Quickstart above).
cp .env.example .env

# 2. Postgres
docker compose up db -d

# 3. Install + apply schema
npm install
npm run db:push       # dev shortcut: applies schema directly
# or for prod-style migrations: npm run db:generate && npm run db:migrate

# 4. Run
npm run dev
```

## Required setup

### 1. Google OAuth (login)

1. Create a project at [Google Cloud Console](https://console.cloud.google.com/).
2. APIs & Services → OAuth consent screen → External; add yourself as a test user.
3. Credentials → Create credentials → OAuth client ID → Web application.
4. Authorized redirect URI: `${NEXTAUTH_URL}/api/auth/callback/google`
5. Copy the client ID / secret into `.env`.

### 2. Reddit bot account (optional, for DM verification)

> Skip this section to run the app without Reddit verification. The verify
> page will display a clear "Reddit not configured on this server" message
> instead of trying (and failing) to issue codes.

1. Sign in to a Reddit account that you want to use **as the bot** (this is the account users will DM verification codes to).
2. Go to <https://www.reddit.com/prefs/apps> → "create another app" → choose **script**.
3. Redirect URI can be `http://localhost:3000` (it's not used for script apps).
4. Copy the client ID (under the app name) and secret into `.env`.
5. Set `REDDIT_USERNAME` and `REDDIT_PASSWORD` to the **bot account's** credentials.
6. Set `REDDIT_USER_AGENT` to something descriptive, e.g. `trustcard/0.1.0 by u/yourname`.

The bot username is shown dynamically in the verify UI; nothing is hard‑coded.

### 3. LLM (one of):

- **Ollama (default, free, local):** `brew install ollama && ollama pull llama3.1:8b`. No `.env` change needed.
- **OpenAI:** set `LLM_BASE_URL=https://api.openai.com/v1`, `LLM_API_KEY=sk-...`, `LLM_MODEL=gpt-4o-mini`.
- **Groq / OpenRouter / Together / etc.:** any OpenAI‑compatible base URL works.

## What it does

- **Google login.** That is the only login. Reddit/LinkedIn/etc. are *verified*, not used as login.
- **Verify Reddit** by DM'ing a one‑time code to the bot account.
- **Live face check** in the browser only. We use MediaPipe to detect a live face + blink + small head turn. **No image, embedding, or template ever leaves your browser.** The server only stores `passed_at`.
- **Mint a Trust Card.** Pick claims (e.g. "Reddit handle u/foo", "Account age over 5 years", "Active in r/programming", "Live human verified"). The AI claim engine evaluates each against your collected evidence with a strict rubric. **The Mint button stays disabled until every claim is `Supported`.** Card expires in 30 min by default.
- **Share by link or 6‑digit code.** Both work; first view burns the card if you opted in.

See [docs/PRD.md](docs/PRD.md) for the original product spec.

## Privacy

We are honest about what we keep. See [PRIVACY.md](PRIVACY.md) for a per‑field inventory.

Short version:
- We **do** store: your Google `sub` + email + name + avatar, your verified Reddit handles + their public history (distilled into typed columns), your face‑check `passed_at` timestamps, your peppered device fingerprint hash, and your minted cards (until they expire).
- We **do not** store: face images, biometric templates, raw device fingerprints, or anything Reddit doesn't already make public.
- `DELETE /api/me` removes everything in one click.

## Phase 2 (not built yet)

- LinkedIn / Instagram / Twitter / X verification.
- Lenient claim mode for self‑declared fields with prominent warning chips.
- Profile‑pic‑vs‑live‑face cosine match, sybil detection, and reverse image search via the [face-recon](https://github.com/trubot89-code/face-recon) sidecar.
- Configurable card themes; PDF export.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [REVIEW.md](REVIEW.md) (the OSS reviewer checklist that gates every milestone).

## License

MIT — see [LICENSE](LICENSE).
