import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Zap,
  Code,
  ArrowRight,
  CheckCircle2,
  UserCircle2,
  Instagram,
  Linkedin,
  Twitter,
  Smile,
  Ghost,
  Bot,
  User,
  Plus,
  Search,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Rocket,
  Shield,
  Briefcase,
  Users,
  Gamepad2,
  Heart,
  ShoppingCart,
  Banknote,
  Github
} from "lucide-react";

import { auth } from "@/server/auth";
import { AuthSlot, SignInButton } from "@/components/auth-buttons";
import { VerifyModal } from "@/components/verify-modal";
import { CollectibleCard } from "@/components/collectible-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const signedIn = !!session?.user?.id;

  const platforms = [
    { name: "Reddit", icon: <MessageSquare size={18} className="text-orange-500" /> },
    { name: "X (Twitter)", icon: <Twitter size={18} className="text-slate-900" /> },
    { name: "Instagram", icon: <Instagram size={18} className="text-pink-600" /> },
    { name: "LinkedIn", icon: <Linkedin size={18} className="text-blue-700" /> },
    { name: "Face ID", icon: <UserCircle2 size={18} className="text-blue-500" /> },
    { name: "18+ Check", icon: <ShieldCheck size={18} className="text-green-600" /> },
  ];

  return (
    <div className="min-h-screen selection:bg-blue-100 overflow-x-hidden">
      <div className="hero-bg"></div>
      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="relative pt-24 pb-20 overflow-hidden">
          <div className="dots-overlay"></div>
          <div className="container mx-auto max-w-6xl px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* LEFT SIDE */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-100 shadow-sm mb-6 transition-transform hover:-translate-y-0.5">
                <div className="h-2 w-2 rounded-[2px] bg-blue-500 shadow-[0_0_0_2px_rgba(37,99,235,0.15)]" />
                <span className="text-[12px] font-medium text-slate-500">Built for anonymous trust</span>
              </div>

              <h1 className="h1">
                Know who&apos;s behind the screen.<br />
                <span className="strike">Without revealing who they are.</span>
              </h1>

              <p className="mt-6 text-[17px] text-slate-500 max-w-lg leading-relaxed">
                No PII. No passwords. <span className="text-slate-900 font-semibold">Just digital trust.</span>
              </p>

              <div className="mt-8 flex items-center gap-3">
                {signedIn ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(37,99,235,0.45)] transition-all hover:bg-blue-700 hover:shadow-[0_16px_36px_-10px_rgba(37,99,235,0.55)] hover:-translate-y-0.5"
                  >
                    Generate Flashcard <ArrowRight size={14} />
                  </Link>
                ) : (
                  <SignInButton
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(37,99,235,0.45)] transition-all hover:bg-blue-700 hover:shadow-[0_16px_36px_-10px_rgba(37,99,235,0.55)] hover:-translate-y-0.5"
                  >
                    Start For Free <ArrowRight size={14} />
                  </SignInButton>
                )}

                <VerifyModal
                  trigger={
                    <button className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-[14px] font-semibold text-slate-900 shadow-sm transition-all hover:border-blue-600 hover:text-blue-600 hover:-translate-y-0.5">
                      Verify someone
                    </button>
                  }
                />
              </div>

              {/* Trust chips */}
              <div className="mt-12 flex flex-wrap gap-2">
                <Chip icon={<Ghost size={14} />} text="Everything anonymous" />
                <Chip icon={<Lock size={14} />} text="No passwords" />
                <Chip icon={<Zap size={14} />} text="Auto-deleted" />
                <Chip icon={<Github size={14} />} text="Open Source" />
              </div>
            </div>

            {/* RIGHT SIDE - STAGE */}
            <div className="lg:col-span-5 relative group">
              <div className="stage">
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-medium shadow-lg">
                    <Ghost size={12} className="text-blue-300" />
                    anonymous identity
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-100 text-[11px] font-medium text-slate-500">
                    <div className="h-2 w-2 rounded-[2px] bg-orange-500" />
                    Live
                  </div>
                </div>

                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 480" preserveAspectRatio="none">
                  <path d="M 60 130 Q 200 180 200 260" fill="none" stroke="rgba(37,99,235,0.15)" strokeWidth="1" strokeDasharray="3 4" />
                  <path d="M 340 160 Q 250 200 200 260" fill="none" stroke="rgba(37,99,235,0.15)" strokeWidth="1" strokeDasharray="3 4" />
                  <path d="M 40 300 Q 130 280 200 260" fill="none" stroke="rgba(37,99,235,0.15)" strokeWidth="1" strokeDasharray="3 4" />
                  <path d="M 360 360 Q 280 310 200 260" fill="none" stroke="rgba(37,99,235,0.15)" strokeWidth="1" strokeDasharray="3 4" />
                  <path d="M 130 430 Q 170 360 200 260" fill="none" stroke="rgba(37,99,235,0.15)" strokeWidth="1" strokeDasharray="3 4" />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="core">
                    <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-slate-900 text-slate-300 shadow-inner relative">
                      <User size={46} />
                      <div className="absolute -bottom-1.5 -right-1.5 h-10 w-10 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.5)] ring-4 ring-white">
                        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white shadow-[0_0_8px_white] animate-pulse" />
                        <Bot size={22} />
                      </div>
                    </div>
                    <div className="scan-beam"></div>
                  </div>
                </div>

                <div className="absolute top-[calc(50%+84px)] left-1/2 -translate-x-1/2 inline-flex items-center gap-2 bg-white border border-slate-100 px-3 py-1.5 rounded-full shadow-md z-10 transition-all group-hover:-translate-y-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  <span className="font-mono text-[12px] font-semibold text-slate-900">u/</span>
                  <span className="text-slate-400 font-mono tracking-widest text-[12px]">•••••••</span>
                  <span className="text-[10px] text-slate-300 font-mono ml-1">hidden</span>
                </div>

                <FloatBadge className="fb-1" text="Instagram" />
                <FloatBadge className="fb-2" text="Face match" />
                <FloatBadge className="fb-3" text="Reddit" />
                <FloatBadge className="fb-4" text="LinkedIn" />
                <FloatBadge className="fb-5" text="Consistent" />

                <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2.5 px-3 py-2 bg-slate-900/95 border border-white/10 rounded-xl text-white font-mono text-[11px] shadow-2xl z-10">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="agent-dot h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_0_3px_rgba(124,196,255,0.18),0_0_8px_#7CC4FF]" />
                    <span className="font-semibold flex-none">trubott_agent</span>
                    <span className="text-blue-300 overflow-hidden whitespace-nowrap text-ellipsis flex-1">
                      <span className="text-green-400 mr-1">✓</span> ownership verified
                    </span>
                  </div>
                  <span className="text-slate-500 flex-none tracking-tighter">14s ago</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* PLATFORM MARQUEE */}
        <section className="py-12 border-y border-slate-100 bg-white/30">
          <div className="relative flex overflow-x-hidden">
            <div className="animate-marquee flex whitespace-nowrap py-4">
              {[...platforms, ...platforms, ...platforms].map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-12 opacity-40 hover:opacity-100 transition-opacity cursor-default grayscale hover:grayscale-0">
                  {p.icon}
                  <span className="text-lg font-bold tracking-tight text-slate-900">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="py-24 relative overflow-hidden bg-white/50">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
              <div className="lg:col-span-7">
                <div className="mb-12">
                  <span className="eyebrow">how it works</span>
                  <h2 className="text-4xl font-black tracking-tighter text-slate-900 mt-3 uppercase">Three things. That&apos;s it.</h2>
                </div>

                <div className="flex flex-col gap-4">
                  <Step number="1" title="Verify ownership of the social account" description="Connect your handle securely. No passwords, no data logs." color="bg-orange-500" />
                  <Step number="2" title="Quick liveness check" description="2-second biometric verification to prove you are human." color="bg-blue-600" />
                  <Step number="3" title="Verify identity via flashcard" description="Receive your secure, anonymous trust card instantly." color="bg-green-600" />
                </div>
              </div>

              <div className="lg:col-span-5 flex justify-center">
                <div className="relative scale-90 sm:scale-100 opacity-90 hover:opacity-100 transition-opacity">
                  <div className="absolute -inset-4 bg-blue-500/5 blur-2xl rounded-[40px] -z-10" />
                  <CollectibleCard
                    title="Verified Identity"
                    location="California"
                    age="35"
                    occupation="Software Engineer"
                    gender="Male"
                    isRedditVerified={true}
                    isFaceVerified={true}
                    isConsistentDevice={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* USE CASES */}
        <section className="py-24">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="text-center mb-16">
              <span className="eyebrow">use cases</span>
              <h2 className="text-4xl font-black tracking-tighter text-slate-900 mt-3 uppercase">
                Built for Real Problems
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              <UseCase
                icon={<Banknote size={20} />}
                title="Financial transactions"
                body="Prove account maturity and consistent activity before high-value P2P deals."
                color="bg-blue-500"
              />
              <UseCase
                icon={<Heart size={20} />}
                title="Dating safety"
                body="Share limited trust badges before meeting, without doxxing full identity."
                color="bg-pink-500"
              />
              <UseCase
                icon={<Gamepad2 size={20} />}
                title="Online gaming"
                body="Reduce smurf/scam risk with disposable proof cards for tournament admins."
                color="bg-slate-900"
              />
              <UseCase
                icon={<ShoppingCart size={20} />}
                title="Marketplaces"
                body="Show reputation signals to buyers while keeping personal details private."
                color="bg-green-600"
              />
              <UseCase
                icon={<Users size={20} />}
                title="Communities"
                body="Gate sensitive groups with proof of history instead of real-name KYC."
                color="bg-orange-500"
              />
              <UseCase
                icon={<Briefcase size={20} />}
                title="Freelancer hiring"
                body="Share selective proof on experience-linked handles for short engagements."
                color="bg-purple-600"
              />
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-24 bg-white/50 border-y border-slate-100">
          <div className="container mx-auto max-w-6xl px-6 text-center relative z-10">
            <span className="eyebrow">Simple Pricing</span>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 mt-3 mb-16 uppercase">One Price. Complete Trust.</h2>

            <div className="max-w-md mx-auto">
              <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
                <div className="absolute top-0 right-0 p-4">
                  <div className="bg-blue-600 text-[10px] font-black text-white px-2 py-1 rounded-md uppercase tracking-widest">Popular</div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4">Mint Flash Card</h3>
                <div className="flex items-baseline justify-center gap-1 mb-8">
                  <span className="text-5xl font-black text-slate-900">$2</span>
                  <span className="text-slate-400 font-bold uppercase text-[12px]">per card</span>
                </div>

                <ul className="space-y-4 mb-10 text-left">
                  <li className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                    <CheckCircle2 className="text-blue-500 flex-none" size={18} />
                    <span>Liveness face verification</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                    <CheckCircle2 className="text-blue-500 flex-none" size={18} />
                    <span>Anonymous ID attestation</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                    <CheckCircle2 className="text-blue-500 flex-none" size={18} />
                    <span>Privacy-First Identity badges</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                    <CheckCircle2 className="text-blue-500 flex-none" size={18} />
                    <span>Auto-delete after verification</span>
                  </li>
                </ul>

                <SignInButton
                  className="w-full h-12 flex items-center justify-center rounded-xl bg-blue-600 text-[14px] font-black text-white uppercase tracking-widest transition-all hover:bg-blue-700 hover:-translate-y-1 shadow-[0_8px_20px_-4px_rgba(37,99,235,0.4)]"
                >
                  Get Started
                </SignInButton>
                <p className="mt-4 text-[10px] text-slate-400 font-medium">
                  TruBott is open source. <Link href="https://github.com/trubott/trubott" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Self-host it for free</Link>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TRUSTED BY MILLIONS SECTION */}
        <section className="py-24 bg-white border-b border-slate-100">
          <div className="container mx-auto max-w-6xl px-6 text-center mb-12">
            <span className="eyebrow">community trust</span>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 mt-3 uppercase">
              Trusted by millions for their safety.
            </h2>
          </div>

          <div className="relative flex overflow-x-hidden">
            <div className="animate-marquee-slow flex whitespace-nowrap py-8 items-center">
              {[1, 2, 3].map((set) => (
                <div key={set} className="flex items-center gap-20 px-10">
                  <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all cursor-default grayscale hover:grayscale-0">
                    <MessageSquare className="text-orange-500" size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Reddit</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all cursor-default grayscale hover:grayscale-0">
                    <Twitter className="text-slate-900" size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">X (Twitter)</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all cursor-default grayscale hover:grayscale-0">
                    <Linkedin className="text-blue-700" size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">LinkedIn</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all cursor-default grayscale hover:grayscale-0">
                    <Ghost className="text-yellow-400" size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Snapchat</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all cursor-default grayscale hover:grayscale-0">
                    <Bot className="text-indigo-500" size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Discord</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all cursor-default grayscale hover:grayscale-0">
                    <Instagram className="text-pink-600" size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Instagram</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all cursor-default grayscale hover:grayscale-0">
                    <Rocket className="text-blue-600" size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Meta</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all cursor-default grayscale hover:grayscale-0">
                    <Sparkles className="text-slate-900" size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">TikTok</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all cursor-default grayscale hover:grayscale-0">
                    <Heart className="text-red-500" size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Tinder</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all cursor-default grayscale hover:grayscale-0">
                    <Smile className="text-yellow-500" size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Bumble</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all cursor-default grayscale hover:grayscale-0">
                    <Heart className="text-purple-600" size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Hinge</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-24 bg-white/60 border-b border-slate-100">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="text-center mb-14">
              <span className="eyebrow">testimonials</span>
              <h2 className="text-4xl font-black tracking-tighter text-slate-900 mt-3 uppercase">
                Real trust moments
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TestimonialCard
                app="Reddit"
                name="Aman P."
                role="Crypto trader"
                quote="I used TruBott before a high-ticket OTC deal. The other side could verify I was real and active without asking for my personal documents first. It reduced friction and made the conversation professional from the first message."
              />
              <TestimonialCard
                app="Reddit"
                name="Nisha V."
                role="Remote consultant"
                quote="I had to prove my location and consistency before joining a private project group. The flash card gave enough trust signals without exposing my identity. It felt like the right balance between privacy and safety."
              />
              <TestimonialCard
                app="Reddit"
                name="Rahul M."
                role="Community moderator"
                quote="We used it to filter obvious scammers in DMs. People claiming random personas dropped off quickly when asked to share a trust card. Genuine users usually completed verification in minutes."
              />
              <TestimonialCard
                app="LinkedIn + WhatsApp"
                name="Dev Malhotra"
                role="Real estate investor"
                quote="Before sharing sensitive deal credentials, I ask counterparties for a trust card. I even used one myself to establish credibility on net worth conversations before revealing deeper financial documents. It saves time and removes guesswork."
              />
              <TestimonialCard
                app="Gleeden"
                name="Ananya S."
                role="Verified user"
                quote="I wanted to show I am a genuine woman without sharing personal IDs too early. The liveness plus social ownership checks made the other person comfortable. It helped set a respectful tone before moving the chat forward."
              />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 border-t border-slate-100 bg-white">
          <div className="container mx-auto max-w-5xl px-6">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-12 text-center uppercase">Frequently Asked</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <FAQItem
                question="What is a Trubott Flash Card?"
                answer="A single-use digital ID that proves your identity using live face checks and social profile data."
              />
              <FAQItem
                question="Is my biometric data stored?"
                answer="No. Face checks happen in your browser. We never see or store your raw face data."
              />
              <FAQItem
                question="How long do cards last?"
                answer="Cards are ephemeral and expire automatically after 24 hours or a single use."
              />
              <FAQItem
                question="What is being verified?"
                answer="We verify that the person in front of the camera matches the social profile (LinkedIn/IG) they claim."
              />
              <FAQItem
                question="Is it 100% accurate?"
                answer="Our AI is highly accurate at detecting deepfakes and mismatches, but always use your own judgment."
              />
              <FAQItem
                question="Can I delete my data?"
                answer="Yes. You have full control. You can delete your account and all social links instantly."
              />
            </div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="py-32 relative overflow-hidden">
          <div className="container mx-auto max-w-4xl px-6 text-center">
            <span className="eyebrow">get started</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 leading-[1.1] uppercase mt-4">
              Ready to establish your<br />
              <span className="text-blue-600 italic">digital trust?</span>
            </h2>
            <p className="mt-8 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Join thousands of Redditors using TruBott to protect their identity while proving their reputation. No passwords, no storage, just proof.
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              {signedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-10 text-[15px] font-bold text-white shadow-xl transition-all hover:bg-blue-700 hover:-translate-y-1"
                >
                  Start for free <ArrowRight size={18} />
                </Link>
              ) : (
                <SignInButton
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-10 text-[15px] font-bold text-white shadow-xl transition-all hover:bg-blue-700 hover:-translate-y-1"
                >
                  Start For Free <ArrowRight size={18} />
                </SignInButton>
              )}
              <VerifyModal
                trigger={
                  <button className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-10 text-[15px] font-bold text-slate-900 shadow-sm transition-all hover:border-blue-600 hover:text-blue-600 hover:-translate-y-1">
                    Verify someone
                  </button>
                }
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-slate-50 py-20 relative z-10">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start mb-16">
            <div className="md:col-span-4">
              <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg">
                  <ShieldCheck size={18} />
                </div>
                TruBott
              </Link>
              <p className="mt-6 text-sm text-slate-500 leading-relaxed max-w-xs">
                The trust primitive for the anonymous web. Prove your reputation without ever revealing your identity.
              </p>
            </div>

            <div className="md:col-span-2 md:col-start-6">
              <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-widest mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#how" className="hover:text-blue-600 transition">How it works</a></li>
                <li><Link href="/cards/new" className="hover:text-blue-600 transition">Get verified</Link></li>
                <li><VerifyModal trigger={<button className="hover:text-blue-600 transition">Verify a card</button>} /></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-widest mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><Link href="/privacy" className="hover:text-blue-600 transition">Privacy policy</Link></li>
                <li><Link href="/terms" className="hover:text-blue-600 transition">Terms of use</Link></li>
                <li><a href="mailto:contact@trubott.com" className="hover:text-blue-600 transition">Contact us</a></li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-widest mb-6">Socials</h4>
              <div className="flex gap-3">
                <SocialLink icon={<Github size={18} />} href="https://github.com/trubott/trubott" />
                <SocialLink icon={<Twitter size={18} />} href="https://twitter.com/trubott" />
                <SocialLink icon={<MessageSquare size={18} />} href="https://reddit.com/r/trubott" />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-400 font-medium">
              © {new Date().getFullYear()} TruBott · Secure trust primitive.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center md:justify-end">
              <a href="mailto:contact@trubott.com" className="text-xs text-slate-400 hover:text-blue-600 font-medium transition-colors">Contact Support</a>
              <Link href="/privacy" className="text-xs text-slate-400 hover:text-blue-600 font-medium transition-colors">Privacy</Link>
              <Link href="/terms" className="text-xs text-slate-400 hover:text-blue-600 font-medium transition-colors">Terms</Link>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-slate-400 text-center md:text-left">
            Have questions or issues? Email us at <a href="mailto:contact@trubott.com" className="text-blue-500 hover:underline">contact@trubott.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="chip">
      {icon}
      {text}
    </div>
  );
}

