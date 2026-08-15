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
import Link from "next/link";
import type { ClientRecord } from "@/lib/domain-types";
import type { PaginationMeta } from "@/lib/pagination";
import { MoreHorizontal, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getActiveModules,
  getClientLicenseStatus,
  type ClientLicenseStatus,
} from "@/lib/license-status";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";
import { useRevokeLicenseMutation } from "@/lib/hooks/use-dashboard-mutations";

type ClientsTableProps = {
  clients: ClientRecord[];
  pagination: PaginationMeta;
  search: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  isFetching?: boolean;
};

function StatusBadge({ status }: { status: ClientLicenseStatus }) {
  if (status === "active") {
    return <Badge variant="success">Active</Badge>;
  }
  if (status === "expiring") {
    return <Badge variant="warning">Expiring Soon</Badge>;
  }
  return <Badge variant="destructive">Revoked</Badge>;
}

function ClientsTableComponent({
  clients,
  pagination,
  search,
  onSearchChange,
  onPageChange,
  isLoading = false,
  isFetching = false,
}: ClientsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const revokeMutation = useRevokeLicenseMutation();

  const revokeLicense = useCallback(
    (licenseId: string) => {
      revokeMutation.mutate(licenseId);
    },
    [revokeMutation],
  );

  const columns = useMemo<ColumnDef<ClientRecord>[]>(
    () => [
      {
        accessorKey: "businessName",
        header: "Business Name",
        cell: ({ row }) => (
          <div>
            <Link
              href={`/dashboard/clients/${row.original.id}`}
              className="font-medium hover:underline"
            >
              {row.original.businessName}
            </Link>
            <p className="text-xs text-zinc-500">{row.original.contactEmail}</p>
          </div>
        ),
      },
      {
        id: "modules",
        header: "Active Modules",
        cell: ({ row }) => {
          const modules = getActiveModules(row.original.licenses);
          return modules.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {modules.map((module) => (
                <Badge key={module} variant="secondary">
                  {module}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-zinc-400">None</span>
          );
        },
      },
      {
        id: "region",
        header: "Region",
        cell: ({ row }) => row.original.region ?? "—",
      },
      {
        id: "partner",
        header: "Alliance Partner",
        cell: ({ row }) => row.original.alliancePartnerName ?? "—",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={getClientLicenseStatus(row.original.licenses)} />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const activeLicenses = row.original.licenses.filter(
            (license) => license.status === "ACTIVE",
          );

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={revokeMutation.isPending}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>License Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {activeLicenses.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No active licenses
                  </DropdownMenuItem>
                ) : (
                  activeLicenses.map((license) => (
                    <DropdownMenuItem
                      key={license.id}
                      onClick={() => revokeLicense(license.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      Revoke {license.moduleName}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [revokeLicense, revokeMutation.isPending],
  );

  // TanStack Table returns unstable function references by design.
  // eslint-disable-next-line react-hooks/incompatible-library -- expected for useReactTable
  const table = useReactTable({
    data: clients,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={pagination.pageSize} columns={6} />
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Table>
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
                    No clients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <TablePagination
        pagination={pagination}
        onPageChange={onPageChange}
        isFetching={isFetching}
      />
    </div>
  );
}

export const ClientsTable = memo(ClientsTableComponent);
