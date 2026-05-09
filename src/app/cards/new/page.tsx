import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { AuthSlot } from "@/components/auth-buttons";
import { CardCreateClient } from "@/components/card-create-client";
import { buildEvidence } from "@/server/cards/evidence";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ session_id?: string; flashPaid?: string }>;
};

export default async function NewCardPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const sp = await searchParams;

  const evidence = await buildEvidence(session.user.id);
  const signals = {
    redditVerified: evidence.redditHandles.length > 0,
    faceVerified: Boolean(evidence.face?.passedAt),
    consistentDevice: evidence.passive.consistent,
    redditHandles: evidence.redditHandles,
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="container mx-auto max-w-6xl px-6 py-16">
        <CardCreateClient
          initialStripeSessionId={sp.session_id}
          initialFlashPaidHint={sp.flashPaid}
          signals={signals}
        />
      </main>

      <footer className="border-t py-12 bg-white">
        <div className="container mx-auto px-6 text-center space-y-4">
          <div className="text-[12px] font-black tracking-tighter italic uppercase">TruBott</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
            Privacy-First Identity Attestation • Powered by AI
          </p>
        </div>
      </footer>
    </div>
  );
}
