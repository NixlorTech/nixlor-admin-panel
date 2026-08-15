import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import type { ClientRecord } from "@/lib/domain-types";
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

export function useClientsQuery(params: PaginationQuery) {
  return useQuery({
    queryKey: queryKeys.clients.list(params),
    queryFn: () =>
      fetchJson<PaginatedResponse<ClientRecord>>(
        `/api/clients?${buildQueryString(params)}`,
      ),
    placeholderData: (previousData) => previousData,
  });
}

export function useClientOptionsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.clients.options,
    queryFn: () =>
      fetchJson<Array<{ id: string; businessName: string }>>(
        "/api/clients/options",
      ),
    enabled,
    staleTime: 2 * 60_000,
  });
}
