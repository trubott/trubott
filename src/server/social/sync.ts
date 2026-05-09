import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import { env } from "@/lib/env";

export type ScrapedPlatform = "linkedin" | "instagram" | "twitter" | "reddit";

export type SyncProfile = {
  handle: string;
  fullName?: string | null;
  bio?: string | null;
  aboutText?: string | null;
  headline?: string | null;
  profileUrl?: string | null;
  profilePicUrl?: string | null;
  locationText?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  followersCount?: number | null;
  connectionsCount?: number | null;
  accountAgeDays?: number | null;
  currentTitle?: string | null;
  firstWorkYear?: number | null;
  pastRoles?: Array<{
    title: string;
    company: string | null;
    startYear: number | null;
    endYear: number | null;
  }>;
  rawJson?: Record<string, unknown> | null;
};

/** Concatenate text fields from scraped JSON for bio-marker checks. */
export function extractBioSearchText(
  platform: ScrapedPlatform,
  raw: Record<string, unknown>,
): string {
  const parts: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  };

  console.log(`[bio-verify] Extracting text for ${platform}. Raw object keys: ${Object.keys(raw).join(", ")}`);

  if (platform === "linkedin") {
    push(raw.headline);
    push(raw.about);
    push(raw.aboutText);
    push(raw.summary);
    push(raw.firstName);
    push(raw.lastName);
    const loc = raw.location as Record<string, unknown> | undefined;
    if (loc?.linkedinText) push(loc.linkedinText);
    const parsed = loc?.parsed as Record<string, unknown> | undefined;
    if (parsed?.text) push(parsed.text);
  } else if (platform === "instagram") {
    push(raw.biography);
    push(raw.bio);
    push(raw.biographyText);
    push(raw.fullName);
    const about = raw.about as Record<string, unknown> | undefined;
    if (about) {
      push(about.country);
    }
  } else if (platform === "reddit") {
    const sub = raw.subreddit as Record<string, unknown> | undefined;
    push(raw.description);
    push(raw.about);
    push(raw.title);
    push(raw.displayName);
    if (sub) {
      push(sub.public_description);
      push(sub.description);
      push(sub.title);
      push(sub.display_name);
    }
  } else {
    // twitter / X — actor-specific; common keys
    const author = raw.author as Record<string, unknown> | undefined;
    push(raw.description);
    push(raw.biography);
    push(raw.name);
    push(raw.displayName);
    push(raw.location);
    if (author) {
      push(author.description);
      push(author.biography);
      push(author.name);
      push(author.displayName);
      push(author.location);
    }
  }

  const result = parts.join("\n").toUpperCase();
  console.log(`[bio-verify] Searching text for code:\n--- START ---\n${result}\n--- END ---`);
  return result;
}

export function codeAppearsInBioText(code: string, bioSearchText: string): boolean {
  const normalized = code.trim().toUpperCase();
  return normalized.length > 0 && bioSearchText.includes(normalized);
}

export async function isRedditVerifiedForUser(args: {
  userId: string;
  handle: string;
}): Promise<boolean> {
  const row = await db.query.connectedAccounts.findFirst({
    where: and(
      eq(connectedAccounts.userId, args.userId),
      eq(connectedAccounts.platform, "reddit"),
      eq(connectedAccounts.handle, args.handle),
    ),
  });
  return Boolean(row?.ownershipVerifiedAt);
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toYear(v: unknown): number | null {
  const n = num(v);
  if (!n) return null;
  const y = Math.trunc(n);
  return y >= 1950 && y <= 2100 ? y : null;
}

function accountAgeDaysFromDate(value: unknown): number | null {
  const s = str(value);
  if (!s) return null;
  const ts = new Date(s).getTime();
  if (!Number.isFinite(ts)) return null;
  const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : null;
}

function linkedInProfileUrl(slug: string): string {
  const s = slug.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/\/$/, "");
  return `https://www.linkedin.com/in/${s}`;
}

/**
 * Run Apify actor with waitForFinish (blocks until terminal state or timeout).
 */
