import Link from "next/link";
import { ShieldCheck, Github } from "lucide-react";
import { AuthSlot } from "./auth-buttons";
import { VerifyModal } from "./verify-modal";
import { NavbarMobile } from "./navbar-mobile";

export function Navbar() {
  return (
    <header className="fixed-nav h-14">
      <div className="container mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        {/* LEFT: LOGO */}
        <div className="flex-1 flex justify-start">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg">
              <ShieldCheck size={18} />
            </div>
            <span className="hidden sm:inline">TruBott</span>
            <span className="ml-2 hidden lg:inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              Open Source
            </span>
          </Link>
        </div>

        {/* CENTER: PRIMARY ACTION (Centered on desktop) */}
        <div className="hidden md:flex flex-1 justify-center">
          <VerifyModal />
        </div>

        {/* RIGHT: NAVIGATION & AUTH */}
        <div className="flex-1 flex justify-end items-center gap-4">
          <nav className="hidden lg:flex items-center gap-7 text-sm text-slate-500 font-medium mr-4">
            <Link href="/#how" className="hover:text-slate-900 transition whitespace-nowrap">How it works</Link>
            <Link href="/#pricing" className="hover:text-slate-900 transition whitespace-nowrap">Pricing</Link>
            <Link 
              href="https://github.com/trubott/trubott" 
              target="_blank"
              className="flex items-center gap-1.5 hover:text-slate-900 transition whitespace-nowrap"
            >
              <Github size={16} />
              <span>GitHub</span>
            </Link>
          </nav>
          
          <div className="hidden md:block">
            <AuthSlot />
          </div>

          {/* MOBILE TOGGLE & MENU */}
          <NavbarMobile>
            <nav className="flex flex-col p-6 gap-6">
              <div className="flex justify-center border-b border-slate-50 pb-6">
                <VerifyModal />
              </div>
              <Link 
                href="/#how" 
                className="text-sm font-bold text-slate-900 uppercase tracking-widest text-center"
              >
                How it works
              </Link>
              <Link 
                href="https://github.com/trubott/trubott" 
                target="_blank"
                className="text-sm font-bold text-slate-900 uppercase tracking-widest text-center flex items-center justify-center gap-2"
              >
                <Github size={16} />
                GitHub
              </Link>
              <div className="pt-2 flex justify-center">
                <AuthSlot />
              </div>
            </nav>
          </NavbarMobile>
        </div>
      </div>
    </header>
  );
}
