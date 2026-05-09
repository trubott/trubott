"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Copy, 
  Info, 
  User, 
  Bot,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Lock
} from "lucide-react";

type BioPlatformUI = "linkedin" | "instagram" | "twitter" | "reddit";

type Status =
  | { state: "no_session" }
  | {
      state: "waiting";
      code: string;
      expiresAt: string;
      pendingHandle: string;
      listenActive: boolean;
      listenEndsAt?: string;
    }
  | { state: "matched"; handle: string; matchedAt: string }
  | { state: "expired"; code: string }
  | { state: "listen_expired"; code: string; expiresAt: string; pendingHandle: string }
  | { state: "blocked"; reason: string };

const POLL_MS = 5_000;

const COPY: Record<
  BioPlatformUI,
  {
    title: string;
    step1Title: string;
    instructions: string;
    fieldLabel: string;
    placeholder: string;
    color: string;
    icon: any;
  }
> = {
  reddit: {
    title: "Verify Reddit",
    step1Title: "Enter your username",
    fieldLabel: "Username",
    placeholder: "poiuytrew",
    instructions: "Add code to your Reddit About.",
    color: "orange",
    icon: Bot
  },
  instagram: {
    title: "Verify Instagram",
    step1Title: "Enter your username",
    fieldLabel: "Username",
    placeholder: "your_username",
    instructions: "Add code to your Instagram bio.",
    color: "pink",
    icon: User
  },
  twitter: {
    title: "Verify X",
    step1Title: "Enter your username",
    fieldLabel: "Handle",
    placeholder: "your_handle",
    instructions: "Add code to your X profile bio.",
    color: "slate",
    icon: Zap
  },
  linkedin: {
    title: "Verify LinkedIn",
    step1Title: "Enter Linkedin profle url",
    fieldLabel: "ID",
    placeholder: "https://www.linkedin.com/in/satyanadella/",
    instructions: "Add code to your LinkedIn headline.",
    color: "blue",
    icon: User
  },
};

