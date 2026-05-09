# syntax=docker/dockerfile:1.7
# Multi-stage build for trustcard.
# Final image runs `next start` and the cron-driven background worker
# in the same Node process via `instrumentation.ts`.

ARG NODE_VERSION=20.18.1

# ---------- deps ----------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- builder ----------
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runner ----------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Migrations are applied at boot via instrumentation.ts -> runMigrations().
COPY --from=builder --chown=nextjs:nodejs /app/src/db/migrations ./src/db/migrations
# /privacy renders the on-disk PRIVACY.md so contributors can't drift it
# from the source. Bake it into the runtime image.
COPY --from=builder --chown=nextjs:nodejs /app/PRIVACY.md ./PRIVACY.md

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
