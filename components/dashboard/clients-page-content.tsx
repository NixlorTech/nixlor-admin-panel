"use client";

import dynamic from "next/dynamic";
import { ClientsTable } from "@/components/dashboard/clients-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { useClientsQuery } from "@/lib/hooks/use-clients";
import { usePaginationState } from "@/lib/hooks/use-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

const GenerateLicenseTrigger = dynamic(
  () =>
    import("@/components/dashboard/generate-license-trigger").then(
      (module) => module.GenerateLicenseTrigger,
    ),
  {
    loading: () => (
      <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 sm:w-36 dark:bg-zinc-800" />
    ),
    ssr: false,
  },
);

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
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Clients"
        description="Search, sort, and manage onboarded client licenses"
        action={<GenerateLicenseTrigger />}
      />

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
