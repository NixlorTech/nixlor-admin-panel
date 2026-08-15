"use client";

import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@/lib/pagination";
import { Button } from "@/components/ui/button";

type TablePaginationProps = {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
};

function TablePaginationComponent({
  pagination,
  onPageChange,
  isFetching = false,
}: TablePaginationProps) {
  const { page, totalPages, total, pageSize } = pagination;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2">
      <p className="text-sm text-zinc-500">
        Showing {start}–{end} of {total}
        {isFetching ? " · Updating..." : ""}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isFetching}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-zinc-600">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isFetching}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export const TablePagination = memo(TablePaginationComponent);
