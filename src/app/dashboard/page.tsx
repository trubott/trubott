import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { auth } from "@/server/auth";
import { db } from "@/db";
import { connectedAccounts, faceChecks } from "@/db/schema";
import { AuthSlot } from "@/components/auth-buttons";
import { DashboardClient } from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const [accounts, mostRecentFace] = await Promise.all([
    db.query.connectedAccounts.findMany({
      where: eq(connectedAccounts.userId, userId),
    }),
    db.query.faceChecks.findFirst({
      where: eq(faceChecks.userId, userId),
      orderBy: (t, { desc }) => [desc(t.passedAt)],
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <main className="container mx-auto max-w-6xl px-6 pt-14 pb-20">
        <DashboardClient 
          initialAccounts={accounts.map(a => ({ platform: a.platform, handle: a.handle }))}
          initialFaceCheck={Boolean(mostRecentFace)}
        />
      </main>

      <footer className="py-12 border-t border-slate-200 mt-auto bg-white/50">
        <div className="container mx-auto max-w-6xl px-6 text-center">
          <p className="text-xs text-slate-400 font-medium italic">
            © {new Date().getFullYear()} TruBott · Minimal, private, secure.
          </p>
        </div>
      </footer>
    </div>
  );
}
