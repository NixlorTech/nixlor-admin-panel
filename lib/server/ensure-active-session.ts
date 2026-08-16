import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function ensureActiveDashboardSession() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.adminUser.findUnique({
    where: { email: session.user.email },
    select: { isActive: true },
  });

  if (!user?.isActive) {
    redirect("/login?deactivated=1");
  }

  return session;
}
