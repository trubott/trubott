"use client";

import { User2, ShieldCheck } from "lucide-react";

interface CollectibleCardProps {
  title?: string;
  age?: string;
  gender?: string;
  occupation?: string;
  location?: string;
  isRedditVerified?: boolean;
  isFaceVerified?: boolean;
  isConsistentDevice?: boolean;
}

export function CollectibleCard({
  title,
  age,
  gender,
  occupation,
  location,
  isRedditVerified,
  isFaceVerified,
  isConsistentDevice,
}: CollectibleCardProps) {
  
  const isFemale = (gender?.toLowerCase().includes("female") || gender?.toLowerCase().includes("woman"));
  const iconColor = isFemale ? "text-pink-400 bg-pink-500/10" : "text-blue-400 bg-blue-500/10";
  const glowColor = isFemale ? "bg-pink-500/20" : "bg-blue-500/20";

  return (
    <div className="relative w-[min(90vw,320px)] bg-slate-900 rounded-[40px] p-3 shadow-2xl overflow-hidden group animate-in zoom-in-95 duration-500 border border-white/10">
      {/* Dynamic Background Glow */}
      <div className={`absolute -top-24 -left-24 h-48 w-48 ${glowColor} blur-[80px] group-hover:opacity-60 transition-all duration-700`} />
      
      <div className="relative z-10 space-y-3">
        {/* Header Area */}
        <div className="flex items-center justify-between px-3 pt-2">
           <div />
           <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] font-black text-slate-400 uppercase tracking-widest">
             SINGLE USE
           </div>
        </div>

        {/* Avatar Section - DEFAULT ICONS */}
        <div className="relative aspect-square w-full rounded-[32px] overflow-hidden bg-slate-800 border border-white/5 flex items-center justify-center">
          <div className={`h-full w-full flex items-center justify-center ${iconColor} transition-transform duration-700 group-hover:scale-110`}>
             <User2 size={120} strokeWidth={1} className="opacity-80" />
          </div>
          
          {/* Stats Overlay at the bottom of image */}
          <div className="absolute bottom-3 left-3 right-3 p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 grid grid-cols-2 gap-y-2.5">
            <div className="flex flex-col">
              <span className={`text-[8px] font-bold ${isFemale ? 'text-pink-300' : 'text-blue-300'} uppercase tracking-widest`}>Location</span>
              <span className="text-[12px] font-black text-white truncate max-w-[110px] uppercase leading-tight">{location || "--"}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-[8px] font-bold ${isFemale ? 'text-pink-300' : 'text-blue-300'} uppercase tracking-widest`}>Age</span>
              <span className="text-[12px] font-black text-white uppercase leading-tight">{age || "--"}</span>
            </div>
            <div className="flex flex-col">
              <span className={`text-[8px] font-bold ${isFemale ? 'text-pink-300' : 'text-blue-300'} uppercase tracking-widest`}>Work</span>
              <span className="text-[12px] font-black text-white truncate max-w-[110px] uppercase leading-tight">{occupation || "--"}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-[8px] font-bold ${isFemale ? 'text-pink-300' : 'text-blue-300'} uppercase tracking-widest`}>Gender</span>
              <span className="text-[12px] font-black text-white uppercase leading-tight">{gender || "--"}</span>
            </div>
          </div>

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
             {isRedditVerified && <BadgeIcon icon={<ShieldCheck size={10} />} color="bg-orange-500" />}
          </div>
        </div>

        {/* Content Area */}
        <div className="px-3 pb-4 space-y-4">
          <div className="space-y-1">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Note Attachment</span>
             <h3 className="text-[13px] font-bold text-white uppercase tracking-tight leading-tight italic">{title || "--"}</h3>
          </div>

          <div className="pt-1 flex items-center justify-center pb-0.5">
             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/12 border border-green-400/30 text-green-300">
               <ShieldCheck size={10} />
               <span className="text-[8px] font-black uppercase tracking-widest">Verified by TruBott</span>
             </div>
          </div>
        </div>
      </div>

      {/* Decorative Scifi corners */}
      <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />
      <div className={`absolute bottom-0 left-0 h-16 w-16 bg-gradient-to-tr ${isFemale ? 'from-pink-500/5' : 'from-blue-500/5'} to-transparent pointer-events-none`} />
    </div>
  );
}

function BadgeIcon({ icon, color }: { icon: any, color: string }) {
  return (
    <div className={`flex items-center justify-center h-5 w-5 rounded-lg ${color} text-white shadow-lg border border-white/20`}>
      {icon}
    </div>
  );
}
