import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type InstallationRecord = {
  id: string;
  clientId: string;
  clientName?: string;
  installationIdentifier: string;
  status: string;
  environment: string | null;
  hostname: string | null;
  softwareVersion: string | null;
  lastHeartbeatAt: string | null;
  health: string;
  client?: { businessName: string };
  licenses: Array<{
    id: string;
    moduleCode: string | null;
    moduleName: string;
    status: string;
  }>;
};

export function useInstallationsQuery(
  clientId?: string,
  filters?: Record<string, string | undefined>,
) {
  return useQuery({
    queryKey: [...queryKeys.installations.list(clientId), filters ?? {}],
    queryFn: () => {
      const params = new URLSearchParams({ page: "1", pageSize: "50" });
      if (clientId) params.set("clientId", clientId);
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value) params.set(key, value);
        }
      }
      return fetchJson<{ data: InstallationRecord[] } | InstallationRecord[]>(
        `/api/installations?${params}`,
      ).then((result) => (Array.isArray(result) ? result : result.data));
    },
  });
}

export function useInstallationDetailQuery(installationId: string) {
  return useQuery({
    queryKey: queryKeys.installations.detail(installationId),
    queryFn: () =>
      fetchJson<Record<string, unknown>>(`/api/installations/${installationId}`),
    enabled: Boolean(installationId),
  });
}

export function useLicenseDetailQuery(licenseId: string) {
  return useQuery({
    queryKey: queryKeys.licenses.detail(licenseId),
    queryFn: () =>
      fetchJson<Record<string, unknown>>(`/api/licenses/${licenseId}`),
    enabled: Boolean(licenseId),
  });
}
