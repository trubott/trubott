# Security policy

## Reporting a vulnerability

trustcard handles user identity signals, so we take security reports seriously. If you believe you've found a vulnerability:

1. **Do not** open a public GitHub issue.
2. Email the maintainer at the address listed on the GitHub repo's profile, or open a [private security advisory](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on the repo.
3. Include a minimal reproduction and the impact you've observed. PoC exploit code is welcome.

We aim to acknowledge receipt within 72 hours and ship a fix within 14 days for high-severity issues.

## What counts as a security issue

- Anything that lets an attacker read, mutate, or replay another user's data.
- Anything that lets an attacker bypass the AI claim engine to mint a card with unsupported claims.
- Anything that causes the server to ingest, log, or persist data the [PRIVACY.md](PRIVACY.md) inventory says it must not.
- Anything that lets a Reddit DM from a third party trigger ownership verification on someone else's behalf.
- Token / secret leakage in logs, error pages, or build artifacts.

## What does not count

- Self-XSS that requires the victim to paste attacker-controlled JS into their own console.
- Rate-limiting absent on endpoints that are not authenticated and not externally reachable in the default deployment.
- Issues that require physical access to the user's unlocked device.

## Hall of fame

We will gladly credit reporters in release notes (with permission) once we have a maintained mainline.
