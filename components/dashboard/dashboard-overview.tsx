"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { GenerateLicenseTrigger } from "@/components/dashboard/generate-license-trigger";
import { PageHeader } from "@/components/dashboard/page-header";
import { useDashboardMetricsQuery } from "@/lib/hooks/use-dashboard-metrics";

export function DashboardOverview() {
  const { data, isLoading } = useDashboardMetricsQuery();

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Overview"
        description="Nixlor Super Admin license generation hub"
        action={<GenerateLicenseTrigger />}
      />

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
