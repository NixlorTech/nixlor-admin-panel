"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, KeyRound, Package, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/partners", label: "Partners", icon: Handshake },
  { href: "/dashboard/modules", label: "Modules", icon: Package },
];

export function DashboardSidebar() {
  const currentPath = usePathname();
  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
        <KeyRound className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
        <div>
          <p className="text-sm font-semibold">Nixlor Admin Hub</p>
          <p className="text-xs text-zinc-500">License Generation CRM</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPath === item.href ||
            (item.href !== "/dashboard" && currentPath.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <SignOutButton />
      </div>
    </aside>
  );
}
