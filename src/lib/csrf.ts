import { env } from "@/lib/env";

/**
 * Returns null if the request looks same-origin, or an error string if it
 * does not. Used by every state-changing route to defend against CSRF.
 *
 * Strategy:
 *   - If `Origin` is present, it must equal NEXTAUTH_URL.
 *   - Otherwise, `Sec-Fetch-Site: same-origin` is acceptable (modern
 *     browsers always emit this for fetches issued from the same origin).
 *   - If neither is present, reject. A real browser POST always sends
 *     at least one of these headers; a non-browser client trying to ride
 *     a stolen cookie generally won't.
 */
export function assertSameOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  const expectedBase = env().NEXTAUTH_URL.replace(/\/+$/, "");
  
  // Allow primary domain and the new verify subdomain
  const allowedOrigins = [
    expectedBase,
    "https://verify.truebuilders.in",
    "http://verify.truebuilders.in",
    "http://localhost:3000"
  ];

  if (origin) {
    return allowedOrigins.includes(origin) ? null : "bad_origin";
  }
  
  const sfs = request.headers.get("sec-fetch-site");
  if (sfs === "same-origin" || sfs === "none") return null;
  return "missing_origin";
}
