"use client";

import { memo, useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import type { AlliancePartnerRecord } from "@/lib/domain-types";
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
import { PartnerFormModal } from "@/components/dashboard/partner-form-modal";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";
import { TableContainer } from "@/components/dashboard/table-container";

type PartnersTableProps = {
  partners: AlliancePartnerRecord[];
  pagination: PaginationMeta;
  search: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  isFetching?: boolean;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function PartnersTableComponent({
  partners,
  pagination,
  search,
  onSearchChange,
  onPageChange,
  isLoading = false,
  isFetching = false,
}: PartnersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingPartner, setEditingPartner] =
    useState<AlliancePartnerRecord | null>(null);

  const columns = useMemo<ColumnDef<AlliancePartnerRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Partner Name",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-zinc-500">{row.original.contactEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: "region",
        header: "Region",
      },
      {
        id: "contact",
        header: "Phone",
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "ACTIVE" ? "success" : "secondary"
            }
          >
            {row.original.status === "ACTIVE" ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        accessorKey: "totalRevenue",
        header: "Total Revenue Generated",
        cell: ({ row }) => formatCurrency(row.original.totalRevenue),
      },
      {
        accessorKey: "pendingCommissions",
        header: "Pending Commissions",
        cell: ({ row }) => formatCurrency(row.original.pendingCommissions),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingPartner(row.original)}
          >
            Edit
          </Button>
        ),
      },
    ],
    [],
  );

  // TanStack Table returns unstable function references by design.
  // eslint-disable-next-line react-hooks/incompatible-library -- expected for useReactTable
  const table = useReactTable({
    data: partners,
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
            placeholder="Search partners..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <TableSkeleton rows={pagination.pageSize} columns={6} />
        ) : (
          <TableContainer>
            <Table className="min-w-[900px]">
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
                      No alliance partners found.
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

      {editingPartner ? (
        <PartnerFormModal
          open
          partner={editingPartner}
          onOpenChange={(open) => {
            if (!open) {
              setEditingPartner(null);
            }
          }}
        />
      ) : null}
    </>
  );
}

export const PartnersTable = memo(PartnersTableComponent);
