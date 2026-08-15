export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMeta;
};

export type PaginationQuery = {
  page: number;
  pageSize: number;
  search?: string;
};

export const DEFAULT_PAGE_SIZE = 10;

export function parsePaginationSearchParams(
  searchParams: URLSearchParams,
): PaginationQuery {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE),
  );
  const search = searchParams.get("search")?.trim();

  return {
    page,
    pageSize,
    search: search || undefined,
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
