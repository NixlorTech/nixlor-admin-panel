"use client";

import dynamic from "next/dynamic";
import { PartnersTable } from "@/components/dashboard/partners-table";
import { PageHeader } from "@/components/dashboard/page-header";
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
      <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 sm:w-32 dark:bg-zinc-800" />
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
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Alliance Partners"
        description="Manage partner profiles and track commission revenue"
        action={<PartnerFormModal />}
      />

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
