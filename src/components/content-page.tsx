import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

interface ContentPageProps {
  title: string;
  subtitle: string;
  eyebrow: string;
  children: React.ReactNode;
  ctaText?: string;
  ctaHref?: string;
}

export function ContentPage({
  title,
  subtitle,
  eyebrow,
  children,
  ctaText = "Generate Flashcard",
  ctaHref = "/cards/new",
}: ContentPageProps) {
  return (
    <div className="min-h-screen selection:bg-blue-100 bg-white">
      <div className="hero-bg"></div>
      
      <main className="relative z-10 pt-24 pb-32">
        <div className="container mx-auto max-w-4xl px-6">
          <div className="text-center mb-20 space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-black uppercase tracking-widest text-blue-600">
              <ShieldCheck size={12} />
              {eyebrow}
            </span>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase italic leading-tight">
              {title}
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>

          <div className="prose prose-slate max-w-none mb-24">
            {children}
          </div>

          <div className="bg-slate-900 rounded-[40px] p-12 text-center space-y-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-4">
                Ready to verify?
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[12px] mb-8">
                No passwords · No PII · 100% Anonymous
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href={ctaHref}
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-blue-600 px-10 text-[15px] font-black text-white uppercase tracking-widest transition-all hover:bg-blue-700 hover:-translate-y-1 shadow-[0_8px_24px_-8px_rgba(37,99,235,0.45)]"
                >
                  {ctaText} <ArrowRight size={18} />
                </Link>
                <Link
                  href="/"
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-10 text-[15px] font-black text-white uppercase tracking-widest transition-all hover:bg-white/10 hover:-translate-y-1"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Trust section footer */}
      <section className="py-20 border-t border-slate-100 bg-slate-50">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap justify-center gap-12 opacity-50">
             <div className="flex items-center gap-2">
               <CheckCircle2 size={16} className="text-blue-600" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Biometric Liveness</span>
             </div>
             <div className="flex items-center gap-2">
               <CheckCircle2 size={16} className="text-blue-600" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Social Ownership</span>
             </div>
             <div className="flex items-center gap-2">
               <CheckCircle2 size={16} className="text-blue-600" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Zero Data Storage</span>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ContentSection({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: any }) {
  return (
    <section className="mb-20">
      <div className="flex items-center gap-4 mb-6">
        {Icon && <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg"><Icon size={20} /></div>}
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic">{title}</h2>
      </div>
      <div className="text-lg text-slate-600 leading-relaxed space-y-4">
        {children}
      </div>
    </section>
  );
}
