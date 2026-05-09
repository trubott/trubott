"use client";

import * as React from "react";
import { X, Sparkles, ArrowRight, ShieldCheck, UserCircle2, Zap, LucideIcon } from "lucide-react";

interface Step {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

const STEPS: Step[] = [
  {
    title: "Welcome to TruBott",
    description: "Your new platform for verified digital trust without compromising privacy.",
    icon: Sparkles,
    color: "text-blue-500",
  },
  {
    title: "Connect & Prove",
    description: "Link your social accounts by adding a temporary code to your bio. No passwords required.",
    icon: ShieldCheck,
    color: "text-orange-500",
  },
  {
    title: "Human Liveness",
    description: "A quick 2-second biometric check ensures you're a real person, not a bot.",
    icon: UserCircle2,
    color: "text-blue-600",
  },
  {
    title: "Mint Your Card",
    description: "Generate a cryptographically signed trust card to share your verified credentials anywhere.",
    icon: Zap,
    color: "text-green-600",
  },
];

export function OnboardingWalkthrough() {
  const [show, setShow] = React.useState(false);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const visited = localStorage.getItem("trubott_visited");
    if (!visited) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    localStorage.setItem("trubott_visited", "true");
    setShow(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      close();
    }
  };

  if (!show) return null;

  const Icon = STEPS[step].icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500" onClick={close} />
      
      <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 border border-white/20">
        <div className="p-8 sm:p-10">
          <button 
            onClick={close}
            className="absolute top-6 right-6 h-8 w-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 shadow-sm border border-slate-100">
              <Icon size={32} className={STEPS[step].color} />
            </div>
            
            <div className="space-y-1 mb-8">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Step {step + 1} of {STEPS.length}</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{STEPS[step].title}</h2>
              <p className="text-sm text-slate-500 leading-relaxed pt-2">
                {STEPS[step].description}
              </p>
            </div>

            <div className="w-full space-y-4">
              <button
                onClick={next}
                className="w-full h-14 bg-blue-600 rounded-2xl text-[13px] font-black text-white uppercase tracking-widest shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {step === STEPS.length - 1 ? "Get Started" : "Continue"}
                <ArrowRight size={16} />
              </button>

              <div className="flex justify-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-600' : 'w-2 bg-slate-100'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
