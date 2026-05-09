import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/lib/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: env().GOOGLE_CLIENT_ID,
      clientSecret: env().GOOGLE_CLIENT_SECRET,
      issuer: "https://accounts.google.com",
    }),
  ],
  session: { strategy: "jwt" },
  secret: env().NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.sub || !profile.email) return false;
      const existing = await db.query.users.findFirst({
        where: eq(users.googleSub, profile.sub),
      });
      if (existing) {
        await db
          .update(users)
          .set({
            email: profile.email,
            displayName: profile.name ?? existing.displayName ?? null,
            avatarUrl: (profile.picture as string | undefined) ?? existing.avatarUrl ?? null,
            lastSeenAt: new Date(),
          })
          .where(eq(users.id, existing.id));
      } else {
        await db.insert(users).values({
          googleSub: profile.sub,
          email: profile.email,
          displayName: profile.name ?? null,
          avatarUrl: (profile.picture as string | undefined) ?? null,
        });
      }
      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.sub) token.googleSub = profile.sub;
      return token;
    },
    async session({ session, token }) {
      if (token.googleSub && session.user) {
        const u = await db.query.users.findFirst({
          where: eq(users.googleSub, token.googleSub as string),
        });
        if (u) {
          (session.user as typeof session.user & { id: string }).id = u.id;
          await db
            .update(users)
            .set({ lastSeenAt: new Date() })
            .where(eq(users.id, u.id));
        }
      }
      return session;
    },
  },
});

