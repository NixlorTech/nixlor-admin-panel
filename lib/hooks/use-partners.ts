import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import type { AlliancePartnerRecord } from "@/lib/domain-types";
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

export function usePartnersQuery(params: PaginationQuery) {
  return useQuery({
    queryKey: queryKeys.partners.list(params),
    queryFn: () =>
      fetchJson<PaginatedResponse<AlliancePartnerRecord>>(
        `/api/partners?${buildQueryString(params)}`,
      ),
    placeholderData: (previousData) => previousData,
  });
}

export function useActivePartnersQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.partners.active,
    queryFn: async () => {
      const response = await fetchJson<PaginatedResponse<AlliancePartnerRecord>>(
        "/api/partners?page=1&pageSize=100",
      );
      return response.data.filter((partner) => partner.status === "ACTIVE");
    },
    enabled,
    staleTime: 2 * 60_000,
  });
}
