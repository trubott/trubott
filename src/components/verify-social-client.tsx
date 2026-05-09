"use client";

import { useState } from "react";

type Props = {
  defaultReddit?: string;
};

export function VerifySocialClient({ defaultReddit = "" }: Props) {
  const [redditHandle, setRedditHandle] = useState(defaultReddit);
  const [linkedinId, setLinkedinId] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRun =
    redditHandle.trim() &&
    linkedinId.trim() &&
    instagramId.trim() &&
    confirmed &&
    !busy;

  async function runVerify() {
    setBusy(true);
    setError(null);
    setDone(false);
    setStatus("Starting checks. This may take 1-2 minutes…");
    try {
      const res = await fetch("/api/verify/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          redditHandle: normalize(redditHandle),
          linkedinId: normalize(linkedinId),
          instagramId: normalize(instagramId),
          confirmedSentMessages: true,
        }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(json.message ?? json.error ?? `HTTP ${res.status}`);
      setDone(true);
      setStatus(
        json.message ??
          "Verification and sync complete. You can now mint a card.",
      );
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold tracking-tight">
        Verify all social handles
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your IDs, send the required DM/message to our bot handles, then click
        verify. We will sync via Apify and store results only when complete.
      </p>

      <div className="mt-5 grid gap-3">
        <Field
          label="Reddit handle"
          placeholder="your_reddit_id"
          value={redditHandle}
          onChange={setRedditHandle}
        />
        <Field
          label="LinkedIn id"
          placeholder="your_linkedin_id"
          value={linkedinId}
          onChange={setLinkedinId}
        />
        <Field
          label="Instagram id"
          placeholder="your_instagram_id"
          value={instagramId}
          onChange={setInstagramId}
        />
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-input"
        />
        <span>
          I have sent the required messages from all three accounts. Start
          verification now.
        </span>
      </label>

      <button
        type="button"
        onClick={runVerify}
        disabled={!canRun}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow disabled:opacity-50"
      >
        {busy ? "Verifying (1-2 min)…" : "I've sent it — verify now"}
      </button>

      {status ? (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}
      {done ? (
        <p className="mt-2 text-sm text-success">
          Success. You can proceed to card generation.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
      />
    </label>
  );
}

function normalize(v: string) {
  return v.trim().replace(/^@/, "").replace(/^u\//i, "");
}
