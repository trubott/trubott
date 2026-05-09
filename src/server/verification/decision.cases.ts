/**
 * Scenario fixtures for go/no-go policy validation.
 * These are used as a living regression set while tuning prompts and thresholds.
 */
export const decisionCases = [
  {
    name: "face_age_mismatch_nogo",
    input: {
      ageClaim: "50",
      faceAgeRange: "20-30",
    },
    expected: "nogo",
  },
  {
    name: "weak_linkedin_occupation_unverifiable",
    input: {
      linkedInTier: "weak",
      occupationClaim: "engineering manager",
    },
    expected: "nogo",
  },
  {
    name: "only_age_gender_with_face_pass",
    input: {
      ageClaim: "29",
      genderClaim: "male",
      faceAgeRange: "24-32",
      faceGender: "male",
    },
    expected: "go",
  },
  {
    name: "gender_fallback_name_strong_match",
    input: {
      faceAvailable: false,
      linkedInCredible: true,
      names: ["Michael Scott"],
      genderClaim: "male",
    },
    expected: "go",
  },
  {
    name: "gender_fallback_name_ambiguous_nogo",
    input: {
      faceAvailable: false,
      instagramCredible: true,
      names: ["Jamie Alex"],
      genderClaim: "male",
    },
    expected: "nogo",
  },
  {
    name: "location_far_country_nogo",
    input: {
      locationClaim: "australia",
      linkedInLocation: "california, united states",
    },
    expected: "nogo",
  },
] as const;
