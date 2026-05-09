export type VerificationField =
  | "age"
  | "gender"
  | "occupation"
  | "location"
  | "customNote";

export type VerificationFieldResult = {
  field: VerificationField;
  claim: string;
  status: "pass" | "fail" | "unverifiable" | "skipped";
  reason: string;
  source: "face" | "linkedin" | "instagram" | "rule" | "none";
};

export type LinkedInRole = {
  title: string;
  company: string | null;
  startYear: number | null;
  endYear: number | null;
};

export type LinkedInDigest = {
  verified: boolean;
  fullName: string | null;
  connectionsCount: number | null;
  followersCount: number | null;
  accountAgeDays: number | null;
  headline: string | null;
  about: string | null;
  locationText: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  currentTitle: string | null;
  firstWorkYear: number | null;
  pastRoles: LinkedInRole[];
  tier: "strong" | "medium" | "weak" | "none";
};

export type InstagramDigest = {
  verified: boolean;
  fullName: string | null;
  followersCount: number | null;
  accountAgeDays: number | null;
  bio: string | null;
};

export type FaceEvidence = {
  passedAt: string;
  ipCountry: string | null;
  ageMin: number | null;
  ageMax: number | null;
  genderEstimate: string | null;
};

export type VerificationEvidence = {
  linkedIn: LinkedInDigest | null;
  instagram: InstagramDigest | null;
  redditHandles: string[];
  face: FaceEvidence | null;
  passive: { consistent: boolean; sessionCount: number };
};

export type VerificationDecision = {
  decision: "go" | "nogo";
  reason: string;
  fieldResults: VerificationFieldResult[];
  modelMeta: {
    callsUsed: string[];
    timeouts: string[];
    version: string;
    model: string;
  };
};
