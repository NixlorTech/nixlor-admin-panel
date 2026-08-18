import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

type DashboardMetrics = {
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
};

export function useDashboardMetricsQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics,
    queryFn: () => fetchJson<DashboardMetrics>("/api/dashboard/metrics"),
    staleTime: 30_000,
  });
}
