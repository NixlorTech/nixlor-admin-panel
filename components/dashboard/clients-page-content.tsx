"use client";

import { ClientsTable } from "@/components/dashboard/clients-table";
import { GenerateLicenseTrigger } from "@/components/dashboard/generate-license-trigger";
import { useClientsQuery } from "@/lib/hooks/use-clients";
import { usePaginationState } from "@/lib/hooks/use-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export function ClientsPageContent() {
  const { page, setPage, search, setSearch, query } = usePaginationState();
  const { data, isLoading, isFetching } = useClientsQuery(query);

  const pagination = data?.pagination ?? {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-zinc-500">
            Search, sort, and manage onboarded client licenses
          </p>
        </div>
        <GenerateLicenseTrigger />
      </div>

      <ClientsTable
        clients={data?.data ?? []}
        pagination={pagination}
        search={search}
        onSearchChange={setSearch}
        onPageChange={setPage}
        isLoading={isLoading}
        isFetching={isFetching}
      />
    </div>
  );
}
