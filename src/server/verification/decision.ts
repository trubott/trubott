import {
  llmAgeFallback,
  llmExtractAge,
  llmFinalDecision,
  llmGenderFromName,
  llmLocationMatch,
  llmOccupationMatch,
  modelMeta,
  newCallMeta,
} from "@/server/llm/identity";
import type {
  VerificationDecision,
  VerificationEvidence,
  VerificationFieldResult,
} from "@/server/verification/types";

type Claim = { field: string; value: string };

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function extractClaim(claims: Claim[], names: string[]): string | null {
  const wanted = names.map(norm);
  const match = claims.find((c) => wanted.includes(norm(c.field)));
  const value = match?.value.trim() ?? "";
  return value.length > 0 ? value : null;
}

function toAge(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/\d{1,3}/);
  if (!m) return null;
  const n = Number(m[0]);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 120) return null;
  return n;
}

function simpleSimilarity(a: string, b: string): boolean {
  return norm(a) === norm(b);
}

function linkedInCredibleForGender(evidence: VerificationEvidence): boolean {
  const li = evidence.linkedIn;
  if (!li) return false;
  const connections = li.connectionsCount ?? 0;
  const ageDays = li.accountAgeDays ?? 0;
  return li.verified && connections >= 300 && ageDays >= 180;
}

function instagramCredibleForGender(evidence: VerificationEvidence): boolean {
  const ig = evidence.instagram;
  if (!ig) return false;
  const followers = ig.followersCount ?? 0;
  return followers >= 1000;
}

