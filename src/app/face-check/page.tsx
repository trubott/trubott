import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { issueNonce } from "@/server/face/nonce";
import { FaceCheckClient } from "@/components/face-check-client";
import { AuthSlot } from "@/components/auth-buttons";

export const dynamic = "force-dynamic";

export default async function FaceCheckPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const nonce = issueNonce(userId);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          trustcard
        </Link>
        <AuthSlot />
      </header>
      <main className="container mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Live face check</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Look at the camera, blink once, then turn your head a little to one side. The
          whole sequence takes about five seconds.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          <strong className="text-foreground">No image leaves your browser.</strong> We use
          MediaPipe locally to detect a live face. The server only stores a timestamp.
        </p>

        <FaceCheckClient
          nonce={nonce.nonce}
          exp={nonce.exp}
          sig={nonce.sig}
          method="mediapipe-blink-yaw-v1"
        />
      </main>
    </div>
  );
}
