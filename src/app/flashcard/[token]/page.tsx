import { FlashRevealClient } from "@/components/flash-reveal-client";
import { FlashRevealShell } from "@/components/card-payload-view";
import { isValidFlashRevealKey } from "@/server/cards/mint";

export const dynamic = "force-dynamic";

const BAD_TOKEN_MSG = "Sorry — either already used or not exist.";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function FlashCardPage({ params }: Props) {
  const { token } = await params;

  if (!isValidFlashRevealKey(token)) {
    return (
      <FlashRevealShell>
        <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Flash card</h1>
          <p className="mt-3 text-sm text-muted-foreground">{BAD_TOKEN_MSG}</p>
        </div>
      </FlashRevealShell>
    );
  }

  return <FlashRevealClient token={token} />;
}
