"use client";

import { memo } from "react";
import { TableContainer } from "@/components/dashboard/table-container";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

function TableSkeletonComponent({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <TableContainer>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 px-4 py-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, colIndex) => (
              <div
                key={colIndex}
                className="h-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        ))}
      </div>
    </TableContainer>
  );
}

export const TableSkeleton = memo(TableSkeletonComponent);