async function runActorAndFetchFirstItem(
  actorId: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const e = env();
  const token = e.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN not configured");

  const waitSec = Math.min(300, Math.ceil(e.APIFY_RUN_MAX_WAIT_MS / 1000));
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${encodeURIComponent(token)}&waitForFinish=${waitSec}`;

  const runRes = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!runRes.ok) {
    const errBody = await runRes.text().catch(() => "");
    throw new Error(`apify_run_failed_${runRes.status}: ${errBody.slice(0, 200)}`);
  }
  const runJson = (await runRes.json()) as {
    data?: { id: string; status: string; defaultDatasetId?: string };
  };
  const datasetId = runJson.data?.defaultDatasetId;
  if (!datasetId) {
    throw new Error(`apify_no_dataset status=${runJson.data?.status ?? "unknown"}`);
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?token=${encodeURIComponent(token)}&clean=true&limit=10`,
    { cache: "no-store" },
  );
  if (!itemsRes.ok) throw new Error(`apify_items_failed_${itemsRes.status}`);
  const items = (await itemsRes.json()) as Array<Record<string, unknown>>;
  const first = items[0] ?? {};
  
  console.log(`[scraper] Fetch completed. Items count: ${items.length}`);

  if (Object.keys(first).length > 0) {
    console.log(`[scraper] Received data for ${actorId}. Keys: ${Object.keys(first).join(", ")}`);
    console.log(`[scraper] Raw Item Sample:`, JSON.stringify(first, null, 2));
  } else {
    console.warn(`[scraper] No items returned for ${actorId}. Check if profile is public.`);
  }

  return first;
}

function mapLinkedIn(first: Record<string, unknown>, handle: string): SyncProfile {
  const fn = str(first.firstName);
  const ln = str(first.lastName);
  const full = [fn, ln].filter(Boolean).join(" ").trim() || null;
  const location = (first.location as Record<string, unknown> | undefined) ?? {};
  const parsed = (location.parsed as Record<string, unknown> | undefined) ?? {};
  const experience = Array.isArray(first.experience)
    ? first.experience
    : Array.isArray(first.currentPosition)
      ? first.currentPosition
      : [];
  const mappedRoles = experience
    .map((r) => {
      const row = r as Record<string, unknown>;
      const start = (row.startDate as Record<string, unknown> | undefined) ?? {};
      const end = (row.endDate as Record<string, unknown> | undefined) ?? {};
      const title = str(row.position);
      if (!title) return null;
      return {
        title,
        company: str(row.companyName),
        startYear: toYear(start.year),
        endYear: toYear(end.year),
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .slice(0, 5);
  const firstWorkYear =
    mappedRoles
      .map((r) => r.startYear)
      .filter((y): y is number => typeof y === "number")
      .sort((a, b) => a - b)[0] ?? null;
  const registeredAt = str(first.registeredAt);
  const accountAgeDays = registeredAt
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(registeredAt).getTime()) / (1000 * 60 * 60 * 24)),
      )
    : null;

  return {
    handle: str(first.publicIdentifier) ?? handle,
    fullName: full,
    bio: str(first.about) ?? str(first.headline),
    aboutText: str(first.about),
    headline: str(first.headline),
    profileUrl: str(first.linkedinUrl) ?? linkedInProfileUrl(handle),
    profilePicUrl: str(first.photo),
    locationText: str(location.linkedinText) ?? str(parsed.text),
    locationCity: str(parsed.city),
    locationState: str(parsed.state),
    locationCountry: str(parsed.countryFull) ?? str(parsed.country),
    followersCount: num(first.followerCount),
    connectionsCount: num(first.connectionsCount),
    accountAgeDays,
    currentTitle: str((first.currentPosition as Array<Record<string, unknown>> | undefined)?.[0]?.position) ?? mappedRoles[0]?.title ?? null,
    firstWorkYear,
    pastRoles: mappedRoles,
    rawJson: first,
  };
}

