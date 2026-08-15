import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <header className="border-b border-zinc-200 bg-white px-8 py-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">Signed in as</p>
          <p className="font-medium">{session.user.email}</p>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
