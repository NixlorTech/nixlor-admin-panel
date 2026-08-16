import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import type { AdminRoleRecord } from "@/lib/domain-types";
import { queryKeys } from "@/lib/query-keys";

export function useRolesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.roles.list,
    queryFn: () => fetchJson<AdminRoleRecord[]>("/api/roles"),
    enabled,
    staleTime: 5 * 60_000,
  });
}
