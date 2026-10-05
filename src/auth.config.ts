import type { NextAuthConfig } from "next-auth";

/**
 * Config partagée (sans Prisma) : utilisée par le proxy pour protéger les routes
 * et par `auth.ts` qui y ajoute le provider Credentials.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/login" || pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron");
      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.workspaceId = (user as { workspaceId?: string }).workspaceId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { workspaceId?: string }).workspaceId = token.workspaceId as string;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
