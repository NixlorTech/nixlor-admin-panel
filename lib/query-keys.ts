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
} as const;
