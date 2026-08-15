"use client";

import dynamic from "next/dynamic";
import { PartnersTable } from "@/components/dashboard/partners-table";
import { usePartnersQuery } from "@/lib/hooks/use-partners";
import { usePaginationState } from "@/lib/hooks/use-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

const PartnerFormModal = dynamic(
  () =>
    import("@/components/dashboard/partner-form-modal").then(
      (module) => module.PartnerFormModal,
    ),
  {
    loading: () => (
      <div className="h-10 w-32 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
    ),
    ssr: false,
  },
);

export function PartnersPageContent() {
  const { page, setPage, search, setSearch, query } = usePaginationState();
  const { data, isLoading, isFetching } = usePartnersQuery(query);

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
          <h1 className="text-3xl font-bold tracking-tight">
            Alliance Partners
          </h1>
          <p className="text-zinc-500">
            Manage partner profiles and track commission revenue
          </p>
        </div>
        <PartnerFormModal />
      </div>

      <PartnersTable
        partners={data?.data ?? []}
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
