"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import type { AdminUserRecord } from "@/lib/domain-types";
import type { PaginationMeta } from "@/lib/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserFormModal } from "@/components/dashboard/user-form-modal";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";
import { TableContainer } from "@/components/dashboard/table-container";
import { useDeactivateUserMutation } from "@/lib/hooks/use-dashboard-mutations";

type UsersTableProps = {
  users: AdminUserRecord[];
  pagination: PaginationMeta;
  search: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  currentUserId?: string;
  canWrite?: boolean;
  canDelete?: boolean;
  isLoading?: boolean;
  isFetching?: boolean;
};

function UsersTableComponent({
  users,
  pagination,
  search,
  onSearchChange,
  onPageChange,
  currentUserId,
  canWrite = false,
  canDelete = false,
  isLoading = false,
  isFetching = false,
}: UsersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const deactivateMutation = useDeactivateUserMutation();

  const handleDeactivate = useCallback(
    (userId: string) => {
      deactivateMutation.mutate(userId);
    },
    [deactivateMutation],
  );

  const columns = useMemo<ColumnDef<AdminUserRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name ?? "—"}</p>
            <p className="text-xs text-zinc-500">{row.original.email}</p>
          </div>
        ),
      },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.role.name}</Badge>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "destructive"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString("en-IN"),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const isSelf = row.original.id === currentUserId;

          return (
            <div className="flex flex-wrap gap-2">
              {canWrite ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingUser(row.original)}
                >
                  Edit
                </Button>
              ) : null}
              {canDelete && row.original.isActive && !isSelf ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-600"
                  disabled={deactivateMutation.isPending}
                  onClick={() => handleDeactivate(row.original.id)}
                >
                  Deactivate
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [
      canDelete,
      canWrite,
      currentUserId,
      deactivateMutation.isPending,
      handleDeactivate,
    ],
  );

  // TanStack Table returns unstable function references by design.
  // eslint-disable-next-line react-hooks/incompatible-library -- expected for useReactTable
  const table = useReactTable({
    data: users,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  return (
    <>
      <div className="space-y-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <TableSkeleton rows={pagination.pageSize} columns={5} />
        ) : (
          <TableContainer>
            <Table className="min-w-[720px]">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none"
                            : undefined
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-zinc-500"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          isFetching={isFetching}
        />
      </div>

      {editingUser ? (
        <UserFormModal
          open
          user={editingUser}
          onOpenChange={(open) => {
            if (!open) {
              setEditingUser(null);
            }
          }}
        />
      ) : null}
    </>
  );
}

export const UsersTable = memo(UsersTableComponent);
