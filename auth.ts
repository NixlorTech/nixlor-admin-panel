import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { isValidAdminEmail } from "@/lib/utils";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();

        if (!email || !password) {
          return null;
        }

        if (!isValidAdminEmail(email)) {
          return null;
        }

        const { prisma } = await import("@/lib/prisma");

        const admin = await prisma.adminUser.findUnique({
          where: { email },
        });

        if (!admin) {
          return null;
        }

        const isValid = await bcrypt.compare(password, admin.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: admin.id,
          email: admin.email,
        };
      },
    }),
  ],
});
