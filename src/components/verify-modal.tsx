"use client";

import * as React from "react";
import { X, Search } from "lucide-react";
import { OpenCardForm } from "./open-card-form";

export function VerifyModal({ trigger }: { trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 text-[15px] font-black transition-colors px-3 py-1.5 rounded-lg whitespace-nowrap ${isOpen ? 'bg-slate-50 text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Search size={16} />
          Verify a card
        </button>
      )}

      {isOpen && (
        <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 w-[min(92vw,400px)] bg-white rounded-2xl menu-shadow border border-slate-100 overflow-hidden animate-in zoom-in-95 fade-in duration-200 origin-top z-[120]">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Search size={14} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-none">Verify card</h2>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Security Gate</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-1.5 border border-slate-100/50">
              <OpenCardForm onSubmitStart={() => setIsOpen(false)} />
            </div>

            <div className="mt-5 text-center">
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Protected by TruBott cryptographic verification.<br/>
                No personal data is stored on our servers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
