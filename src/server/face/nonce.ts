import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Face-check attestation nonce.
 *
 * The browser receives `{nonce, exp, sig}` from the server, runs the
 * MediaPipe liveness sequence locally, and posts the same triple back. We
 * verify the HMAC, the expiry, and that we haven't already consumed this
 * nonce in the current process. No raw biometric data ever crosses the
 * boundary -- the server's only role is "yes, this token was minted by me
 * within the last 5 minutes for this user, and hasn't been used yet".
 */

const NONCE_TTL_MS = 5 * 60 * 1000;

const consumedNonces = new Map<string, number>();

function gc(now: number) {
  if (consumedNonces.size < 256) return;
  for (const [k, exp] of consumedNonces) {
    if (exp < now) consumedNonces.delete(k);
  }
}

export type FaceNonce = {
  nonce: string;
  exp: number;
  sig: string;
};

export function issueNonce(userId: string): FaceNonce {
  const nonce = randomBytes(16).toString("base64url");
  const exp = Date.now() + NONCE_TTL_MS;
  const sig = sign(userId, nonce, exp);
  return { nonce, exp, sig };
}

export function verifyAndConsume(args: {
  userId: string;
  nonce: string;
  exp: number;
  sig: string;
}): { ok: true } | { ok: false; reason: "expired" | "bad_sig" | "replay" } {
  const { userId, nonce, exp, sig } = args;
  const now = Date.now();
  if (exp < now) return { ok: false, reason: "expired" };
  const expected = sign(userId, nonce, exp);
  if (sig.length !== expected.length) return { ok: false, reason: "bad_sig" };
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return { ok: false, reason: "bad_sig" };
    }
  } catch {
    return { ok: false, reason: "bad_sig" };
  }
  gc(now);
  if (consumedNonces.has(nonce)) return { ok: false, reason: "replay" };
  consumedNonces.set(nonce, exp);
  return { ok: true };
}

function sign(userId: string, nonce: string, exp: number): string {
  const mac = createHmac("sha256", env().NEXTAUTH_SECRET);
  mac.update(`face|${userId}|${nonce}|${exp}`);
  return mac.digest("base64url");
}
