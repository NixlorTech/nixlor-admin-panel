"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Package,
  Handshake,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NixlorLogo } from "@/components/brand/nixlor-logo";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/partners", label: "Partners", icon: Handshake },
  { href: "/dashboard/modules", label: "Modules", icon: Package },
  {
    href: "/dashboard/users",
    label: "Users",
    icon: UserCog,
    permission: PERMISSIONS.USERS_READ,
  },
];

type DashboardSidebarProps = {
  onNavigate?: () => void;
};

export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const currentPath = usePathname();
  const { data: session } = useSession();

  const visibleNavItems = navItems.filter((item) => {
    if (!item.permission) {
      return true;
    }

    return hasPermission(session?.user.permissions, item.permission);
  });

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground lg:h-screen lg:sticky lg:top-0">
      <div className="border-b border-sidebar-border px-4 py-4 sm:px-6 sm:py-5">
        <NixlorLogo variant="on-dark" size="md" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 sm:p-4">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPath === item.href ||
            (item.href !== "/dashboard" && currentPath.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-muted hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-sidebar-border p-3 sm:p-4">
        <SignOutButton className="w-full justify-start border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" />
      </div>
    </aside>
  );
}
