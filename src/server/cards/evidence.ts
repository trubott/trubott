import { and, desc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import {
  connectedAccounts,
  faceChecks,
  passiveSessions,
} from "@/db/schema";
import { env } from "@/lib/env";
import type {
  FaceEvidence,
  InstagramDigest,
  LinkedInDigest,
  VerificationEvidence,
} from "@/server/verification/types";

/**
 * Hard caps applied before any LLM call. These bound the prompt-injection
 * surface from user-controlled Reddit fields (bio, subreddit names). The
 * validator system prompt also tells the model to ignore embedded
 * instructions, but we don't trust the model alone.
 */
const MAX_BIO_CHARS = 256;
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F\u200B-\u200F\u2028\u2029]/g;
const MAX_HEADLINE_CHARS = 200;
const MAX_LOCATION_CHARS = 120;
const MAX_ROLES = 4;

function clampText(text: string | null, max: number): string | null {
  if (!text) return null;
  const cleaned = text.replace(CONTROL_CHAR_RE, " ").trim();
  if (cleaned.length === 0) return null;
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

function clampBio(bio: string | null): string | null {
  if (!bio) return null;
  const cleaned = bio.replace(CONTROL_CHAR_RE, " ").trim();
  if (cleaned.length === 0) return null;
  return cleaned.length > MAX_BIO_CHARS
    ? cleaned.slice(0, MAX_BIO_CHARS) + "…"
    : cleaned;
}

/**
 * Build the evidence bundle the AI claim validator gets to see. This is the
 * sole canonical projection of "what the trustcard service knows about this
 * user" -- if a signal isn't here, the AI cannot use it.
 *
 * Notes on what is *deliberately omitted*:
 *   - users.email, users.googleSub, users.displayName: the LLM has no
 *     business deciding whether email-based claims are supported.
 *   - connectedAccounts.rawJson: we already distilled the relevant fields.
 *   - passive_sessions.fpHash: a peppered hash is meaningless to the LLM.
 *   - face_checks.id / method version: we only need "did liveness pass and
 *     when" plus the coarse country.
 */
function linkedInTier(input: {
  verified: boolean;
  connectionsCount: number | null;
  accountAgeDays: number | null;
}): LinkedInDigest["tier"] {
  if (!input.verified) return "none";
  const connections = input.connectionsCount ?? 0;
  const ageDays = input.accountAgeDays ?? 0;
  
  // If we have strong connection signals, we can be more lenient on account age
  if (connections >= 500 && (ageDays >= 365 || ageDays === 0)) return "strong";
  if (connections >= 150 && (ageDays >= 180 || ageDays === 0)) return "medium";
  return "weak";
}

export async function buildEvidence(userId: string): Promise<VerificationEvidence> {
  const [accountsRows, faceRows, passiveRows] = await Promise.all([
    db
      .select({
        platform: connectedAccounts.platform,
        handle: connectedAccounts.handle,
        fullName: connectedAccounts.fullName,
        bio: connectedAccounts.bio,
        aboutText: connectedAccounts.aboutText,
        headline: connectedAccounts.headline,
        locationText: connectedAccounts.locationText,
        locationCity: connectedAccounts.locationCity,
        locationState: connectedAccounts.locationState,
        locationCountry: connectedAccounts.locationCountry,
        followersCount: connectedAccounts.followersCount,
        connectionsCount: connectedAccounts.connectionsCount,
        accountAgeDays: connectedAccounts.accountAgeDays,
        currentTitle: connectedAccounts.currentTitle,
        firstWorkYear: connectedAccounts.firstWorkYear,
        pastRoles: connectedAccounts.pastRoles,
        ownershipVerifiedAt: connectedAccounts.ownershipVerifiedAt,
      })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.userId, userId)),
    db
      .select({
        passedAt: faceChecks.passedAt,
        ipCountry: faceChecks.ipCountry,
        ageMin: faceChecks.ageMin,
        ageMax: faceChecks.ageMax,
        genderEstimate: faceChecks.genderEstimate,
      })
      .from(faceChecks)
      .where(eq(faceChecks.userId, userId))
      .orderBy(desc(faceChecks.passedAt))
      .limit(5),
    db
      .select({
        firstSeen: passiveSessions.firstSeen,
        lastSeen: passiveSessions.lastSeen,
        sessionCount: passiveSessions.sessionCount,
      })
      .from(passiveSessions)
      .where(eq(passiveSessions.userId, userId)),
  ]);

  const e = env();
  let consistent = false;
  let bestSessionCount = 0;
  for (const r of passiveRows) {
    const ageDays =
      (r.lastSeen.getTime() - r.firstSeen.getTime()) / (1000 * 60 * 60 * 24);
    if (r.sessionCount > bestSessionCount) bestSessionCount = r.sessionCount;
    if (r.sessionCount >= e.PASSIVE_MIN_SESSIONS && ageDays >= e.PASSIVE_MIN_DAYS) {
      consistent = true;
    }
  }

  const verifiedAccounts = accountsRows
      // Accounts without ownership confirmation cannot stand as evidence.
      .filter((a) => a.ownershipVerifiedAt !== null)
      .map((a) => ({
        ...a,
        bio: clampBio(a.bio),
        aboutText: clampBio(a.aboutText),
        headline: clampText(a.headline, MAX_HEADLINE_CHARS),
        locationText: clampText(a.locationText, MAX_LOCATION_CHARS),
      }));

  const linkedInRow = verifiedAccounts.find((a) => a.platform === "linkedin");
  const instagramRow = verifiedAccounts.find((a) => a.platform === "instagram");
  const redditHandles = verifiedAccounts
    .filter((a) => a.platform === "reddit")
    .map((a) => a.handle);

  const linkedIn: LinkedInDigest | null = linkedInRow
    ? {
        verified: Boolean(linkedInRow.ownershipVerifiedAt),
        fullName: linkedInRow.fullName,
        connectionsCount: linkedInRow.connectionsCount,
        followersCount: linkedInRow.followersCount,
        accountAgeDays: linkedInRow.accountAgeDays,
        headline: linkedInRow.headline,
        about: linkedInRow.aboutText ?? linkedInRow.bio,
        locationText: linkedInRow.locationText,
        city: linkedInRow.locationCity,
        state: linkedInRow.locationState,
        country: linkedInRow.locationCountry,
        currentTitle: linkedInRow.currentTitle,
        firstWorkYear: linkedInRow.firstWorkYear,
        pastRoles: (linkedInRow.pastRoles ?? [])
          .filter((r): r is { title: string; company: string | null; startYear: number | null; endYear: number | null } => {
            if (!r || typeof r !== "object") return false;
            const row = r as Record<string, unknown>;
            return typeof row.title === "string" && row.title.trim().length > 0;
          })
          .map((r) => ({
            title: String(r.title).slice(0, 80),
            company: typeof r.company === "string" ? r.company.slice(0, 80) : null,
            startYear: typeof r.startYear === "number" ? r.startYear : null,
            endYear: typeof r.endYear === "number" ? r.endYear : null,
          }))
          .slice(0, MAX_ROLES),
        tier: linkedInTier({
          verified: true,
          connectionsCount: linkedInRow.connectionsCount,
          accountAgeDays: linkedInRow.accountAgeDays,
        }),
      }
    : null;

  const instagram: InstagramDigest | null = instagramRow
    ? {
        verified: Boolean(instagramRow.ownershipVerifiedAt),
        fullName: instagramRow.fullName,
        followersCount: instagramRow.followersCount,
        accountAgeDays: instagramRow.accountAgeDays,
        bio: instagramRow.aboutText ?? instagramRow.bio,
      }
    : null;

  const face: FaceEvidence | null = faceRows[0]
    ? {
        passedAt: faceRows[0].passedAt.toISOString(),
        ipCountry: faceRows[0].ipCountry,
        ageMin: faceRows[0].ageMin,
        ageMax: faceRows[0].ageMax,
        genderEstimate: faceRows[0].genderEstimate,
      }
    : null;

  return {
    linkedIn,
    instagram,
    redditHandles,
    face,
    passive: { consistent, sessionCount: bestSessionCount },
  };
}

/** Returns true if the user has at least one ownership-verified account. */
export async function hasAnyVerifiedAccount(userId: string): Promise<boolean> {
  const row = await db
    .select({ id: connectedAccounts.id })
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.userId, userId),
        isNotNull(connectedAccounts.ownershipVerifiedAt),
      ),
    )
    .limit(1);
  return row.length > 0;
}