export function BioVerifyClient({ platform }: { platform: BioPlatformUI }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const c = COPY[platform];
  const handlePrefix = platform === "reddit" ? "u/" : platform === "linkedin" ? "" : "@";

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/verify/bio/${platform}/status`, { cache: "no-store" });
    if (!res.ok) return;
    const j = (await res.json()) as Status;
    setStatus(j);
    if (j.state === "matched") {
      setPolling(false);
      setTimeout(() => router.refresh(), 250);
    }
  }, [platform, router]);

  useEffect(() => {
    if (status?.state === "listen_expired" || status?.state === "expired" || status?.state === "matched" || status?.state === "blocked") {
      setPolling(false);
    }
  }, [status?.state]);

  useEffect(() => {
    if (status?.state === "waiting" && status.listenActive) {
      setPolling(true);
    }
  }, [status]);

  useEffect(() => {
    if (!polling) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await loadStatus();
      if (cancelled) return;
      setTimeout(tick, POLL_MS);
    };
    const t = setTimeout(tick, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [polling, loadStatus]);

  useEffect(() => {
    if (!status) return;
    if (status.state === "matched") {
      setCurrentStep(3);
      return;
    }
    if (status.state === "waiting" || status.state === "listen_expired") {
      if (!polling) {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }
      return;
    }
    if (status.state === "expired") {
      setCurrentStep(3);
      return;
    }
    if (status.state === "blocked") {
      setCurrentStep(3);
      return;
    }
    if (status.state === "no_session") {
      setCurrentStep(1);
    }
  }, [status, polling]);

  async function startSession(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const normalizedHandle = handle.trim().replace(/^@+/, "").replace(/^u\//i, "");
    try {
      const res = await fetch(`/api/verify/bio/${platform}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: normalizedHandle }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      await loadStatus();
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setBusy(false);
    }
  }

  async function markSent() {
    setError(null);
    if (status?.state === "waiting" && status.listenActive) {
      setPolling(true);
      setCurrentStep(3);
      return;
    }
    try {
      const res = await fetch(`/api/verify/bio/${platform}/sent`, { method: "POST" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setPolling(true);
      await loadStatus();
      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start listening window");
    }
  }

  const canGoBack = currentStep > 1 && status?.state !== "matched";
  const isStep2Ready = status?.state === "waiting" || status?.state === "listen_expired";
  const code = isStep2Ready ? status.code : "...";
  const isSuccess = status?.state === "matched";
  const isExpired = status?.state === "expired";
  const isBlocked = status?.state === "blocked";
  const isWaiting = polling && !isSuccess;

  async function copyCode() {
    if (!isStep2Ready) return;
    try {
      await navigator.clipboard.writeText(status.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function goBack() {
    if (!canGoBack) return;
    if (currentStep === 3 && polling) {
      setPolling(false);
    }
    setCurrentStep((prev) => (prev === 3 ? 2 : 1));
  }

  function StepDots() {
    return (
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`h-2 rounded-full transition-all ${currentStep === step ? "w-6 bg-blue-600" : "w-2 bg-slate-200"}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-start gap-3.5 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tight leading-none">{c.title}</h2>
          <p className="mt-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest">Prove identity with a temporary marker.</p>
        </div>
      </div>

      <div className="mb-5">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Step {currentStep} of 3</p>
        <StepDots />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <c.icon size={15} />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{c.step1Title}</h3>
            </div>

            <form onSubmit={startSession} className="space-y-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center">
                  <User size={14} />
                </div>
                {handlePrefix ? (
                  <span className="absolute left-12 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    {handlePrefix}
                  </span>
                ) : null}
                <input
                  className={`w-full h-11 bg-white border-2 border-slate-100 rounded-xl ${handlePrefix ? "pl-20" : "pl-14"} pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 transition-all`}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={c.placeholder}
                  disabled={busy || (status?.state === "waiting" && status.listenActive)}
                />
              </div>
              <button
                type="submit"
                disabled={busy || !handle.trim() || isStep2Ready}
                className="w-full h-11 bg-blue-600 rounded-xl text-white font-black uppercase tracking-[0.18em] text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-40"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {busy ? "Starting..." : "Start Verification"}
              </button>
            </form>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Add these dots in your bio. That's it!</h3>
              <button
                type="button"
                onClick={copyCode}
                disabled={!isStep2Ready}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-slate-300 disabled:opacity-40"
                aria-label="Copy dots"
              >
                <Copy size={12} />
                {copied ? "Copied!" : "Copy dots"}
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-xl border-2 border-solid border-blue-200 bg-blue-50" />
              <div className="relative flex flex-col items-center gap-1 px-5 py-4">
                <code className="font-mono text-3xl font-black text-blue-600 tracking-widest">{code}</code>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest">three dots — type or paste into bio</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Add this marker in your profile bio. Don&apos;t worry, it will be only for <strong>30 seconds</strong>. You can remove it after TruBott verifies you.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-700 mb-2">Steps</p>
              <p className="text-[11px] font-semibold text-slate-700">1. Open your profile and tap Edit.</p>
              <p className="text-[11px] font-semibold text-slate-700 mt-1">2. Add <code className="font-mono">...</code> at the end of your bio and save.</p>
              <p className="text-[11px] font-semibold text-slate-700 mt-1">3. If editing the end is hard, placing <code className="font-mono">...</code> at the beginning also works.</p>
              <p className="mt-2 text-[10px] text-slate-500">This is intentional: your verification marker is exactly three dots, not an alphanumeric code.</p>
            </div>

            <button
              onClick={markSent}
              disabled={!isStep2Ready}
              className="w-full h-11 bg-blue-600 rounded-xl text-white font-black uppercase tracking-[0.18em] text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-40"
            >
              <ShieldCheck size={14} className="text-blue-200" />
              Dots Added, Verify Now
            </button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            {!isSuccess && !isExpired && !isBlocked && (
              <div className="text-center py-3">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Loader2 size={22} className="animate-spin" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Verifying your bio</h3>
                <p className="mt-2 text-xs text-slate-500">
                  We are scanning {handlePrefix}{handle || "your profile"} for your dots marker. This usually takes 10-30 seconds. Keep it in your bio until we confirm.
                </p>
                {isWaiting && (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-blue-600">Checking your bio now...</p>
                )}
              </div>
            )}

            {isSuccess && status.state === "matched" && (
              <div className="text-center py-3">
                <div className="mx-auto h-14 w-14 bg-green-500 text-white rounded-full flex items-center justify-center mb-5 shadow-lg shadow-green-100">
                  <CheckCircle2 size={28} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Verified</h3>
                <p className="mt-2 text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                  {handlePrefix}{status.handle} is now linked to your TruBott identity
                </p>
                <p className="mt-2 text-[11px] text-slate-500">Verified. You can remove those dots from bio now.</p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mt-6 inline-flex h-11 items-center justify-center bg-slate-900 px-8 text-[10px] font-black text-white uppercase tracking-widest transition-all hover:bg-slate-800"
                >
                  Go To Dashboard
                </button>
              </div>
            )}

            {isExpired && (
              <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-black text-red-700 uppercase tracking-wide">Code expired</p>
                  <p className="mt-1 text-xs text-red-600">Please go back, generate a fresh code, and try again.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPolling(false);
                      setStatus(null);
                      setCurrentStep(1);
                      setError(null);
                    }}
                    className="mt-3 inline-flex h-8 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-[10px] font-black uppercase tracking-widest text-red-700 hover:bg-red-50"
                  >
                    Generate New Code
                  </button>
                </div>
              </div>
            )}

            {isBlocked && status.state === "blocked" && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-black text-amber-800 uppercase tracking-wide">Profile already in use</p>
                  <p className="mt-1 text-xs text-amber-700">{status.reason}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
          <Info size={14} className="text-red-500" />
          <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">{error}</p>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={!canGoBack}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-slate-300 disabled:opacity-35"
        >
          <ChevronLeft size={12} />
          Back
        </button>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 inline-flex items-center gap-1">
          Continue
          <ChevronRight size={12} />
        </span>
      </div>

      {/* Footer Security Bar */}
      <div className="mt-8 -mx-5 sm:-mx-10 p-3 bg-green-50/50 border-t border-green-100 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-[8px] font-black text-green-700 uppercase tracking-widest">
          <Lock size={10} />
          <span>No Login access required</span>
        </div>
      </div>
    </div>
  );
}
