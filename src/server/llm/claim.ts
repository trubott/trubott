import { z } from "zod";

import { completeJson, llmModel } from "@/server/llm/client";

/**
 * Maximum free-text length we allow per claim value. Anything longer is
 * almost certainly a prompt-injection attempt; we hard-truncate before
 * sending to the LLM and the route handlers reject anything over this.
 */
export const MAX_CLAIM_VALUE_CHARS = 200;
export const MAX_CLAIM_FIELD_CHARS = 64;
export const MAX_CLAIMS_PER_CARD = 6;

export type Claim = {
  field: string;
  value: string;
};

export type EvidenceConnectedAccount = {
  platform: string;
  handle: string;
  accountCreatedAt: string | null;
  linkKarma: number | null;
  commentKarma: number | null;
  hasVerifiedEmail: boolean | null;
  isPremium: boolean | null;
  topSubreddits: Array<{ name: string; count: number; karma: number }>;
  bio: string | null;
  ownershipVerifiedAt: string | null;
};

export type Evidence = {
  connectedAccounts: EvidenceConnectedAccount[];
  faceChecks: Array<{ passedAt: string; ipCountry: string | null }>;
  passive: { consistent: boolean; sessionCount: number };
};

export type ClaimVerdict = {
  field: string;
  value: string;
  label: "Supported" | "NotSupported";
  reason: string;
  evidenceExcerpt?: string | null;
};

const VerdictSchema = z.object({
  field: z.string().max(200),
  value: z.string().max(400),
  label: z.enum(["Supported", "NotSupported"]),
  reason: z.string().max(400),
  evidenceExcerpt: z.string().max(400).nullable().optional(),
});

const ResponseSchema = z.object({
  verdicts: z.array(VerdictSchema),
});

const SYSTEM_PROMPT = `You are the trustcard claim validator. The user wants to publish a Trust Card with a small set of factual claims about themselves. Your job is to classify each claim as either "Supported" or "NotSupported", strictly based on the verified evidence provided.

Rules:
- "Supported" means the evidence directly and unambiguously supports the claim. If evidence is missing, weak, indirect, or could plausibly be coincidence, return "NotSupported".
- "NotSupported" means there is no clear evidence, the evidence contradicts the claim, or the claim is unverifiable from the given signals.
- Do not infer beyond the evidence. Do not invent additional facts.
- For every verdict, you MUST include the following keys: "field", "value", "label", "reason", and "evidenceExcerpt".
- "evidenceExcerpt" should be a string quoting the specific signal if Supported, or an empty string "" if NotSupported. NEVER use null.

Output: a single JSON object of the form {"verdicts":[ ... ]}. There must be exactly one verdict per input claim, in the same order. Do not output anything outside the JSON object.`;

/**
 * Evaluate a list of user claims against the provided evidence, returning
 * one verdict per claim. Throws if the LLM produces unparseable output --
 * the caller is expected to treat that as a hard block, not a soft warning.
 */
export async function evaluateClaims(args: {
  claims: Claim[];
  evidence: Evidence;
}): Promise<{
  verdicts: ClaimVerdict[];
  model: string;
  blocked: boolean;
}> {
  const { claims, evidence } = args;
  if (claims.length === 0) {
    return { verdicts: [], model: llmModel(), blocked: true };
  }
  if (claims.length > MAX_CLAIMS_PER_CARD) {
    throw new Error(`too many claims (max ${MAX_CLAIMS_PER_CARD})`);
  }

  const userPayload = JSON.stringify(
    {
      claims: claims.map((c) => ({
        field: c.field.slice(0, MAX_CLAIM_FIELD_CHARS),
        value: c.value.slice(0, MAX_CLAIM_VALUE_CHARS),
      })),
      evidence,
    },
    null,
    2,
  );

  const raw = await completeJson<unknown>({
    system: SYSTEM_PROMPT,
    user: userPayload,
    maxTokens: 1024,
  });
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`claim validator returned malformed JSON: ${parsed.error.message}`);
  }

  // Re-pair LLM verdicts with the original claims by index. This is the
  // only contract we trust the LLM on -- if the count doesn't match we
  // block hard rather than guessing.
  if (parsed.data.verdicts.length !== claims.length) {
    throw new Error(
      `claim validator returned ${parsed.data.verdicts.length} verdicts for ${claims.length} claims`,
    );
  }

  const verdicts: ClaimVerdict[] = parsed.data.verdicts.map((v, i) => {
    const claim = claims[i]!;
    return {
      field: claim.field,
      value: claim.value,
      label: v.label,
      reason: v.reason,
      evidenceExcerpt: v.evidenceExcerpt,
    };
  });

  const blocked = verdicts.some((v) => v.label !== "Supported");
  return { verdicts, model: llmModel(), blocked };
}
