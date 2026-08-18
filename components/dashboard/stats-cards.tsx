"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  AlertTriangle,
  Server,
  IndianRupee,
  Handshake,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatsCardsProps = {
  activeClients: number;
  activeInstallations: number;
  activeLicenses: number;
  expiringSoon: number;
  expiredLicenses: number;
  revokedLicenses: number;
  totalRevenue: number;
  partnerCommissions: number;
  activePartners: number;
  onlineInstallations: number;
  offlineInstallations: number;
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
  activeInstallations,
  activeLicenses,
  expiringSoon,
  expiredLicenses,
  revokedLicenses,
  totalRevenue,
  partnerCommissions,
  onlineInstallations,
  offlineInstallations,
  isLoading = false,
}: StatsCardsProps) {
  const currentYear = new Date().getFullYear();

  const stats = useMemo(
    () => [
      {
        title: "Active Clients",
        value: activeClients.toString(),
        icon: Users,
        color: "text-cyan",
        description: "Clients with active licenses",
      },
      {
        title: "Active Installations",
        value: activeInstallations.toString(),
        icon: Server,
        color: "text-teal",
        description: "On-prem deployments tracked",
      },
      {
        title: "Active Licenses",
        value: activeLicenses.toString(),
        icon: Users,
        color: "text-cyan",
        description: "Currently valid entitlements",
      },
      {
        title: "Expiring in 30 Days",
        value: expiringSoon.toString(),
        icon: AlertTriangle,
        color: "text-amber-500",
        description: "Renewal opportunities",
      },
      {
        title: "Expired / Revoked",
        value: `${expiredLicenses} / ${revokedLicenses}`,
        icon: AlertTriangle,
        color: "text-red-500",
        description: "Requires support attention",
      },
      {
        title: "Revenue (YTD)",
        value: formatCurrency(totalRevenue),
        icon: IndianRupee,
        color: "text-teal",
        description: `Transactions in ${currentYear}`,
      },
      {
        title: "Partner Commissions",
        value: formatCurrency(partnerCommissions),
        icon: Handshake,
        color: "text-teal",
        description: `Commissions in ${currentYear}`,
      },
      {
        title: "Installation Health",
        value: `${onlineInstallations} / ${offlineInstallations}`,
        icon: onlineInstallations >= offlineInstallations ? Wifi : WifiOff,
        color: "text-cyan",
        description: "Online / offline (48h window)",
      },
    ],
    [
      activeClients,
      activeInstallations,
      activeLicenses,
      expiringSoon,
      expiredLicenses,
      revokedLicenses,
      totalRevenue,
      partnerCommissions,
      onlineInstallations,
      offlineInstallations,
      currentYear,
    ],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy">
                {stat.title}
              </CardTitle>
              <Icon className={cn("h-4 w-4", stat.color)} />
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
