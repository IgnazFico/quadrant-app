import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { loginSchema } from "./validators";

/**
 * Auth.js is responsible for ONE thing: verifying a login and issuing a
 * session. It never sees, stores, or derives the client-side encryption
 * key — that happens entirely in lib/crypto.ts, in the browser.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.BETTER_AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        // Re-verify the user still exists in the database.
        // Prevents stale JWTs from deleted users from creating zombie sessions.
        const user = await prisma.user.findUnique({
          where: { id: token.userId as string },
        });
        if (user) {
          session.user.id = user.id;
          session.user.email = user.email;
        } else {
          // User no longer exists — wipe the id so guards reject the session.
          // (Not setting it is not enough: session.user.id already carries the
          // stale value from the original authorize() call.)
          // Cast to any to bypass strict typing — runtime behavior is correct.
          (session.user as any).id = undefined;
          (session.user as any).email = undefined;
        }
      }
      return session;
    },
  },
});
