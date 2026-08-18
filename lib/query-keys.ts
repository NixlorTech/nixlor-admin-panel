import type { PaginationQuery } from "@/lib/pagination";

export const queryKeys = {
  dashboard: {
    metrics: ["dashboard", "metrics"] as const,
  },
  clients: {
    all: ["clients"] as const,
    list: (params: PaginationQuery) =>
      ["clients", "list", params] as const,
    options: ["clients", "options"] as const,
    detail: (id: string) => ["clients", "detail", id] as const,
  },
  partners: {
    all: ["partners"] as const,
    list: (params: PaginationQuery) =>
      ["partners", "list", params] as const,
    active: ["partners", "active"] as const,
  },
  modules: {
    all: ["modules"] as const,
    list: (params: PaginationQuery) =>
      ["modules", "list", params] as const,
    active: ["modules", "active"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params: PaginationQuery) => ["users", "list", params] as const,
  },
  roles: {
    all: ["roles"] as const,
    list: ["roles", "list"] as const,
  },
  installations: {
    all: ["installations"] as const,
    list: (clientId?: string) => ["installations", "list", clientId ?? "all"] as const,
    detail: (id: string) => ["installations", "detail", id] as const,
  },
  licenses: {
    detail: (id: string) => ["licenses", "detail", id] as const,
  },
  auditLogs: {
    all: ["audit-logs"] as const,
    list: (params: Record<string, string | undefined>) =>
      ["audit-logs", "list", params] as const,
  },
} as const;