function mapInstagram(first: Record<string, unknown>, handle: string): SyncProfile {
  const about = (first.about as Record<string, unknown> | undefined) ?? {};
  const accountAgeDays =
    accountAgeDaysFromDate(first.registeredAt) ??
    accountAgeDaysFromDate(first.accountCreatedAt) ??
    accountAgeDaysFromDate(first.joinedAt) ??
    null;
  return {
    handle: str(first.username) ?? handle.replace(/^@/, ""),
    fullName: str(first.fullName),
    bio: str(first.biography),
    aboutText: str(first.biography),
    headline: null,
    profileUrl: str(first.url) ?? `https://www.instagram.com/${handle.replace(/^@/, "")}`,
    profilePicUrl: str(first.profilePicUrl) ?? str(first.profilePicUrlHD),
    locationText: str(about.country),
    locationCity: null,
    locationState: null,
    locationCountry: str(about.country),
    followersCount: num(first.followersCount) ?? num(first.followers),
    connectionsCount: null,
    accountAgeDays,
    currentTitle: null,
    firstWorkYear: null,
    pastRoles: [],
    rawJson: first,
  };
}

function mapTwitter(first: Record<string, unknown>, handle: string): SyncProfile {
  const author = first.author as Record<string, unknown> | undefined;
  const h = str(first.userName) ?? str(first.username) ?? str(author?.userName) ?? str(author?.username) ?? handle.replace(/^@/, "");
  
  return {
    handle: h ?? handle,
    fullName: str(first.name) ?? str(first.displayName) ?? str(author?.name) ?? str(author?.displayName) ?? h,
    bio: str(first.description) ?? str(first.biography) ?? str(author?.description) ?? str(author?.biography),
    aboutText: str(first.description) ?? str(first.biography) ?? str(author?.description) ?? str(author?.biography),
    headline: null,
    profileUrl: str(first.url) ?? str(author?.url) ?? (h ? `https://twitter.com/${h}` : null),
    profilePicUrl: str(first.profilePicture) ?? str(first.profileImageUrl) ?? str(first.profilePicUrl) ?? str(author?.profilePicture) ?? str(author?.profileImageUrl),
    locationText: str(first.location) ?? str(author?.location),
    locationCity: null,
    locationState: null,
    locationCountry: null,
    followersCount: num(first.followers) ?? num(author?.followers),
    connectionsCount: null,
    accountAgeDays: null,
    currentTitle: null,
    firstWorkYear: null,
    pastRoles: [],
    rawJson: first,
  };
}