export async function runVerificationDecision(input: {
  claims: Claim[];
  evidence: VerificationEvidence;
}): Promise<VerificationDecision> {
  const claims = input.claims;
  const evidence = input.evidence;
  const meta = newCallMeta();
  const fieldResults: VerificationFieldResult[] = [];

  const ageClaimRaw = extractClaim(claims, ["age"]);
  const genderClaim = extractClaim(claims, ["gender"]);
  const occupationClaim = extractClaim(claims, ["occupation"]);
  const locationClaim = extractClaim(claims, ["location"]);
  const customClaim = extractClaim(claims, ["custom note", "note", "custom"]);

  if (ageClaimRaw) {
    let ageClaim = toAge(ageClaimRaw);
    if (ageClaim == null) {
      ageClaim = await llmExtractAge({ claim: ageClaimRaw, meta });
    }
    const face = evidence.face;
    if (ageClaim == null) {
      fieldResults.push({
        field: "age",
        claim: ageClaimRaw,
        status: "unverifiable",
        reason: "Age claim isn't in a numeric format.",
        source: "rule",
      });
    } else if (face?.ageMin != null && face.ageMax != null) {
      const low = face.ageMin - 10;
      const high = face.ageMax + 10;
      if (ageClaim >= low && ageClaim <= high) {
        fieldResults.push({
          field: "age",
          claim: ageClaimRaw,
          status: "pass",
          reason: `Age matches live face estimate (${face.ageMin}-${face.ageMax}).`,
          source: "face",
        });
      } else if (evidence.linkedIn?.tier === "strong") {
        fieldResults.push(
          await llmAgeFallback({
            claim: ageClaimRaw,
            linkedInSummary: {
              firstWorkYear: evidence.linkedIn.firstWorkYear,
              headline: evidence.linkedIn.headline,
              roles: evidence.linkedIn.pastRoles,
            },
            meta,
          }),
        );
      } else {
        fieldResults.push({
          field: "age",
          claim: ageClaimRaw,
          status: "fail",
          reason: `The age claimed (${ageClaimRaw}) is significantly different from live face estimate (${face.ageMin}-${face.ageMax}).`,
          source: "face",
        });
      }
    } else if (evidence.linkedIn?.tier === "strong") {
      fieldResults.push(
        await llmAgeFallback({
          claim: ageClaimRaw,
          linkedInSummary: {
            firstWorkYear: evidence.linkedIn.firstWorkYear,
            headline: evidence.linkedIn.headline,
            roles: evidence.linkedIn.pastRoles,
          },
          meta,
        }),
      );
    } else {
      fieldResults.push({
        field: "age",
        claim: ageClaimRaw,
        status: "unverifiable",
        reason: "Live face age estimate is unavailable.",
        source: "none",
      });
    }
  }

  if (genderClaim) {
    const rawFaceGender = evidence.face?.genderEstimate?.trim().toLowerCase() ?? null;
    const faceGender =
      rawFaceGender &&
      rawFaceGender !== "unclear" &&
      rawFaceGender !== "unknown" &&
      rawFaceGender !== "n/a" &&
      rawFaceGender !== "na"
        ? rawFaceGender
        : null;
    if (!faceGender) {
      const liCredible = linkedInCredibleForGender(evidence);
      const igCredible = instagramCredibleForGender(evidence);
      if (liCredible || igCredible) {
        const names = [
          liCredible ? evidence.linkedIn?.fullName : null,
          igCredible ? evidence.instagram?.fullName : null,
        ].filter((s): s is string => Boolean(s && s.trim()));
        if (names.length > 0) {
          const inferred = await llmGenderFromName({
            claim: genderClaim,
            names,
            meta,
          });
          fieldResults.push({
            ...inferred,
            source: liCredible ? "linkedin" : "instagram",
          });
        } else {
          fieldResults.push({
            field: "gender",
            claim: genderClaim,
            status: "fail",
            reason:
              "Face signal unavailable and profile names are missing for gender inference.",
            source: "none",
          });
        }
      } else {
        fieldResults.push({
          field: "gender",
          claim: genderClaim,
          status: "unverifiable",
          reason:
            "Gender can only be validated from live face, or from credible LinkedIn/Instagram names.",
          source: "none",
        });
      }
    } else if (simpleSimilarity(genderClaim, faceGender)) {
      fieldResults.push({
        field: "gender",
        claim: genderClaim,
        status: "pass",
        reason: "Gender matches live face signal.",
        source: "face",
      });
    } else {
      fieldResults.push({
        field: "gender",
        claim: genderClaim,
        status: "fail",
        reason: `Gender claim (${genderClaim}) does not match live face signal (${faceGender}).`,
        source: "face",
      });
    }
  }

  if (occupationClaim) {
    if (!evidence.linkedIn || (evidence.linkedIn.tier !== "medium" && evidence.linkedIn.tier !== "strong")) {
      fieldResults.push({
        field: "occupation",
        claim: occupationClaim,
        status: "unverifiable",
        reason: "LinkedIn is too weak/new to verify occupation.",
        source: "rule",
      });
    }
  }

  if (locationClaim) {
    if (!evidence.linkedIn || (evidence.linkedIn.tier !== "medium" && evidence.linkedIn.tier !== "strong")) {
      fieldResults.push({
        field: "location",
        claim: locationClaim,
        status: "unverifiable",
        reason: "LinkedIn is too weak/new to verify location.",
        source: "rule",
      });
    }
  }

  const occupationPromise =
    occupationClaim &&
    evidence.linkedIn &&
    (evidence.linkedIn.tier === "medium" || evidence.linkedIn.tier === "strong")
      ? llmOccupationMatch({
          claim: occupationClaim,
          linkedInCareer: {
            headline: evidence.linkedIn.headline,
            currentTitle: evidence.linkedIn.currentTitle,
            roles: evidence.linkedIn.pastRoles,
          },
          meta,
        })
      : Promise.resolve<VerificationFieldResult | null>(null);

  const locationPromise =
    locationClaim &&
    evidence.linkedIn &&
    (evidence.linkedIn.tier === "medium" || evidence.linkedIn.tier === "strong")
      ? llmLocationMatch({
          claim: locationClaim,
          linkedInLocation: {
            text: evidence.linkedIn.locationText,
            city: evidence.linkedIn.city,
            state: evidence.linkedIn.state,
            country: evidence.linkedIn.country,
          },
          meta,
        })
      : Promise.resolve<VerificationFieldResult | null>(null);

  if (customClaim) {
    fieldResults.push({
      field: "customNote",
      claim: customClaim,
      status: "pass",
      reason: "Custom note accepted as user-declared in v1.",
      source: "rule",
    });
  }

  const [occupationResult, locationResult] = await Promise.all([
    occupationPromise,
    locationPromise,
  ]);
  if (occupationResult) fieldResults.push(occupationResult);
  if (locationResult) fieldResults.push(locationResult);

  const final = await llmFinalDecision({ fieldResults, meta });
  const hasBlockingField = fieldResults.some(
    (f) => f.status === "fail" || f.status === "unverifiable",
  );
  const hardDecision = hasBlockingField ? "nogo" : "go";
  const hardReason =
    hasBlockingField
      ? fieldResults.find((f) => f.status === "fail" || f.status === "unverifiable")?.reason ??
        final.reason
      : final.reason;

  return {
    decision: hardDecision,
    reason: hardReason,
    fieldResults,
    modelMeta: modelMeta(meta),
  };
}
