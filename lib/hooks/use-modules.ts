import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import type { SoftwareModuleRecord } from "@/lib/domain-types";
import type { PaginatedResponse, PaginationQuery } from "@/lib/pagination";
import { queryKeys } from "@/lib/query-keys";

function buildQueryString(params: PaginationQuery) {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });

  if (params.search) {
    searchParams.set("search", params.search);
  }

  return searchParams.toString();
}

export function useModulesQuery(params: PaginationQuery) {
  return useQuery({
    queryKey: queryKeys.modules.list(params),
    queryFn: () =>
      fetchJson<PaginatedResponse<SoftwareModuleRecord>>(
        `/api/modules?${buildQueryString(params)}`,
      ),
    placeholderData: (previousData) => previousData,
  });
}

export function useActiveModulesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.modules.active,
    queryFn: async () => {
      const modules = await fetchJson<PaginatedResponse<SoftwareModuleRecord>>(
        "/api/modules?page=1&pageSize=100",
      );
      return modules.data;
    },
    enabled,
    staleTime: 2 * 60_000,
  });
}
