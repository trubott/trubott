"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";

type Status =
  | { state: "no_active_code" }
  | { state: "waiting"; code: string; expiresAt: string }
  | { state: "matched"; handle: string; matchedAt: string }
  | { state: "expired"; code: string };

type Props = {
  bot?: string;
  initialCode?: string;
  initialExpiresAt?: string;
  initialState?: Status;
};

const POLL_INTERVAL_MS = 5_000;
const POLL_WINDOW_MS = 2 * 60 * 1000;

export function VerifyRedditClient({ 
  bot: propBot, 
  initialCode, 
  initialExpiresAt, 
  initialState 
}: Props) {
  const [status, setStatus] = useState<Status | null>(initialState || null);
  const [bot, setBot] = useState(propBot || "");
  const [polling, setPolling] = useState(false);
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(!initialState);
  
  const router = useRouter();
  const stopRef = useRef(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [startRes, statusRes] = await Promise.all([
        fetch("/api/verify/reddit/start", { method: "POST" }),
        fetch("/api/verify/reddit/status", { cache: "no-store" })
      ]);
      
      if (statusRes.ok) {
        const s = await statusRes.json();
        setStatus(s);
      }
    } catch (e) {
      console.error("Failed to load initial reddit state", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialState) {
      loadInitial();
    }
  }, [initialState, loadInitial]);

  const code =
    status?.state === "waiting"
      ? status.code
      : status?.state === "expired"
        ? status.code
        : (initialCode || "");

  const expiresAt =
    status?.state === "waiting" ? status.expiresAt : (initialExpiresAt || "");

  const composeUrl = `https://www.reddit.com/message/compose?to=u/${encodeURIComponent(bot || 'trustcard_bot')}&message=${encodeURIComponent(code)}`;

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/verify/reddit/status", { cache: "no-store" });
      if (!res.ok) {
        setError(`Status check failed (${res.status})`);
        return;
      }
      const next = (await res.json()) as Status;
      setStatus(next);
      if (next.state === "matched") {
        setPolling(false);
        setTimeout(() => router.refresh(), 250);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status check failed");
    }
  }, [router]);

  useEffect(() => {
    if (!polling) return;
    stopRef.current = false;
    const startedAt = Date.now();
    setPollStartedAt(startedAt);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (stopRef.current) return;
      await poll();
      if (stopRef.current) return;
      if (Date.now() - startedAt >= POLL_WINDOW_MS) {
        setPolling(false);
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    timer = setTimeout(tick, 0);
    return () => {
      stopRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [polling, poll]);

  async function startNewCode() {
    setError(null);
    try {
      const res = await fetch("/api/verify/reddit/start", { method: "POST" });
      if (!res.ok) {
        setError(`Could not issue a new code (${res.status})`);
        return;
      }
      const j = (await res.json()) as { code: string; expiresAt: string };
      setStatus({ state: "waiting", code: j.code, expiresAt: j.expiresAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue a new code");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  }

  async function startListening() {
    setError(null);
    try {
      const res = await fetch("/api/verify/reddit/sent", { method: "POST" });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? `Could not start listen window (${res.status})`);
      }
      setPolling(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start listening");
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Secure Syncing...</div>;
  }

  if (status?.state === "matched") {
    return (
      <div className="border border-green-200 bg-green-50/20 p-6 text-center animate-in fade-in duration-300">
        <div className="mx-auto h-10 w-10 bg-green-600 flex items-center justify-center text-white mb-4">
          <CheckCircle2 size={20} />
        </div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">u/{status.handle} Verified</h2>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 inline-flex h-10 items-center justify-center bg-slate-900 px-6 text-[10px] font-bold text-white uppercase tracking-widest transition-all hover:bg-slate-800"
        >
          Return
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="border border-slate-100 bg-slate-50/30 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Token</span>
          <Countdown deadline={expiresAt} />
        </div>

        <div className="space-y-2">
          <code className="block w-full text-center bg-white border border-slate-100 px-4 py-3 font-mono text-xl font-bold tracking-[0.2em] text-blue-600">
            {code || "......"}
          </code>
          <button
            type="button"
            onClick={copyCode}
            className="w-full inline-flex h-10 items-center justify-center bg-white border border-slate-200 text-[10px] font-bold text-slate-900 uppercase tracking-widest hover:border-slate-400"
          >
            {copied ? "COPIED" : "COPY"}
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <a
            href={composeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 bg-blue-600 px-6 text-[10px] font-bold text-white uppercase tracking-widest transition-all hover:bg-blue-700"
          >
            <MessageSquare size={14} />
            OPEN DM
          </a>
          
          <button
            type="button"
            onClick={polling ? () => setPolling(false) : startListening}
            className={`inline-flex h-11 items-center justify-center gap-2 border px-6 text-[10px] font-bold uppercase tracking-widest transition-all ${polling ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-white border-slate-200 text-slate-900 hover:border-slate-400'}`}
          >
            {polling ? <Spinner /> : null}
            {polling ? "VERIFYING" : "I'VE SENT IT"}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-[9px] font-bold text-red-600 bg-red-50 py-2 px-3 border border-red-100 uppercase tracking-widest">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <InstructionItem num={1} text={`DM to u/${bot || 'bot'}`} />
        <InstructionItem num={2} text="Await match" />
      </div>
    </div>
  );
}

function InstructionItem({ num, text }: { num: number; text: string }) {
  return (
    <div className="px-4 py-2 bg-slate-50/50 border border-slate-100 flex items-center gap-3">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{num}</span>
      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">{text}</p>
    </div>
  );
}

function Countdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);
  if (!deadline) return null;
  const remaining = Math.max(0, new Date(deadline).getTime() - now);
  const m = Math.floor(remaining / 60_000);
  const s = Math.floor((remaining % 60_000) / 1_000);
  return (
    <div className="flex items-center gap-1.5 text-slate-900 font-mono text-[9px] font-bold uppercase tracking-widest">
      <Zap size={9} className="text-blue-500" />
      {m}:{s.toString().padStart(2, "0")}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-3 w-3 motion-safe:animate-spin text-current" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
