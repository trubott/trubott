import Link from "next/link";

import { CardPayloadView } from "@/components/card-payload-view";
import { resolveCardForView } from "@/server/cards/mint";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sig?: string; exp?: string }>;
};

export default async function CardViewPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const sig = sp.sig ?? "";
  const exp = Number(sp.exp ?? 0);

  if (!sig || !exp) return <CardError reason="bad_signature" />;

  const result = await resolveCardForView({ mode: "link", cardId: id, sig, exp });
  if (!result.ok) return <CardError reason={result.reason} />;

  const { payload, expiresAt, burned } = result;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-2xl px-6 py-12">
        <CardPayloadView payload={payload} expiresAt={expiresAt} burned={burned} />
      </main>
    </div>
  );
}

function CardError({
  reason,
}: {
  reason: "not_found" | "expired" | "bad_signature" | "burnt";
}) {
  const message = {
    not_found: "We can't find that card. The link may be wrong, or the card may have already been deleted.",
    expired: "That card has expired. Trust Cards are short-lived on purpose.",
    bad_signature: "That link doesn't validate. Ask the sender for a fresh one.",
    burnt:
      "That card was a burn-after-read. It has already been viewed and is now gone.",
  }[reason];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Card not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline"
        >
          Back to start
        </Link>
      </main>
    </div>
  );
}
