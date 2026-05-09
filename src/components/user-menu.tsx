"use client";

import * as React from "react";
import { LogOut, User, Mail, ChevronDown } from "lucide-react";

export function UserMenu({ 
  user,
  signOutAction 
}: { 
  user: { name?: string | null; email?: string | null; image?: string | null };
  signOutAction: () => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-50 transition-colors group"
      >
        <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-blue-50 text-blue-600 font-bold text-sm">
          {user.image ? (
            <img src={user.image} alt={user.name ?? "User"} className="h-full w-full object-cover" />
          ) : (
            <span>{(user.name ?? "U").charAt(0).toUpperCase()}</span>
          )}
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl menu-shadow border border-slate-100 overflow-hidden animate-in zoom-in-95 fade-in duration-200 origin-top-right z-[120]">
          <div className="p-4 border-b border-slate-50 bg-slate-50/30">
            <p className="text-sm font-bold text-slate-900 truncate">{user.name ?? "Signed in"}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
          </div>
          
          <div className="p-1.5">
            <button
              onClick={() => {
                setIsOpen(false);
                signOutAction();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