function mapReddit(first: Record<string, unknown>, handle: string): SyncProfile {
  const sub = first.subreddit as Record<string, unknown> | undefined;
  const h = str(first.name) ?? str(first.username) ?? str(sub?.display_name) ?? handle.replace(/^u\//, "");
  
  return {
    handle: h,
    fullName: str(sub?.title) ?? str(first.title) ?? str(first.displayName) ?? h,
    bio: str(sub?.public_description) ?? str(first.public_description) ?? str(first.description) ?? str(first.about),
    aboutText: str(sub?.public_description) ?? str(first.public_description) ?? str(first.description) ?? str(first.about),
    headline: str(sub?.title) ?? str(first.title),
    profileUrl: str(first.url) ?? (sub?.url ? `https://www.reddit.com${sub.url}` : `https://www.reddit.com/user/${h}`),
    profilePicUrl: str(first.snoovatar_img) ?? str(sub?.icon_img) ?? str(first.icon_img) ?? str(first.profilePicUrl),
    locationText: null,
    locationCity: null,
    locationState: null,
    locationCountry: null,
    followersCount: num(first.subscribers),
    connectionsCount: null,
    accountAgeDays: null,
    currentTitle: null,
    firstWorkYear: null,
    pastRoles: [],
    rawJson: first,
  };
}

export async function syncApifyProfile(args: {
  platform: ScrapedPlatform;
  handle: string;
}): Promise<SyncProfile> {
  const e = env();
  const token = e.APIFY_TOKEN;
  const rawHandle = args.handle.trim().replace(/^@/, "").replace(/^u\//, "");

  const actorId =
    args.platform === "linkedin"
      ? e.APIFY_LINKEDIN_ACTOR_ID
      : args.platform === "instagram"
        ? e.APIFY_INSTAGRAM_ACTOR_ID
        : args.platform === "reddit"
          ? e.APIFY_REDDIT_ACTOR_ID
          : e.APIFY_TWITTER_ACTOR_ID;

  if (!token || !actorId) {
    const fallbackUrl =
      args.platform === "linkedin"
        ? linkedInProfileUrl(rawHandle)
        : args.platform === "instagram"
          ? `https://www.instagram.com/${rawHandle}`
          : args.platform === "reddit"
            ? `https://www.reddit.com/user/${rawHandle}`
            : `https://twitter.com/${rawHandle}`;
    return {
      handle: rawHandle,
      fullName: null,
      bio: null,
      profileUrl: fallbackUrl,
      profilePicUrl: null,
      rawJson: { source: "fallback-no-apify-config", platform: args.platform },
    };
  }

  let input: Record<string, unknown>;
  if (args.platform === "linkedin") {
    const url = linkedInProfileUrl(rawHandle);
    input = {
      urls: [url],
      profileUrls: [url],
      linkedinUrls: [url],
      proxy: {
        useApifyProxy: true,
      },
    };
  } else if (args.platform === "instagram") {
    input = {
      usernames: [rawHandle],
      directUrls: [`https://www.instagram.com/${rawHandle.replace(/\/$/, "")}/`],
    };
  } else if (args.platform === "reddit") {
    // iskander/Reddit-basic-profile-scraper uses 'username' singular
    input = {
      username: rawHandle,
    };
  } else {
    // apidojo/twitter-profile-scraper
    input = {
      twitterHandles: [rawHandle],
      handles: [rawHandle],
      maxItems: 1,
    };
  }

  const first = await runActorAndFetchFirstItem(actorId, input);

  if (args.platform === "linkedin") return mapLinkedIn(first, rawHandle);
  if (args.platform === "instagram") return mapInstagram(first, rawHandle);
  if (args.platform === "reddit") return mapReddit(first, rawHandle);
  return mapTwitter(first, rawHandle);
}

export async function upsertSyncedSocialAccount(args: {
  userId: string;
  platform: ScrapedPlatform;
  profile: SyncProfile;
}) {
  const now = new Date();
  await db
    .insert(connectedAccounts)
    .values({
      userId: args.userId,
      platform: args.platform,
      handle: args.profile.handle,
      fullName: args.profile.fullName ?? null,
      bio: args.profile.bio ?? null,
      aboutText: args.profile.aboutText ?? null,
      headline: args.profile.headline ?? null,
      profileUrl: args.profile.profileUrl ?? null,
      profilePicUrl: args.profile.profilePicUrl ?? null,
      locationText: args.profile.locationText ?? null,
      locationCity: args.profile.locationCity ?? null,
      locationState: args.profile.locationState ?? null,
      locationCountry: args.profile.locationCountry ?? null,
      followersCount: args.profile.followersCount ?? null,
      connectionsCount: args.profile.connectionsCount ?? null,
      accountAgeDays: args.profile.accountAgeDays ?? null,
      currentTitle: args.profile.currentTitle ?? null,
      firstWorkYear: args.profile.firstWorkYear ?? null,
      pastRoles: args.profile.pastRoles ?? [],
      rawJson: args.profile.rawJson ?? null,
      ownershipVerifiedAt: now,
      scrapedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        connectedAccounts.userId,
        connectedAccounts.platform,
        connectedAccounts.handle,
      ],
      set: {
        fullName: args.profile.fullName ?? null,
        bio: args.profile.bio ?? null,
        aboutText: args.profile.aboutText ?? null,
        headline: args.profile.headline ?? null,
        profileUrl: args.profile.profileUrl ?? null,
        profilePicUrl: args.profile.profilePicUrl ?? null,
        locationText: args.profile.locationText ?? null,
        locationCity: args.profile.locationCity ?? null,
        locationState: args.profile.locationState ?? null,
        locationCountry: args.profile.locationCountry ?? null,
        followersCount: args.profile.followersCount ?? null,
        connectionsCount: args.profile.connectionsCount ?? null,
        accountAgeDays: args.profile.accountAgeDays ?? null,
        currentTitle: args.profile.currentTitle ?? null,
        firstWorkYear: args.profile.firstWorkYear ?? null,
        pastRoles: args.profile.pastRoles ?? [],
        rawJson: args.profile.rawJson ?? null,
        ownershipVerifiedAt: now,
        scrapedAt: now,
      },
    });
}
