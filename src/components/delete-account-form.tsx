"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteAccountForm() {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const armed = confirm.trim().toUpperCase() === "DELETE";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!armed || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me", { method: "DELETE" });
        if (!res.ok) {
          setError(`Delete failed (${res.status}). Please try again.`);
          return;
        }
        // The DELETE handler invalidated the user row; trigger a full sign-out
        // by hitting NextAuth's default endpoint. We rely on a redirect to "/"
        // rather than the next-auth/react helper to avoid pulling in a
        // SessionProvider just for this one call.
        await fetch("/api/auth/signout?redirect=false", { method: "POST" });
        router.replace("/?deleted=1");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
        Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 h-10 rounded-md border border-input bg-background px-3 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          placeholder="DELETE"
          autoComplete="off"
          aria-label="Type DELETE to confirm account deletion"
        />
      </label>
      <button
        type="submit"
        disabled={!armed || pending}
        aria-busy={pending}
        className="inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground shadow transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {pending ? "Deleting your account, please wait." : ""}
      </span>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
