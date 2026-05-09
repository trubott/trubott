import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { AuthSlot } from "@/components/auth-buttons";
import { BioVerifyClient } from "@/components/bio-verify-client";

export const dynamic = "force-dynamic";

export default async function VerifyTwitterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          trustcard
        </Link>
        <AuthSlot />
      </header>
      <main className="container mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Verify X (Twitter)</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Interim verification: add your TRST code to your public bio. Configure <code className="text-xs">APIFY_TWITTER_ACTOR_ID</code>{" "}
          with an Apify Twitter profile scraper — we match the code in scraped text.
        </p>
        <BioVerifyClient platform="twitter" />
      </main>
    </div>
  );
}
