import Link from "next/link";
import { Github, Star } from "lucide-react";

export function Banner() {
  return (
    <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-slate-900 px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
      <div
        className="absolute left-[max(-7rem,calc(50%-52rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        aria-hidden="true"
      >
        <div
          className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-blue-400 to-blue-600 opacity-20"
          style={{
            clipPath:
              'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 44.1% 85.2%, 74.8% 41.9%)',
          }}
        />
      </div>
      <div
        className="absolute left-[max(45rem,calc(50%+8rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        aria-hidden="true"
      >
        <div
          className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-blue-400 to-blue-600 opacity-20"
          style={{
            clipPath:
              'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 44.1% 85.2%, 74.8% 41.9%)',
          }}
        />
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-x-4 gap-y-2 text-center sm:text-left">
        <p className="text-xs sm:text-sm leading-6 text-white">
          <strong className="font-semibold">TruBott is now Open Source!</strong>
          <span className="hidden sm:inline">
            <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true">
              <circle cx={1} cy={1} r={1} />
            </svg>
            Help us build the trust primitive for the anonymous web.
          </span>
        </p>
        <Link
          href="https://github.com/trubott/trubott"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-none rounded-full bg-white/10 px-3 py-1 text-[10px] sm:text-sm font-semibold text-white shadow-sm hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white flex items-center gap-2"
        >
          <Github size={14} /> View on GitHub <Star size={12} className="text-yellow-400 fill-yellow-400" />
        </Link>
      </div>
      <div className="flex flex-1 justify-end">
      </div>
    </div>
  );
}
