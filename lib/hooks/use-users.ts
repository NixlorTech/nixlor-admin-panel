import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import type { AdminUserRecord } from "@/lib/domain-types";
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

export function useUsersQuery(params: PaginationQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () =>
      fetchJson<PaginatedResponse<AdminUserRecord>>(
        `/api/users?${buildQueryString(params)}`,
      ),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}
