"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Zap,
  ShieldCheck,
  ArrowRight,
  Copy,
  Lock,
  AlertCircle,
  RefreshCcw,
  CheckCircle2,
  Info,
  ExternalLink,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { CollectibleCard } from "./collectible-card";

type Verdict = {
  field: string;
  claim: string;
  status: "pass" | "fail" | "unverifiable" | "skipped";
  reason: string;
};

type DecisionPreview = {
  decision: "go" | "nogo";
  reason: string;
  fieldResults: Verdict[];
};

type Props = {
  signals: {
    redditVerified: boolean;
    faceVerified: boolean;
    consistentDevice: boolean;
    redditHandles: string[];
  }
};

export function CardCreateClient({
  signals
}: Props) {

  // Persona Fields
  const [persona, setPersona] = useState({
    title: "",
    age: "",
    gender: "Male",
    occupation: "",
    location: ""
  });

  const [validating, setValidating] = useState(false);
  const [validatedClaimsKey, setValidatedClaimsKey] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<{ url: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const usableClaims = useMemo(() => {
    return [
      { field: "Age", value: persona.age },
      { field: "Gender", value: persona.gender },
      { field: "Occupation", value: persona.occupation },
      { field: "Location", value: persona.location },
      { field: "Custom Note", value: persona.title },
    ].filter((c) => c.value.trim() !== "");
  }, [persona]);

  const claimsKey = useMemo(
    () =>
      JSON.stringify(
        usableClaims.map((c) => ({
          field: c.field.trim().toLowerCase(),
          value: c.value.trim(),
        })),
      ),
    [usableClaims],
  );

  const isDecisionCurrent = validatedClaimsKey === claimsKey && validatedClaimsKey !== null;
  const isValidationFresh = isDecisionCurrent && decision?.decision === "go";
  const canGenerate = isValidationFresh;

  async function validate() {
    setValidating(true);
    setError(null);
    setShowPaymentPanel(false);
    try {
      const res = await fetch("/api/claims/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claims: usableClaims }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Validation failed");
      setDecision({
        decision: json.decision,
        reason: json.reason,
        fieldResults: json.fieldResults ?? [],
      });
      setValidatedClaimsKey(claimsKey);
    } catch (err) {
      setValidatedClaimsKey(null);
      setError(err instanceof Error ? err.message : "Validation error");
    } finally {
      setValidating(false);
    }
  }

  async function mint() {
    setMinting(true);
    setError(null);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Identity Card",
          cardType: "flash",
          // In non-pstandard",
          burnAfterRead: falsms,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.reason ?? json.error ?? "Mint failed");
      setMinted({ url: json.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mint failed");
    } finally {
      setMinting(false);
    }
  }

  function updatePersona<K extends keyof typeof persona>(key: K, value: (typeof persona)[K]) {
    setPersona((prev) => ({ ...prev, [key]: value }));
  }

  async function onPrimaryAction() {
    if (!isValidationFresh) {
      await validate();
      return;
    }
    await mint();
  }

  const primaryLabel = !isValidationFresh
    ? validating
      ? "Checking..."
      : "Validate Claim"
    : minting
      ? "Generating Card..."
      : "Generate Card";

  const primaryDisabled =
    usableClaims.length === 0 ||
    validating ||
    minting;

  if (minted) {
    return (
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12 lg:gap-20 py-10 animate-in fade-in duration-700">
        <div className="shrink-0 scale-110 lg:scale-125 lg:mt-12">
          <p className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
            Live Preview
          </p>
          <CollectibleCard
            {...persona}
            isRedditVerified={signals.redditVerified}
            isFaceVerified={signals.faceVerified}
            isConsistentDevice={signals.consistentDevice}
          />
        </div>

        <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[40px] p-8 space-y-8 shadow-2xl">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-400" />
              Card Generated
            </h2>
            <p className="text-[11px] text-blue-300 font-bold uppercase tracking-[0.2em] mt-1">Ready to share.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Share link with others</span>
              <a
                href={minted.url}
                target="_blank"
                rel="noreferrer"
                className="group block p-4 pr-12 bg-white/5 border border-white/5 rounded-2xl text-[11px] font-mono break-all text-blue-400 font-bold hover:bg-white/10 hover:border-blue-500/30 transition-all relative overflow-hidden"
              >
                {minted.url}
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight size={14} className="-rotate-45" />
                </div>
              </a>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(minted.url);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 1500);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-blue-300 hover:bg-white/10 transition-all"
                >
                  <Copy size={12} />
                  {copiedUrl ? "Copied" : "Copy URL"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
            <AlertCircle size={14} className="text-blue-400 shrink-0" />
            <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed tracking-widest">
              Check live preview of visiblility to 3rd party.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
      {/* Left Form */}
      <div className="space-y-12">
        <div className="space-y-3">
          <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">Mint Identity</h2>
        </div>

        <div className="space-y-8">
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700 font-bold uppercase tracking-widest leading-relaxed">
                Enter what you want to claim while sharing flash card. TruBott AI will validate it before generating it.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <InputGroup label="Age (optional)" value={persona.age} onChange={(v) => updatePersona("age", v)} placeholder="21" />
              <div>
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block mb-2 px-1">Gender (optional)</label>
                <select
                  value={persona.gender}
                  onChange={(e) => updatePersona("gender", e.target.value)}
                  className="w-full h-12 bg-white rounded-2xl border-2 border-slate-200 px-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-all appearance-none shadow-sm"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            <InputGroup label="Occupation (optional)" value={persona.occupation} onChange={(v) => updatePersona("occupation", v)} placeholder="Software Developer" />
            <InputGroup label="Location (optional)" value={persona.location} onChange={(v) => updatePersona("location", v)} placeholder="New York, NY" />
            <InputGroup label="Custom Note (optional)" value={persona.title} onChange={(v) => updatePersona("title", v)} placeholder="Keep travelling to africa frequently" />
            <button
              onClick={onPrimaryAction}
              disabled={primaryDisabled}
              className="w-full h-11 rounded-2xl bg-blue-600 text-[10px] font-black text-white uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-40"
            >
              {primaryLabel}
            </button>
            {decision && isDecisionCurrent && (
              <div
                className={`p-4 rounded-2xl border ${decision.decision === "go"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
                  }`}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500 mb-2">
                  AI Decision
                </p>
                <pre
                  className={`text-[11px] leading-6 font-mono font-semibold whitespace-pre-wrap ${decision.decision === "go" ? "text-green-700" : "text-red-700"
                    }`}
                >{`{
  "status": "${decision.decision}",
  "reason": "${decision.reason.replace(/"/g, '\\"')}"
}`}</pre>
              </div>
            )}
          </div>
        </div>

        {/* PAYMENT MODAL */}
        <Dialog.Root open={showPaymentPanel} onOpenChange={(open) => {
          setShowPaymentPanel(open);
          if (!open) setIsSimulating(false);
        }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[32px] bg-white p-8 shadow-2xl animate-in zoom-in-95 fade-in duration-300 focus:outline-none">
              <div className="space-y-8">
                <div className="space-y-2">
                  <Dialog.Title className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                    {simulatedPrice === 0 ? "Payment Ready" : "Unlocking Flashcard"}
                  </Dialog.Title>
                  <Dialog.Description className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    {simulatedPrice === 0 ? "Promotional discount applied successfully." : "Processing your secure anonymous identity..."}
                  </Dialog.Description>
                </div>

                <div className="p-8 bg-blue-50/50 border-2 border-blue-100 rounded-[32px] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Amount</span>
                    <span className="text-sm font-black text-slate-900 italic">$1.99</span>
                  </div>

                  {simulatedPrice === 0 && (
                    <div className="flex items-center justify-between text-green-600 animate-in slide-in-from-top-2 duration-500">
                      <span className="text-[10px] font-black uppercase tracking-widest">Flash Discount</span>
                      <span className="text-sm font-black">-$1.99</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-blue-100 flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">Total Due</span>
                    <div className="text-right">
                      <span className={`text-2xl font-black ${simulatedPrice === 0 ? "text-green-600" : "text-blue-600"} transition-colors duration-500`}>
                        ${simulatedPrice === 0 ? "0.00" : "1.99"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {simulatedPrice === 0 ? (
                    <button
                      onClick={() => {
                        setFlashPaymentSessionId(`sim_success_${Math.random().toString(36).slice(2, 9)}`);
                        setFlashPaid(true);
                        setShowPaymentPanel(false);
                        setIsSimulating(false);
                      }}
                      className="group w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-green-600 text-[12px] font-black text-white uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg animate-in zoom-in-95 duration-500"
                    >
                      <Zap size={18} fill="currentColor" />
                      Confirm & Generate Card
                    </button>
                  ) : (
                    <div className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-wait">
                      <RefreshCcw size={16} className="animate-spin" />
                      Applying Discount...
                    </div>
                  )}

                  <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-widest leading-relaxed">
                    Ephemeral session · No data stored · Secure link
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowPaymentPanel(false);
                  setIsSimulating(false);
                }}
                className="absolute right-6 top-6 rounded-full p-2 text-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-all"
              >
                <X size={20} />
              </button>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {canGenerate && (
          <div className="pt-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-center gap-2 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600">
              <CheckCircle2 size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Validation & Payment Verified</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-6 py-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-slate-400 border border-slate-100">
            <Lock size={12} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">SECURE MINT</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-slate-400 border border-slate-100">
            <RefreshCcw size={12} className="animate-spin-slow" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">INSTANT SYNC</span>
          </div>
        </div>


        {error && (
          <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-[10px] font-bold text-red-600 uppercase tracking-widest text-center">
            {error}
          </div>
        )}
      </div>

      {/* Right Preview */}
      <div className="sticky top-28 flex flex-col items-center space-y-10">
        <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] flex items-center gap-4">
          <div className="h-[1px] w-8 bg-slate-100" />
          Live Identity Preview
          <div className="h-[1px] w-8 bg-slate-100" />
        </div>

        <div className="scale-110 lg:scale-125 lg:mt-12">
          <button
            type="button"
            className="mb-6 w-full h-12 rounded-2xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-200"
          >
            Live Preview of FlashCard
          </button>
          <CollectibleCard
            {...persona}
            isRedditVerified={signals.redditVerified}
            isFaceVerified={signals.faceVerified}
            isConsistentDevice={signals.consistentDevice}
          />
        </div>

        <div className="max-w-[280px] p-6 bg-slate-50 rounded-3xl space-y-3 border border-slate-100 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={12} className="text-blue-500" /> PREVIEW
          </h4>
          <p className="text-[9px] text-slate-600 font-bold uppercase leading-relaxed tracking-wider">
            (How it looks to other person)
          </p>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block mb-2 px-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 bg-white rounded-2xl border-2 border-slate-200 px-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
      />
    </div>
  );
}
