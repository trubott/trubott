"use client";

import { useState } from "react";
import { Zap, RefreshCcw } from "lucide-react";

import type { CardPayload } from "@/db/schema";
import { CollectibleCard } from "@/components/collectible-card";

import { FlashRevealShell } from "@/components/card-payload-view";

const UNAVAILABLE = "Sorry — either already used or not exist.";
const TRUST_HEADER = "Below details are 100% verified by TruBott AI";

type Props = {
  token: string;
};

export function FlashRevealClient({ token }: Props) {
  const [phase, setPhase] = useState<"gate" | "shown" | "error">("gate");
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<{
    expiresAt: string;
    burned: boolean;
    payload: CardPayload;
  } | null>(null);

  async function reveal() {
    setBusy(true);
    try {
      const res = await fetch(`/api/flashcard/${encodeURIComponent(token)}/reveal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const json = (await res.json()) as
        | {
            payload: CardPayload;
            expiresAt: string;
            burned: boolean;
          }
        | { error?: string; message?: string };
      if (!res.ok) {
        setPhase("error");
        return;
      }
      if ("payload" in json && json.payload) {
        setShown({
          payload: json.payload,
          expiresAt: json.expiresAt,
          burned: json.burned,
        });
        setPhase("shown");
      } else {
        setPhase("error");
      }
    } catch {
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }

  function customNoteFromClaims(payload: CardPayload): string | undefined {
    const noteClaim = payload.claims.find(
      (c) => c.field.trim().toLowerCase() === "custom note",
    );
    const note = noteClaim?.value?.trim();
    return note ? note : undefined;
  }

  function relativeCreatedAtLabel(generatedAt?: string): string {
    if (!generatedAt) return "Flashcard created: just now";
    const ts = new Date(generatedAt).getTime();
    if (!Number.isFinite(ts)) return "Flashcard created: just now";
    const diffMs = Date.now() - ts;
    if (diffMs <= 0) return "Flashcard created: just now";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `Flashcard created: ${Math.max(1, mins)}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Flashcard created: ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Flashcard created: ${days}d ago`;
  }

  if (phase === "error") {
    return (
      <FlashRevealShell>
        <div className="max-w-[340px] mx-auto py-4 sm:py-8 text-center animate-in zoom-in-95 duration-500">
          <p className="mb-3 sm:mb-4 text-[13px] sm:text-[15px] font-black uppercase tracking-widest text-green-700">
            {TRUST_HEADER}
          </p>
          <div className="mx-auto w-fit scale-[0.9] sm:scale-100 origin-top">
            <div className="opacity-55 pointer-events-none select-none saturate-50">
              <CollectibleCard
                title={undefined}
                age="--"
                gender="--"
                occupation="--"
                location="--"
                isConsistentDevice
              />
            </div>
          </div>
          <div className="mt-5 space-y-3 px-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Flash card unavailable
            </p>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-red-700">{UNAVAILABLE}</p>
            </div>
          </div>
        </div>
      </FlashRevealShell>
    );
  }

  if (phase === "shown" && shown) {
    const stats = {
      age: shown.payload.claims.find((c) => c.field.toLowerCase() === "age")?.value,
      gender: shown.payload.claims.find((c) => c.field.toLowerCase() === "gender")?.value,
      occupation: shown.payload.claims.find((c) => c.field.toLowerCase() === "occupation")?.value,
      location: shown.payload.claims.find((c) => c.field.toLowerCase() === "location")?.value,
    };

    const isReddit = shown.payload.claims.some((c) =>
      c.attribution?.toLowerCase().includes("reddit"),
    );
    const isFace = shown.payload.claims.some((c) =>
      c.attribution?.toLowerCase().includes("face"),
    );

    return (
      <FlashRevealShell>
        <div className="flex flex-col items-center gap-4 sm:gap-6 py-4 sm:py-8 animate-in fade-in duration-700 px-2 sm:px-3">
          <p className="text-[13px] sm:text-[15px] font-black uppercase tracking-widest text-green-700 text-center">
            {TRUST_HEADER}
          </p>
          <div className="scale-[0.9] sm:scale-100 origin-top">
            <CollectibleCard
              title={customNoteFromClaims(shown.payload)}
              {...stats}
              isRedditVerified={isReddit}
              isFaceVerified={isFace}
              isConsistentDevice
            />
          </div>
          <div className="space-y-3 text-center w-full max-w-[360px]">
            {shown.burned ? (
              <div className="px-3 py-1 rounded-lg bg-red-50 border border-red-100 text-[10px] font-black uppercase tracking-widest text-red-600">
                It will be burnt on Tab close or refresh
              </div>
            ) : null}
            <p className="text-[11px] font-semibold text-slate-500">
              {relativeCreatedAtLabel(shown.payload.generatedAt)}
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="w-full h-11 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.18em] hover:bg-blue-700 transition-all"
            >
              Generate Your Flashcard
            </button>
          </div>
        </div>
      </FlashRevealShell>
    );
  }

  return (
    <FlashRevealShell>
      <div className="max-w-[340px] mx-auto py-3 sm:py-6 text-center animate-in zoom-in-95 duration-500">
        <p className="mb-3 sm:mb-4 text-[13px] sm:text-[15px] font-black uppercase tracking-widest text-green-700">
          {TRUST_HEADER}
        </p>
        <div className="relative mx-auto w-fit scale-[0.88] sm:scale-100 origin-top">
          <div className={`${busy ? "opacity-40" : "opacity-55"} pointer-events-none select-none saturate-50 transition-opacity`}>
            <CollectibleCard
              title={undefined}
              age="--"
              gender="--"
              occupation="--"
              location="--"
              isConsistentDevice
            />
          </div>
        </div>
        <div className="mt-2 sm:mt-5 space-y-2 sm:space-y-3 px-2 sm:px-4">
          <button
            type="button"
            onClick={() => void reveal()}
            disabled={busy}
            className="w-full h-12 bg-blue-600 rounded-xl text-white font-black uppercase tracking-[0.18em] text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-40 shadow-lg shadow-blue-200"
          >
            {busy ? (
              <>
                <RefreshCcw size={16} className="animate-spin" />
                Revealing...
              </>
            ) : (
              <>
                <Zap size={16} />
                Reveal Identity
              </>
            )}
          </button>
          <p className="text-[11px] font-semibold text-slate-500">
            Can only be seen once just like a snap.
          </p>
        </div>
      </div>
    </FlashRevealShell>
  );
}
