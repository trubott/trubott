"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

interface NavbarMobileProps {
  children: React.ReactNode;
}

export function NavbarMobile({ children }: NavbarMobileProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* MOBILE TOGGLE */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* MOBILE MENU OVERLAY */}
      {isOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-white border-b border-slate-100 shadow-xl animate-in slide-in-from-top-2 duration-300 z-50">
          <div onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
