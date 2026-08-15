"use client";

import dynamic from "next/dynamic";
import { ModulesTable } from "@/components/dashboard/modules-table";
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
      <div className="h-10 w-32 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Software Modules</h1>
          <p className="text-zinc-500">
            Manage Nixlor product catalog and base pricing
          </p>
        </div>
        <AddModuleModal />
      </div>

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
