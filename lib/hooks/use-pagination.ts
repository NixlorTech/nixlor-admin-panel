"use client";

import { useCallback, useMemo, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

export function usePaginationState(initialPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearchState] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(1);
  }, []);

  const query = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch || undefined,
    }),
    [page, pageSize, debouncedSearch],
  );

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    query,
  };
}
