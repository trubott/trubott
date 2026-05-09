🧾 PRD: Selective Trust Card

> ⚠️ **MVP cut-line (2026-04).** This PRD is the original product spec. The implemented v1 is intentionally narrower:
>
> - **In v1:** Google login, Reddit handle ownership via DM-code verification, Reddit profile distillation via the public Reddit API, browser-only MediaPipe liveness check (no biometric data ever leaves the browser), passive consistency-of-session signal via FingerprintJS (peppered hash only), AI claim engine with strict block-on-not-Supported, link + 6-digit OTP card sharing with burn-after-read.
> - **Phase 2 (not built yet):** LinkedIn / Instagram ownership via Apify "code in headline / bio" patterns, Twitter / X ownership, Reddit OAuth as alternative to DM verification, profile-pic-vs-live-face cosine match via the [face-recon](https://github.com/trubot89-code/face-recon) sidecar, lenient claim mode for self-declared fields, configurable card themes.
>
> The text below is the original PRD; treat anything outside the v1 list as forward-looking.

---

1. Overview
Goal:
Enable users to share selective, time-bound trust signals in anonymous conversations without revealing full identity.
Core Idea:
Users create a Trust Card containing chosen claims (e.g., gender, profession, location), supported by verifiable signals (social ownership, face check, activity consistency).

2. Key Principles


Selective disclosure → user chooses what to reveal


Signal-based trust → no “absolute verification” claims


Transparency → every claim shows “how we know”


Low friction → no heavy KYC required


Ephemeral sharing → cards expire



3. User Flow

3.1 Landing Page
UI:


Headline: “Prove what you want. Stay anonymous.”


CTA: Continue with Google



3.2 Authentication


Google OAuth login


Create internal user ID


No public profile created



3.3 Signal Setup (Dashboard Onboarding)
Modules:
1. Social Ownership Verification (DM Code Method)
Supported:


LinkedIn


Instagram


Reddit


Flow:


User clicks “Verify Instagram”


System generates:
Code: TRST-8392


User sends this code to your bot account on that platform


Backend listens for incoming messages


On match:
→ Mark account as “Ownership Verified”


Output Stored:


Platform name


Username/handle


Verification timestamp


⚠️ Important:
Do NOT claim anything about profile truth—only ownership.

2. Face Check


Live camera prompt


Detect:


Liveness (human)


Basic attributes (optional, low confidence)




Output:


“Live human check completed”



3. Passive Signals (automatic)


Session consistency


Device fingerprint (lightweight)


Activity continuity


Output:


“Consistent user over X sessions”



3.4 Dashboard
Section A: Your Signals
Example:


Instagram → Ownership verified


LinkedIn → Ownership verified


Face Check → Human verified


Sessions → Consistent user



Section B: Create Trust Card
CTA:
👉 Create One-Time Card

🎴 4. Trust Card Creation Flow

Step 1: Choose Disclosure
UI Options:
Presets (recommended)


Basic Trust


Professional


Personal


Custom (advanced)
Fields:


Name


Photo


Gender


Location


Age


Profession


Custom text input



Step 2: Claim Validation Engine
User inputs values (e.g., “Doctor”)
System evaluates against signals:

Validation Types:
✅ Supported


Matches LinkedIn bio/title


⚠️ Unverified


No supporting data


❌ Conflicting


Contradicts known signals



Important Rule:
System NEVER blocks claims
→ Only labels them

Step 3: Card Preview
Example:
✔ Human Verified (face check)✔ Instagram ownership verified✔ LinkedIn ownership verifiedShared Info:• Profession: Doctor (⚠️ not supported by signals)• Location: US (✓ consistent activity signals)• Gender: Female (⚠️ self-declared)
Each item has:
👉 “How we know this”

Step 4: Generate Card
Options:
A. Link (default)


Unique URL


Expiry:


Default: 30 minutes


Configurable




B. OTP


6-digit code


Enter on site to view card



👁️ 5. Viewer Experience

Access via:


Link OR OTP



Card View Page
Displays:
Signals:


Human verified


Social ownership verified


Consistency signals


Claims:


With labels:


Supported


Unverified


Conflicting





Additional UI:


“What this means” tooltip


Expiry timer


“This card may not represent full identity”



⚙️ 6. Backend Components

6.1 Signal Engine
Stores:


Verified ownerships


Face check status


Session consistency



6.2 DM Verification Service


Generates unique codes


Listens to bot inbox (via APIs/scraping where allowed)


Matches codes → user accounts



6.3 Claim Engine


Maps user inputs to signals


Applies validation labels



6.4 Card Engine


Creates temporary card object


Handles:


Expiry


One-time access (optional)





📊 7. Trust Model

Signal Strength Levels:


🟢 Strong → Hard to fake (face check, long-term consistency)


🟡 Medium → Ownership signals (social DM verification)


⚪ Weak → Self-declared



Display Principle:
Never say:
❌ “Verified Doctor”
Always say:
✔ “Claim supported by LinkedIn profile”
or
⚠️ “Not supported by connected signals”

🚨 8. Risks & Mitigations

Risk 1: Fake social accounts


People can create new accounts and verify via DM


Mitigation:


Show:


Account age (if available)


Activity signals (later phase)





Risk 2: Overtrust in system
Users may assume everything is verified
Mitigation:


Aggressive labeling:


“Self-declared”


“Ownership verified only”





Risk 3: Privacy concerns
Mitigation:


Explicit UI:


“We do NOT post anything”


“We only verify message ownership”





Risk 4: DM platform limitations
Some platforms restrict bot access
Mitigation:


Start with:


Instagram (manual or semi-automated)


Reddit (API-friendly)




Expand later



🧪 9. MVP Scope (2–3 weeks)

Must-have:


Google login


Reddit OR Instagram DM verification


Face check (basic)


Manual claim input


Card generation (link only)


Expiry system



Exclude for MVP:


OTP flow


Too many fields


Advanced AI validation


Multi-platform support



🧠 Final Note (Important Reality Check)
Your system proves:


“This person controls these accounts”


“This person passed a live check”


“This person is consistent over time”


It does NOT prove:


Their profession


Their gender (with certainty)


Their intent


If you stay honest about this, users will trust you.
If you overclaim, the product dies.

If you want next:


I can design exact database schema + APIs


Or simulate attack scenarios (how scammers will game this)


Or help you define first niche where this actually gets used

