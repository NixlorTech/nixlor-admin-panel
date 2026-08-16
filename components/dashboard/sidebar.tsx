"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Package,
  Handshake,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
    <aside className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:h-screen lg:sticky lg:top-0">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-4 sm:px-6 sm:py-5 dark:border-zinc-800">
        <KeyRound className="h-6 w-6 shrink-0 text-zinc-900 dark:text-zinc-50" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Nixlor Admin Hub</p>
          <p className="truncate text-xs text-zinc-500">License Generation CRM</p>
        </div>
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
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-zinc-200 p-3 sm:p-4 dark:border-zinc-800">
        <SignOutButton />
      </div>
    </aside>
  );
}
