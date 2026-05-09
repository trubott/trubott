import { auth } from "@/server/auth";
import { UserMenu } from "./user-menu";
import { signInAction, signOutAction } from "@/server/auth/actions";

export async function SignInButton({
  className,
  callbackUrl,
  children,
}: {
  className?: string;
  callbackUrl?: string;
  children?: React.ReactNode;
}) {
  const login = signInAction.bind(null, callbackUrl);

  return (
    <form action={login}>
      <button
        type="submit"
        className={
          className ??
          "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-semibold text-white whitespace-nowrap shadow transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        }
      >
        {!children && <GoogleGlyph />}
        {children ?? "Sign in with Google"}
      </button>
    </form>
  );
}

export async function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={
          className ??
          "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition hover:bg-accent hover:text-accent-foreground"
        }
      >
        Sign out
      </button>
    </form>
  );
}

export async function AuthSlot() {
  const session = await auth();
  if (!session?.user) {
    return <SignInButton />;
  }

  return <UserMenu user={session.user} signOutAction={signOutAction} />;
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2045c0-.638-.0573-1.252-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.806.54-1.8368.8604-3.0477.8604-2.344 0-4.3286-1.5832-5.0364-3.7104H.9573v2.3318C2.4382 15.9831 5.4818 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.9636 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.997 8.997 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.9636 10.71z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9636 7.29C4.6714 5.1627 6.6559 3.5795 9 3.5795z"
        fill="#EA4335"
      />
    </svg>
  );
}
