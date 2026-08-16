import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ensureActiveDashboardSession } from "@/lib/server/ensure-active-session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await ensureActiveDashboardSession();

  return (
    <DashboardShell userEmail={session.user.email ?? ""}>
      {children}
    </DashboardShell>
  );
}
