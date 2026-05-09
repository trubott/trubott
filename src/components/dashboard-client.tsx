"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  MessageSquare,
  Instagram,
  Linkedin,
  Twitter,
  UserCircle2,
  ArrowRight,
  CheckCircle2,
  Plus,
  X,
  Settings2,
  Lock,
  Zap
} from "lucide-react";
import { VerifyRedditClient } from "./verify-reddit-client";
import { BioVerifyClient } from "./bio-verify-client";
import { FaceCheckClient } from "./face-check-client";

type Platform = "reddit" | "linkedin" | "instagram" | "twitter";

interface DashboardClientProps {
  initialAccounts: { platform: string; handle: string }[];
  initialFaceCheck: boolean;
}

export function DashboardClient({ initialAccounts, initialFaceCheck }: DashboardClientProps) {
  const [activeModal, setActiveModal] = React.useState<Platform | "face-check" | null>(null);

  const isVerified = (platform: Platform) => initialAccounts.some(a => a.platform === platform);
  const getHandle = (platform: Platform) => initialAccounts.find(a => a.platform === platform)?.handle;

  const closeModal = () => setActiveModal(null);

  return (
    <div className="space-y-12">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="eyebrow">Identity Hub</span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mt-2">Verified Signals</h1>
          <p className="mt-4 text-slate-500 max-w-lg leading-relaxed">
            Manage your secure trust identity. Each signal is cryptographically bound to your account.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/cards/new"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-[14px] font-bold text-white shadow-xl transition-all hover:bg-blue-700 hover:-translate-y-0.5"
          >
            <Plus size={18} />
            MINT FLASH CARD
          </Link>
        </div>
      </div>

      {/* Verification Grid - Rounded for "soft" look */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <PlatformCard
          platform="face-check"
          icon={<UserCircle2 size={20} className="text-blue-500" />}
          title="Liveliness Check"
          isVerified={initialFaceCheck}
          description="Verified"
          onClick={() => !initialFaceCheck && setActiveModal("face-check")}
        />

        <PlatformCard
          platform="linkedin"
          icon={<Linkedin size={20} className="text-blue-700" />}
          title="LinkedIn Professional"
          isVerified={isVerified("linkedin")}
          handle={getHandle("linkedin")}
          onClick={() => !isVerified("linkedin") && setActiveModal("linkedin")}
        />

        <PlatformCard
          platform="instagram"
          icon={<Instagram size={20} className="text-pink-600" />}
          title="Instagram Profile"
          isVerified={isVerified("instagram")}
          handle={getHandle("instagram")}
          onClick={() => !isVerified("instagram") && setActiveModal("instagram")}
        />

        <PlatformCard
          platform="twitter"
          icon={<Twitter size={20} className="text-slate-900" />}
          title="X (Twitter) Bio"
          isVerified={isVerified("twitter")}
          handle={getHandle("twitter")}
          onClick={() => !isVerified("twitter") && setActiveModal("twitter")}
        />

        <PlatformCard
          platform="reddit"
          icon={<MessageSquare size={20} className="text-orange-500" />}
          title="Reddit Identity"
          isVerified={isVerified("reddit")}
          handle={getHandle("reddit")}
          onClick={() => !isVerified("reddit") && setActiveModal("reddit")}
        />

      </div>

      {/* MODAL OVERLAY - STRICTLY SHARP/RECTANGULAR */}
      {activeModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 md:p-8">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" onClick={closeModal} />
          <div className="relative w-full max-w-xl bg-white border border-slate-200 shadow-2xl animate-in zoom-in-100 slide-in-from-top-4 duration-500 rounded-3xl sm:rounded-[40px] overflow-hidden max-h-[90vh] flex flex-col">
            <button 
              onClick={closeModal} 
              className="absolute top-6 right-6 z-[160] h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
            >
              <X size={20} />
            </button>
            
            <div className="p-5 sm:p-8 overflow-y-auto no-scrollbar">
              <div className="min-h-0">
                {(activeModal === "reddit" || activeModal === "instagram" || activeModal === "linkedin" || activeModal === "twitter") && (
                  <BioVerifyClient platform={activeModal as any} />
                )}
                {activeModal === "face-check" && (
                  <FaceCheckClient
                    onSuccess={() => {
                      closeModal();
                      window.location.href = "/dashboard";
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformCard({
  platform,
  icon,
  title,
  isVerified,
  handle,
  description,
  onClick
}: {
  platform: string;
  icon: React.ReactNode;
  title: string;
  isVerified: boolean;
  handle?: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`pill-card !rounded-[32px] !p-7 flex-col !items-start !gap-6 transition-all cursor-pointer bg-white border-slate-100 hover:shadow-xl hover:-translate-y-1 ${isVerified ? 'border-green-100 bg-green-50/10' : 'hover:border-blue-200'}`}
    >
      <div className="w-full flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${isVerified ? 'bg-white text-green-600' : 'bg-slate-50 text-slate-400'}`}>
          {icon}
        </div>

        {/* Soft Toggle Switch UI - RESTORED */}
        <div className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${isVerified ? 'bg-green-500' : 'bg-slate-200'}`}>
          <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isVerified ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      </div>

      <div>
        <h3 className="text-[17px] font-bold text-slate-900">{title}</h3>
        {isVerified ? (
          <div className="flex items-center gap-2 mt-1.5 text-green-600">
            <CheckCircle2 size={14} strokeWidth={3} />
            <span className="text-sm font-bold truncate max-w-[150px]">
              {handle ? (platform === 'reddit' ? `u/${handle}` : `@${handle}`) : (description || 'Verified')}
            </span>
          </div>
        ) : (
          <p className="text-sm text-slate-400 mt-1 font-medium">Not verified yet</p>
        )}
      </div>

      {!isVerified && (
        <div className="w-full mt-2 pt-5 border-t border-slate-50 flex items-center justify-between group/btn">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Verify Now</span>
          <ArrowRight size={14} className="text-blue-600 transition-transform group-hover/btn:translate-x-1" />
        </div>
      )}
    </div>
  );
}
