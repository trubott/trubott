"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The single input on the landing page accepts either a full share URL or
 * a 6-digit OTP. This is the only entry point recipients ever need.
 */
export function OpenCardForm({ onSubmitStart }: { onSubmitStart?: () => void } = {}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = value.trim();
    if (!v) return;
    onSubmitStart?.();

    // Path 1: full URL — signed /c/{id} or flash /flashcard/{token}
    try {
      const url = new URL(v);
      if (url.pathname.startsWith("/c/")) {
        router.push(`${url.pathname}${url.search}`);
        return;
      }
      if (url.pathname.startsWith("/flashcard/")) {
        router.push(`${url.pathname}${url.search}`);
        return;
      }
    } catch {
      // not a URL, fall through
    }

    // Path 1b: bare 64-char flash key (hex)
    if (/^[a-f0-9]{64}$/.test(v)) {
      router.push(`/flashcard/${v}`);
      return;
    }

    // Path 2: 6-digit OTP.
    const otpMatch = v.match(/^\d{6}$/);
    if (otpMatch) {
      setBusy(true);
      try {
        const res = await fetch("/api/cards/unlock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: v }),
        });
        const json = (await res.json()) as
          | { cardId: string; exp: number; sig: string }
          | { flashPath: string }
          | { error: string };
        if (!res.ok) {
          if ("error" in json && json.error === "expired") {
            setError("That OTP has expired. Ask the sender for a new card.");
          } else if ("error" in json && json.error === "not_found") {
            setError("That OTP doesn't match any active card.");
          } else {
            setError("Could not open that card.");
          }
          return;
        }
        if ("flashPath" in json && json.flashPath) {
          router.push(json.flashPath);
          return;
        }
        if ("cardId" in json && "sig" in json) {
          const params = new URLSearchParams({
            exp: String(json.exp),
            sig: json.sig,
          });
          router.push(`/c/${json.cardId}?${params.toString()}`);
          return;
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    setError(
      "Paste a share link (flash or signed), the 64-character flash key, or the 6-digit OTP.",
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
      <label htmlFor="card-input" className="sr-only">
        Paste link or 6-digit OTP
      </label>
      <input
        id="card-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste full url you received"
        autoComplete="off"
        inputMode="text"
        className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="submit"
        disabled={busy || value.trim().length === 0}
        className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow disabled:opacity-50"
      >
        {busy ? "Verifying…" : "Verify card"}
      </button>
      {error ? (
        <p role="alert" className="basis-full text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
