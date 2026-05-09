import type { ReactNode } from "react";
import { ShieldCheck, Zap, Lock } from "lucide-react";

import type { CardPayload } from "@/db/schema";
import { CollectibleCard } from "./collectible-card";

type Props = {
  payload: CardPayload;
  expiresAt: Date;
  burned: boolean;
};

export function CardPayloadView({ payload, expiresAt, burned }: Props) {
  void expiresAt;
  // Extract stats for the CollectibleCard from claims
  const stats = {
    age: payload.claims.find(c => c.field.toLowerCase() === 'age')?.value,
    gender: payload.claims.find(c => c.field.toLowerCase() === 'gender')?.value,
    occupation: payload.claims.find(c => c.field.toLowerCase() === 'occupation')?.value,
    location: payload.claims.find(c => c.field.toLowerCase() === 'location')?.value,
  };

  const isReddit = payload.claims.some(c => c.attribution?.toLowerCase().includes('reddit'));
  const isFace = payload.claims.some(c => c.attribution?.toLowerCase().includes('face'));

  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start lg:justify-center gap-12 lg:gap-24 py-6 lg:py-12 animate-in fade-in duration-1000">
      <div className="shrink-0 scale-100 lg:scale-110 lg:sticky lg:top-32">
        <CollectibleCard 
          title={payload.title}
          {...stats}
          isRedditVerified={isReddit}
          isFaceVerified={isFace}
          isConsistentDevice={true}
        />
      </div>

      <div className="w-full max-w-sm bg-white rounded-[32px] border-2 border-slate-900 p-7 space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 uppercase italic">Verification Details</h2>
           {burned && (
             <div className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-100">
               Burned after read
             </div>
           )}
        </div>

        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border space-y-2 ${payload.decision === "go" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className={`flex items-center gap-2 ${payload.decision === "go" ? "text-green-700" : "text-red-700"}`}>
              <ShieldCheck size={16} />
              <span className="text-[11px] font-black uppercase tracking-widest">
                {payload.decision === "go" ? "GO" : "NO-GO"}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-bold leading-relaxed uppercase">
              {payload.decisionReason ?? "Decision reason unavailable."}
            </p>
          </div>
          <ul className="space-y-3">
            {payload.claims.map((c, i) => (
              <li key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{c.field}</span>
                </div>
                <p className="text-sm font-bold text-slate-600 mb-2">{c.value}</p>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wide leading-tight italic">
                  {c.attribution}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-blue-400 border border-white/10 shadow-lg">
              <Lock size={12} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Privacy First</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Zap size={12} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">AI Audited</span>
            </div>
        </div>
      </div>
      
      <p className="w-full text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] text-center mt-12 mb-6 max-w-sm lg:max-w-none leading-relaxed">
        This identity anchor was generated using trustcard v0.1.0 • Model {payload.llmModel}
      </p>
    </div>
  );
}

export function FlashRevealShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fafafa] relative overflow-hidden">
      <div className="hero-bg" />
      <div className="dots-overlay" />
      <main className="container mx-auto max-w-4xl px-4 sm:px-6 py-5 sm:py-12 relative z-10">
        {children}
      </main>
      <footer className="py-6 sm:py-12 text-center relative z-10">
         <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
            Secured by trustcard protocol
         </div>
      </footer>
    </div>
  );
}
