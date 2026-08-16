import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
      const isLogin = request.nextUrl.pathname === "/login";

      if (isDashboard) {
        return isLoggedIn;
      }

      if (isLogin && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
      }

      if (trigger === "update" && session?.user) {
        token.role = session.user.role;
        token.permissions = session.user.permissions;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = (token.permissions as string[]) ?? [];
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
