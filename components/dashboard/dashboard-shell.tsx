"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail: string;
};

export function DashboardShell({ children, userEmail }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Close the mobile drawer after navigation (including browser back/forward).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional route-driven UI reset
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-background">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-navy/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <DashboardSidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-white">
          <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Image
              src="/logo.png"
              alt="Nixlor"
              width={28}
              height={28}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy">{userEmail}</p>
              <p className="text-xs text-muted">Nixlor Admin Hub</p>
            </div>
          </div>

          <div className="hidden px-8 py-5 lg:block">
            <p className="text-sm text-muted">Signed in as</p>
            <p className="font-medium text-navy">{userEmail}</p>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
