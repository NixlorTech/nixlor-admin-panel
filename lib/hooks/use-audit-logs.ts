import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { PaginatedResponse } from "@/lib/pagination";

export type AuditLogRecord = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: { id: string; email: string; name: string | null } | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  requestId: string | null;
  createdAt: string;
};

export type AuditLogFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useAuditLogsQuery(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(
      Object.fromEntries(
        Object.entries(filters).map(([k, v]) => [k, v?.toString()]),
      ),
    ),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
      if (filters.search) params.set("search", filters.search);
      if (filters.action) params.set("action", filters.action);
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (filters.entityId) params.set("entityId", filters.entityId);
      if (filters.actorId) params.set("actorId", filters.actorId);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      return fetchJson<PaginatedResponse<AuditLogRecord>>(
        `/api/audit-logs?${params}`,
      );
    },
  });
}
