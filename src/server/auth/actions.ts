"use server";

import { signIn, signOut } from "@/server/auth";

export async function signInAction(callbackUrl?: string) {
  await signIn("google", { redirectTo: callbackUrl ?? "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
