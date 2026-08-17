"use client";

import dynamic from "next/dynamic";
import { UsersTable } from "@/components/dashboard/users-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { useUsersQuery } from "@/lib/hooks/use-users";
import { usePaginationState } from "@/lib/hooks/use-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { useSession } from "next-auth/react";

const UserFormModal = dynamic(
  () =>
    import("@/components/dashboard/user-form-modal").then(
      (module) => module.UserFormModal,
    ),
  {
    loading: () => (
      <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 sm:w-28 dark:bg-zinc-800" />
    ),
    ssr: false,
  },
);

export function UsersPageContent() {
  const { data: session } = useSession();
  const { page, setPage, search, setSearch, query } = usePaginationState();
  const canRead = hasPermission(session?.user.permissions, PERMISSIONS.USERS_READ);
  const canWrite = hasPermission(session?.user.permissions, PERMISSIONS.USERS_WRITE);
  const canDelete = hasPermission(
    session?.user.permissions,
    PERMISSIONS.USERS_DELETE,
  );

  const { data, isLoading, isFetching } = useUsersQuery(query, canRead);

  const pagination = data?.pagination ?? {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  if (!canRead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Users" />
        <p className="text-sm text-muted sm:text-base">
          You do not have permission to view admin users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Users"
        description="Create and manage admin accounts, roles, and permissions"
        action={canWrite ? <UserFormModal /> : null}
      />

      <UsersTable
        users={data?.data ?? []}
        pagination={pagination}
        search={search}
        onSearchChange={setSearch}
        onPageChange={setPage}
        currentUserId={session?.user.id}
        canWrite={canWrite}
        canDelete={canDelete}
        isLoading={isLoading}
        isFetching={isFetching}
      />
    </div>
  );
}
