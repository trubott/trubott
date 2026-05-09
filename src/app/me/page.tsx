import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/db";
import {
  cards,
  connectedAccounts,
  faceChecks,
  passiveSessions,
} from "@/db/schema";
import { selectMe } from "@/server/users/select";
import { DeleteAccountForm } from "@/components/delete-account-form";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const [me, accounts, recentFace, sessions, liveCards] = await Promise.all([
    selectMe(userId),
    db.query.connectedAccounts.findMany({
      where: eq(connectedAccounts.userId, userId),
      orderBy: (t, { desc }) => [desc(t.scrapedAt)],
      columns: {
        id: true,
        platform: true,
        handle: true,
        accountCreatedAt: true,
        linkKarma: true,
        commentKarma: true,
        hasVerifiedEmail: true,
        ownershipVerifiedAt: true,
        scrapedAt: true,
      },
    }),
    db.query.faceChecks.findFirst({
      where: eq(faceChecks.userId, userId),
      orderBy: (t, { desc }) => [desc(t.passedAt)],
      columns: { passedAt: true, method: true },
    }),
    db.query.passiveSessions.findMany({
      where: eq(passiveSessions.userId, userId),
      columns: { id: true, fpHash: true, firstSeen: true, lastSeen: true, sessionCount: true },
    }),
    db.query.cards.findMany({
      where: eq(cards.userId, userId),
      orderBy: [desc(cards.createdAt)],
      limit: 10,
      columns: { id: true, viewedCount: true, expiresAt: true },
    }),
  ]);

  if (!me) redirect("/");

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your data</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A summary of what trustcard stores. The full per-field inventory lives in
            <Link href="/PRIVACY.md" className="ml-1 underline-offset-4 hover:underline">
              PRIVACY.md
            </Link>
            .
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>

      <Section title="Account">
        <Row k="Email" v={me.email} />
        <Row k="Display name" v={me.displayName ?? "—"} />
        <Row k="First seen" v={fmt(me.createdAt)} />
        <Row k="Last seen" v={fmt(me.lastSeenAt)} />
      </Section>

      <Section title={`Connected accounts (${accounts.length})`}>
        {accounts.length === 0 ? (
          <Empty>No connected accounts yet.</Empty>
        ) : (
          accounts.map((a) => (
            <div key={a.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {a.platform}
                  </span>
                  <div className="text-base font-semibold">u/{a.handle}</div>
                </div>
                {a.ownershipVerifiedAt ? (
                  <span className="rounded-full bg-success px-2.5 py-1 text-xs font-medium text-success-foreground">
                    verified {fmt(a.ownershipVerifiedAt)}
                  </span>
                ) : (
                  <span className="rounded-full bg-warning px-2.5 py-1 text-xs font-medium text-warning-foreground">
                    pending
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                <Stat label="Account age" value={ageOf(a.accountCreatedAt)} />
                <Stat label="Link karma" value={a.linkKarma ?? "—"} />
                <Stat label="Comment karma" value={a.commentKarma ?? "—"} />
                <Stat label="Verified email" value={a.hasVerifiedEmail ? "yes" : "—"} />
              </div>
            </div>
          ))
        )}
      </Section>

      <Section title="Face check">
        {recentFace ? (
          <Row
            k="Most recent passed_at"
            v={`${fmt(recentFace.passedAt)} via ${recentFace.method}`}
          />
        ) : (
          <Empty>You haven&rsquo;t completed a face check yet.</Empty>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Only the timestamp + method version is stored. No images, embeddings, or templates.
        </p>
      </Section>

      <Section title="Passive sessions">
        {sessions.length === 0 ? (
          <Empty>No device sessions recorded yet.</Empty>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{s.fpHash.slice(0, 12)}…</span>
              <span>{s.sessionCount} sessions</span>
              <span className="text-muted-foreground">first {fmt(s.firstSeen)}</span>
              <span className="text-muted-foreground">last {fmt(s.lastSeen)}</span>
            </div>
          ))
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Stored as a peppered SHA-256 hash. The raw fingerprint never leaves your browser.
        </p>
      </Section>

      <Section title={`Recent cards (${liveCards.length})`}>
        {liveCards.length === 0 ? (
          <Empty>You haven&rsquo;t minted any cards yet.</Empty>
        ) : (
          liveCards.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
              <span className="font-mono text-xs">{c.id}</span>
              <span>{c.viewedCount} view{c.viewedCount === 1 ? "" : "s"}</span>
              <span className="text-muted-foreground">expires {fmt(c.expiresAt)}</span>
            </div>
          ))
        )}
      </Section>

      <section className="mt-12 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold text-destructive">Delete everything</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This permanently removes your <code>users</code> row and cascades to every other
          table — connected accounts, face checks, passive sessions, cards, and OTPs.
          You will be signed out. There is no undo.
        </p>
        <div className="mt-4">
          <DeleteAccountForm />
        </div>
      </section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between rounded-md border bg-card px-4 py-3 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{children}</div>;
}

function fmt(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

function ageOf(d: Date | null | undefined) {
  if (!d) return "—";
  const yrs = (Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000);
  return `${yrs.toFixed(1)} y`;
}
