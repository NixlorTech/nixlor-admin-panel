"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { GenerateLicenseTrigger } from "@/components/dashboard/generate-license-trigger";
import { useDashboardMetricsQuery } from "@/lib/hooks/use-dashboard-metrics";

export function DashboardOverview() {
  const { data, isLoading } = useDashboardMetricsQuery();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-zinc-500">
            Nixlor Super Admin license generation hub
          </p>
        </div>
        <GenerateLicenseTrigger />
      </div>

      <StatsCards
        activeClients={data?.activeClients ?? 0}
        expiringSoon={data?.expiringSoon ?? 0}
        revokedLicenses={data?.revokedLicenses ?? 0}
        totalRevenue={data?.totalRevenue ?? 0}
        isLoading={isLoading}
      />
    </div>
  );
}
