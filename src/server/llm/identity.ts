import { z } from "zod";

import { completeJson, llmModel } from "@/server/llm/client";
import type { VerificationDecision, VerificationFieldResult } from "@/server/verification/types";

const TIMEOUT_MS = 5_000;

type CallMeta = {
  callsUsed: string[];
  timeouts: string[];
};

const AlignmentSchema = z.object({
  status: z.enum(["pass", "fail", "unverifiable"]),
  reason: z.string().min(1).max(260),
});

const AgeExtractSchema = z.object({
  age: z.number().int().min(0).max(120).nullable(),
});

const FinalSchema = z.object({
  decision: z.enum(["go", "nogo"]),
  reason: z.string().min(1).max(260),
});

async function runCall<T>(
  name: string,
  maxTokens: number,
  system: string,
  user: string,
  meta: CallMeta,
  schema: z.ZodType<T>,
): Promise<T | null> {
  meta.callsUsed.push(name);
  try {
    const parsed = await completeJson<unknown>({
      system,
      user,
      maxTokens,
      timeoutMs: TIMEOUT_MS,
    });
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timeout")) meta.timeouts.push(name);
    return null;
  }
}

export async function llmAgeFallback(args: {
  claim: string;
  linkedInSummary: {
    firstWorkYear: number | null;
    headline: string | null;
    roles: Array<{ title: string; company: string | null; startYear: number | null; endYear: number | null }>;
  };
  meta: CallMeta;
}): Promise<VerificationFieldResult> {
  const response = await runCall(
    "age_fallback",
    1800,
    `You check only age consistency from career timeline.
Rules:
- Return pass only if claim age plausibly matches timeline with +/-5 years tolerance.
- Return fail when timeline clearly conflicts.
- Return unverifiable when data is sparse.
Output JSON: {"status":"pass|fail|unverifiable","reason":"..."}.
No extra text.`,
    JSON.stringify(args, null, 2),
    args.meta,
    AlignmentSchema,
  );

  return {
    field: "age",
    claim: args.claim,
    status: response?.status ?? "unverifiable",
    reason: response?.reason ?? "Couldn't verify age from LinkedIn timeline.",
    source: "linkedin",
  };
}

export async function llmExtractAge(args: {
  claim: string;
  meta: CallMeta;
}): Promise<number | null> {
  const response = await runCall(
    "age_extract",
    600,
    `Extract a single integer age from user text.
Rules:
- Return age number only when explicit and unambiguous.
- If missing/ambiguous/non-age number, return null.
Output JSON only: {"age": number|null}.`,
    JSON.stringify({ claim: args.claim }),
    args.meta,
    AgeExtractSchema,
  );
  return response?.age ?? null;
}

export async function llmLocationMatch(args: {
  claim: string;
  linkedInLocation: {
    text: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  };
  meta: CallMeta;
}): Promise<VerificationFieldResult> {
  const response = await runCall(
    "location_match",
    750,
    `You compare a user's claimed location with LinkedIn location.
Examples accepted as pass: "San Francisco" vs "Silicon Valley", "Rhode Island" vs "New York".
Fail on clearly different countries/continents (e.g. California vs Australia).
Output strict JSON: {"status":"pass|fail|unverifiable","reason":"..."}.`,
    JSON.stringify(args, null, 2),
    args.meta,
    AlignmentSchema,
  );
  return {
    field: "location",
    claim: args.claim,
    status: response?.status ?? "unverifiable",
    reason: response?.reason ?? "Couldn't match location with LinkedIn data.",
    source: "linkedin",
  };
}

export async function llmOccupationMatch(args: {
  claim: string;
  linkedInCareer: {
    headline: string | null;
    currentTitle: string | null;
    roles: Array<{ title: string; company: string | null; startYear: number | null; endYear: number | null }>;
  };
  meta: CallMeta;
}): Promise<VerificationFieldResult> {
  const response = await runCall(
    "occupation_match",
    1200,
    `You compare claimed occupation against LinkedIn titles.
Return pass for close semantic matches (e.g. "engineering" vs "Engineering Manager").
Return fail for materially different claims.
Return unverifiable if evidence is weak.
Output JSON only: {"status":"pass|fail|unverifiable","reason":"..."}.`,
    JSON.stringify(args, null, 2),
    args.meta,
    AlignmentSchema,
  );
  return {
    field: "occupation",
    claim: args.claim,
    status: response?.status ?? "unverifiable",
    reason: response?.reason ?? "Couldn't verify occupation from LinkedIn.",
    source: "linkedin",
  };
}

export async function llmCustomNoteMatch(args: {
  claim: string;
  snippets: Array<{ source: "linkedin" | "instagram"; text: string }>;
  meta: CallMeta;
}): Promise<VerificationFieldResult> {
  const response = await runCall(
    "custom_note_match",
    1500,
    `You verify a custom note against short social snippets.
Pass only when snippet meaning clearly aligns with claim.
Fail when claim is contradicted.
Unverifiable when snippets are too weak.
Output JSON only.`,
    JSON.stringify(args, null, 2),
    args.meta,
    AlignmentSchema,
  );
  return {
    field: "customNote",
    claim: args.claim,
    status: response?.status ?? "unverifiable",
    reason: response?.reason ?? "Couldn't verify custom note from social evidence.",
    source: "linkedin",
  };
}

export async function llmGenderFromName(args: {
  claim: string;
  names: string[];
  meta: CallMeta;
}): Promise<VerificationFieldResult> {
  const response = await runCall(
    "gender_name_inference",
    750,
    `Infer likely gender from names only.
Allowed output statuses:
- pass: strong and clear male/female name cluster supports the claim.
- fail: strong and clear male/female signal contradicts claim OR names are gender-neutral/ambiguous.
- unverifiable: insufficient name data.
Treat names like Alex/Jamie/Simran as ambiguous and return fail.
Output JSON only: {"status":"pass|fail|unverifiable","reason":"..."}.`,
    JSON.stringify(args, null, 2),
    args.meta,
    AlignmentSchema,
  );
  return {
    field: "gender",
    claim: args.claim,
    status: response?.status ?? "unverifiable",
    reason: response?.reason ?? "Couldn't infer gender confidently from profile names.",
    source: "linkedin",
  };
}

export async function llmFinalDecision(args: {
  fieldResults: VerificationFieldResult[];
  meta: CallMeta;
}): Promise<Pick<VerificationDecision, "decision" | "reason">> {
  const response = await runCall(
    "final_decision",
    1500,
    `You are the final identity decision engine.
Output must be go or nogo and one short reason.
Hard rule: if any field status is fail or unverifiable, decision must be "nogo".
If all claimed fields are pass, decision is "go".
Output JSON only: {"decision":"go|nogo","reason":"..."}.`,
    JSON.stringify({ fieldResults: args.fieldResults }, null, 2),
    args.meta,
    FinalSchema,
  );

  if (!response) {
    const blocked = args.fieldResults.find((f) => f.status !== "pass");
    if (blocked) return { decision: "nogo", reason: blocked.reason };
    return { decision: "go", reason: "Claims are consistent with available signals." };
  }
  return response;
}

export function newCallMeta(): CallMeta {
  return { callsUsed: [], timeouts: [] };
}

export function modelMeta(base: CallMeta) {
  return {
    callsUsed: base.callsUsed,
    timeouts: base.timeouts,
    version: "v2.0.0",
    model: llmModel(),
  };
}