function FloatBadge({ className, text }: { className: string; text: string }) {
  return (
    <div className={`float-badge ${className}`}>
      <span className="check-ico">
        <CheckCircle2 size={9} strokeWidth={4} />
      </span>
      {text}
    </div>
  );
}

function UseCase({ icon, title, body, color }: { icon: React.ReactNode; title: string; body: string; color: string }) {
  return (
    <div className="pill-card !rounded-2xl !items-start !p-6 flex-col sm:flex-row !gap-5">
      <div className={`flex-none flex h-10 w-10 items-center justify-center rounded-xl ${color} text-white shadow-lg`}>
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`h-2 w-2 rounded-full ${color}`} />
          <h3 className="text-[16px] font-bold text-slate-900">{title}</h3>
        </div>
        <p className="text-[13.5px] text-slate-500 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Step({ number, title, description, color }: { number: string; title: string; description: string; color: string }) {
  return (
    <div className="pill-card !rounded-2xl !items-start !p-5">
      <div className={`flex-none flex h-8 w-8 items-center justify-center rounded-lg ${color} text-white font-bold text-sm shadow-lg`}>
        {number}
      </div>
      <div className="flex-1">
        <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight">{title}</h3>
        <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function SocialLink({ icon, href }: { icon: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:border-blue-600 hover:text-blue-600 hover:-translate-y-1 transition-all shadow-sm"
    >
      {icon}
    </a>
  );
}

function TestimonialCard({
  app,
  name,
  role,
  quote,
}: {
  app: string;
  name: string;
  role: string;
  quote: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700">
        Used on {app}
      </div>
      <p className="mt-4 text-[14px] leading-relaxed text-slate-600">&ldquo;{quote}&rdquo;</p>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-[12px] font-black uppercase tracking-wide text-slate-900">{name}</p>
        <p className="text-[11px] font-medium text-slate-500">{role}</p>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 hover:border-blue-200 transition-colors">
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">{question}</h3>
      <p className="text-[13px] text-slate-500 leading-relaxed">{answer}</p>
    </div>
  );
}
