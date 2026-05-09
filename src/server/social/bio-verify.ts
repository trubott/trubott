import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { connectedAccounts, verificationCodes } from "@/db/schema";
import { generateVerificationCode } from "@/lib/crypto";
import { env } from "@/lib/env";
import {
  extractBioSearchText,
  type ScrapedPlatform,
  syncApifyProfile,
  upsertSyncedSocialAccount,
} from "@/server/social/sync";

export type BioPlatform = ScrapedPlatform;

export type BioVerificationStatus =
  | { state: "no_session" }
  | {
      state: "waiting";
      code: string;
      expiresAt: Date;
      pendingHandle: string;
      listenActive: boolean;
      listenEndsAt?: Date;
    }
  | { state: "matched"; handle: string; matchedAt: Date }
  | { state: "expired"; code: string }
  | { state: "listen_expired"; code: string; expiresAt: Date; pendingHandle: string }
  | { state: "blocked"; reason: string };

const CODE_TTL_MINUTES = 10;
const LISTEN_WINDOW_MS = 2 * 60 * 1000;

function hasDotsMarkerAtEdges(text: string): boolean {
  // The haystack is multiple fields joined by \n.
  // Check EACH line independently so dots at end/start of any field (e.g. bio,
  // headline) are detected even when other fields (e.g. fullName, lastName) are
  // appended after them in the concatenated string.
  const lines = text.split("\n");
  return lines.some((line) => {
    const te = line.replace(/\s+$/g, "");
    const ts = line.replace(/^\s+/g, "");
    return /\.{3,}$/.test(te) || /^\.{3,}/.test(ts);
  });
}

function hasLegacyCode(text: string, code: string): boolean {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode || normalizedCode === "...") return false;
  return text.includes(normalizedCode);
}

export function normalizeBioHandle(platform: BioPlatform, raw: string): string {
  let s = raw.trim();
  if (platform === "linkedin") {
    const m = s.match(/linkedin\.com\/in\/([^/?#]+)/i);
    if (m?.[1]) return decodeURIComponent(m[1]).replace(/\/$/, "");
    return s.replace(/^\/+|\/+$/g, "");
  }
  s = s.replace(/^@/, "");
  return platform === "twitter" ? s.toLowerCase() : s.toLowerCase();
}

export async function startBioVerification(args: {
  userId: string;
  platform: BioPlatform;
  pendingHandle: string;
}): Promise<{ code: string; expiresAt: Date }> {
  const handle = normalizeBioHandle(args.platform, args.pendingHandle);
  if (handle.length < 2) throw new Error("invalid_handle");

  await db
    .delete(verificationCodes)
    .where(
      and(
        eq(verificationCodes.userId, args.userId),
        eq(verificationCodes.platform, args.platform),
        isNull(verificationCodes.consumedAt),
      ),
    );

  const now = new Date();
  const code = generateVerificationCode(handle, args.platform);
  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60_000);
  await db.insert(verificationCodes).values({
    userId: args.userId,
    platform: args.platform,
    code,
    pendingHandle: handle,
    expiresAt,
  });
  return { code, expiresAt };
}

export async function markBioListenWindow(userId: string, platform: BioPlatform): Promise<{ ok: boolean }> {
  const now = new Date();
  const row = await db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.userId, userId),
      eq(verificationCodes.platform, platform),
      isNull(verificationCodes.consumedAt),
      gt(verificationCodes.expiresAt, now),
    ),
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
  });
  if (!row?.pendingHandle) return { ok: false };
  const ends = new Date(now.getTime() + LISTEN_WINDOW_MS);
  await db
    .update(verificationCodes)
    .set({ listenStartedAt: now, listenEndsAt: ends })
    .where(eq(verificationCodes.id, row.id));
  return { ok: true };
}

export async function getBioVerificationStatus(
  userId: string,
  platform: BioPlatform,
): Promise<BioVerificationStatus> {
  const matchedAccount = await db.query.connectedAccounts.findFirst({
    where: and(eq(connectedAccounts.userId, userId), eq(connectedAccounts.platform, platform)),
    orderBy: (t, { desc: d }) => [d(t.ownershipVerifiedAt)],
    columns: { handle: true, ownershipVerifiedAt: true },
  });
  if (matchedAccount?.ownershipVerifiedAt) {
    return {
      state: "matched",
      handle: matchedAccount.handle,
      matchedAt: matchedAccount.ownershipVerifiedAt,
    };
  }

  const row = await db.query.verificationCodes.findFirst({
    where: and(eq(verificationCodes.userId, userId), eq(verificationCodes.platform, platform)),
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
  });
  if (!row) return { state: "no_session" };
  if (row.consumedAt) {
    return { state: "no_session" };
  }
  const now = Date.now();
  if (row.expiresAt.getTime() < now) {
    return { state: "expired", code: row.code };
  }

  const pendingHandle = row.pendingHandle ?? "";
  const listenStarted = Boolean(row.listenStartedAt && row.listenEndsAt);
  const listenActive =
    listenStarted &&
    row.listenStartedAt!.getTime() <= now &&
    now <= row.listenEndsAt!.getTime();

  if (listenStarted && now > row.listenEndsAt!.getTime()) {
    return {
      state: "listen_expired",
      code: row.code,
      expiresAt: row.expiresAt,
      pendingHandle,
    };
  }

  if (listenActive) {
    const minGap = env().VERIFY_SCRAPE_MIN_INTERVAL_MS;
    const last = row.lastBioScrapeAt?.getTime() ?? 0;
    if (now - last >= minGap) {
      try {
        const profile = await syncApifyProfile({ platform, handle: pendingHandle });
        const raw = (profile.rawJson ?? {}) as Record<string, unknown>;
        const haystack = extractBioSearchText(platform, raw);
        await db
          .update(verificationCodes)
          .set({ lastBioScrapeAt: new Date() })
          .where(eq(verificationCodes.id, row.id));

        const markerMatched = hasDotsMarkerAtEdges(haystack);
        const legacyMatched = hasLegacyCode(haystack, row.code);
        if (markerMatched || legacyMatched) {
          const takenByAnother = await db.query.connectedAccounts.findFirst({
            where: and(
              eq(connectedAccounts.platform, platform),
              eq(connectedAccounts.handle, profile.handle),
            ),
            columns: { userId: true, ownershipVerifiedAt: true },
          });
          if (
            takenByAnother?.ownershipVerifiedAt &&
            takenByAnother.userId !== userId
          ) {
            return {
              state: "blocked",
              reason:
                "This profile is already verified by another user. Please verify your own profile.",
            };
          }

          const consumedAt = new Date();
          await db
            .update(verificationCodes)
            .set({
              consumedAt,
              consumedFromHandle: pendingHandle,
            })
            .where(eq(verificationCodes.id, row.id));
          await upsertSyncedSocialAccount({
            userId,
            platform,
            profile,
          });
          return {
            state: "matched",
            handle: profile.handle,
            matchedAt: consumedAt,
          };
        }
      } catch (err) {
        console.warn(`[bio-verify] scrape failed ${platform}:`, err instanceof Error ? err.message : err);
        await db
          .update(verificationCodes)
          .set({ lastBioScrapeAt: new Date() })
          .where(eq(verificationCodes.id, row.id));
      }
    }
  }

  return {
    state: "waiting",
    code: row.code,
    expiresAt: row.expiresAt,
    pendingHandle,
    listenActive,
    listenEndsAt: row.listenEndsAt ?? undefined,
  };
}
