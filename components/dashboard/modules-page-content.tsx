"use client";

import dynamic from "next/dynamic";
import { ModulesTable } from "@/components/dashboard/modules-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { useModulesQuery } from "@/lib/hooks/use-modules";
import { usePaginationState } from "@/lib/hooks/use-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

const AddModuleModal = dynamic(
  () =>
    import("@/components/dashboard/add-module-modal").then(
      (module) => module.AddModuleModal,
    ),
  {
    loading: () => (
      <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 sm:w-32 dark:bg-zinc-800" />
    ),
    ssr: false,
  },
);

export function ModulesPageContent() {
  const { page, setPage, search, setSearch, query } = usePaginationState();
  const { data, isLoading, isFetching } = useModulesQuery(query);

  const pagination = data?.pagination ?? {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Software Modules"
        description="Manage Nixlor product catalog and base pricing"
        action={<AddModuleModal />}
      />

      <ModulesTable
        modules={data?.data ?? []}
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
