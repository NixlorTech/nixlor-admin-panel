"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, Ban, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";

type StatsCardsProps = {
  activeClients: number;
  expiringSoon: number;
  revokedLicenses: number;
  totalRevenue: number;
  isLoading?: boolean;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const iconColors = [
  "text-cyan",
  "text-amber-500",
  "text-red-500",
  "text-teal",
] as const;

function StatsCardsComponent({
  activeClients,
  expiringSoon,
  revokedLicenses,
  totalRevenue,
  isLoading = false,
}: StatsCardsProps) {
  const currentYear = new Date().getFullYear();

  const stats = useMemo(
    () => [
      {
        title: "Total Active Clients",
        value: activeClients.toString(),
        icon: Users,
        description: "Clients with at least one active license",
      },
      {
        title: "Licenses Expiring in 30 Days",
        value: expiringSoon.toString(),
        icon: AlertTriangle,
        description: "Active licenses nearing expiration",
      },
      {
        title: "Total Revoked",
        value: revokedLicenses.toString(),
        icon: Ban,
        description: "Licenses manually revoked",
      },
      {
        title: "Total Revenue",
        value: formatCurrency(totalRevenue),
        icon: IndianRupee,
        description: `Sum of amountPaid from transactions in ${currentYear}`,
      },
    ],
    [activeClients, expiringSoon, revokedLicenses, totalRevenue, currentYear],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy">
                {stat.title}
              </CardTitle>
              <Icon className={cn("h-4 w-4", iconColors[index])} />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold text-navy sm:text-3xl",
                  isLoading && "animate-pulse text-muted",
                )}
              >
                {isLoading ? "—" : stat.value}
              </div>
              <p className="text-xs text-muted">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export const StatsCards = memo(StatsCardsComponent);
