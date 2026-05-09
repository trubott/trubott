import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { AuthSlot } from "@/components/auth-buttons";

export const dynamic = "force-dynamic";

export default async function VerifySocialRedirectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Social verification</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Verify each platform one at a time from the dashboard.
        </p>
        <ul className="mt-6 list-inside list-disc space-y-2 text-sm">
          <li>
            <Link href="/verify/reddit" className="underline-offset-4 hover:underline">
              Reddit (DM code)
            </Link>
          </li>
          <li>
            <Link href="/verify/linkedin" className="underline-offset-4 hover:underline">
              LinkedIn (public bio / headline code)
            </Link>
          </li>
          <li>
            <Link href="/verify/instagram" className="underline-offset-4 hover:underline">
              Instagram (public bio code)
            </Link>
          </li>
          <li>
            <Link href="/verify/twitter" className="underline-offset-4 hover:underline">
              X / Twitter (public bio code)
            </Link>
          </li>
        </ul>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow"
        >
          Back to dashboard
        </Link>
      </main>
    </div>
  );
}
