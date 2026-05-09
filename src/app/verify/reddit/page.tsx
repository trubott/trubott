import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { redditConfigured } from "@/lib/env";
import { botUsername } from "@/server/reddit/auth";
import { getVerificationStatus, startVerification } from "@/server/reddit/verify";
import { VerifyRedditClient } from "@/components/verify-reddit-client";
import { AuthSlot } from "@/components/auth-buttons";

export const dynamic = "force-dynamic";

export default async function VerifyRedditPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const configured = redditConfigured();
  if (!configured) {
    return (
      <Shell>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="text-lg font-semibold text-destructive">
            Reddit bot not configured
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This trustcard deployment doesn&rsquo;t have Reddit bot credentials set up. Ask
            the administrator to set <code>REDDIT_CLIENT_ID</code>,{" "}
            <code>REDDIT_CLIENT_SECRET</code>, <code>REDDIT_USERNAME</code>, and{" "}
            <code>REDDIT_PASSWORD</code> in the server environment.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      </Shell>
    );
  }

  // Pre-warm: issue (or reuse) a code now so the UI shows it on first paint.
  const { code, expiresAt } = await startVerification(userId);
  const initial = await getVerificationStatus(userId);

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight">Verify your Reddit handle</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Send the one-time code below as a DM to{" "}
        <span className="font-mono">u/{botUsername()}</span>. Once we see it land in the
        bot&rsquo;s inbox, your handle is recorded as ownership-verified and we pull your
        public Reddit history.
      </p>

      <VerifyRedditClient
        bot={botUsername()}
        initialCode={code}
        initialExpiresAt={expiresAt.toISOString()}
        initialState={JSON.parse(JSON.stringify(initial))}
      />

      <Steps />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          trustcard
        </Link>
        <AuthSlot />
      </header>
      <main className="container mx-auto max-w-2xl px-6 py-12">{children}</main>
    </div>
  );
}

function Steps() {
  return (
    <ol className="mt-10 space-y-3 rounded-lg border bg-muted/30 p-6 text-sm">
      <li>
        <span className="mr-2 font-mono text-xs text-muted-foreground">1.</span>
        Open <span className="font-mono">reddit.com/message/compose?to=u/{botUsername()}</span>{" "}
        (or use the &ldquo;Open in Reddit&rdquo; button below).
      </li>
      <li>
        <span className="mr-2 font-mono text-xs text-muted-foreground">2.</span>
        Paste the code as the message body. Subject is ignored.
      </li>
      <li>
        <span className="mr-2 font-mono text-xs text-muted-foreground">3.</span>
        Click &ldquo;I&rsquo;ve sent it&rdquo;. The page will flip to{" "}
        <span className="font-medium">verified</span> within ~10 seconds.
      </li>
    </ol>
  );
}
