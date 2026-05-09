import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/**
 * Generate a verification code based on platform and handle.
 */
export function generateVerificationCode(handle?: string, platform?: string): string {
  if (platform && ["linkedin", "instagram", "twitter", "reddit"].includes(platform)) {
    return "...";
  }
  
  if (!handle) {
    const n = randomBytes(4).readUInt32BE(0) % 10000;
    return `HI-${n.toString().padStart(4, "0")}`;
  }

  // Clean handle to be alphanumeric only for the code
  const clean = handle.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `HI-${clean}`;
}

/** Generate a 6-digit numeric OTP. */
export function generateOtp(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

/**
 * Sign a card share URL: `HMAC(secret, id || "." || expiresAt)`.
 * The signature is base64url-encoded.
 */
export function signCardLink(cardId: string, expiresAtMs: number): string {
  const mac = createHmac("sha256", env().CARD_SIGNING_SECRET);
  mac.update(`${cardId}.${expiresAtMs}`);
  return mac.digest("base64url");
}

export function verifyCardLink(cardId: string, expiresAtMs: number, sig: string): boolean {
  const expected = signCardLink(cardId, expiresAtMs);
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Peppered SHA-256 of a device fingerprint. The pepper is a deployment-wide
 * secret so a DB dump cannot be reversed without also leaking the host env.
 */
export function hashFingerprint(rawFp: string): string {
  const mac = createHmac("sha256", env().FINGERPRINT_PEPPER);
  mac.update(rawFp);
  return mac.digest("hex");
}

/** Random URL-safe identifier for cards. */
export function newCardId(): string {
  return randomBytes(12).toString("base64url");
}

/** 64-char lowercase hex string (32 bytes). Flash-card URL secret — no HMAC. */
export function generateFlashRevealKey(): string {
  return randomBytes(32).toString("hex");
}
