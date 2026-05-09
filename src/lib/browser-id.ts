/**
 * Tiny browser-side visitor ID, hand-rolled and MIT-licensed.
 *
 * Why not a third-party fingerprinting library?
 *   - FingerprintJS OSS is BUSL-1.1 (not OSI-compatible). Pulling it would
 *     contaminate the project's MIT promise.
 *   - We do not need state-of-the-art uniqueness for this product. The
 *     "consistent device" signal only needs to identify the *same* browser
 *     across N sessions. A user can game it by switching browsers; that's
 *     intentional -- privacy first, fingerprinting last.
 *
 * The output is a hex SHA-256 of a small set of stable browser properties:
 *   - User-Agent (UA-Client-Hints would be better, but support is spotty)
 *   - Screen dimensions and color depth
 *   - Timezone offset
 *   - Primary language
 *   - Hardware concurrency
 *   - A cheap canvas pixel fingerprint
 *
 * The server peppered-hashes this string before persisting; the raw value
 * never crosses the trust boundary.
 */
export async function browserVisitorId(): Promise<string> {
  if (typeof window === "undefined" || typeof crypto?.subtle?.digest !== "function") {
    return "no-window";
  }

  const parts: string[] = [];
  parts.push(safe(() => navigator.userAgent));
  parts.push(safe(() => `${screen.width}x${screen.height}@${screen.colorDepth}`));
  parts.push(safe(() => String(new Date().getTimezoneOffset())));
  parts.push(safe(() => navigator.language ?? ""));
  parts.push(safe(() => String(navigator.hardwareConcurrency ?? "")));
  parts.push(safe(() => canvasFingerprint()));

  const text = parts.join("|");
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safe(fn: () => string): string {
  try {
    return fn();
  } catch {
    return "";
  }
}

/**
 * Draws a small set of glyphs to a canvas and serializes the resulting
 * pixel data. Two browsers on the same machine almost always produce the
 * same string, while two different OS/GPU combos differ. If canvas is
 * unavailable (privacy mode, hardened browser), returns the empty string.
 */
function canvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = "#069";
    ctx.fillText("trustcard \u2693 1234", 2, 2);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("trustcard \u2693 1234", 4, 17);
    return canvas.toDataURL().slice(-128);
  } catch {
    return "";
  }
}
