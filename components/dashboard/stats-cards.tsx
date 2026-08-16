"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, Ban, IndianRupee } from "lucide-react";

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
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold sm:text-3xl ${isLoading ? "animate-pulse text-zinc-300" : ""}`}
              >
                {isLoading ? "—" : stat.value}
              </div>
              <p className="text-xs text-zinc-500">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export const StatsCards = memo(StatsCardsComponent);
