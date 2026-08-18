"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { TableContainer } from "@/components/dashboard/table-container";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLogsQuery } from "@/lib/hooks/use-audit-logs";
import { usePaginationState } from "@/lib/hooks/use-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export function AuditLogsPageContent() {
  const { page, setPage, search, setSearch, query } = usePaginationState();
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading } = useAuditLogsQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    action: action || undefined,
    entityType: entityType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const pagination = data?.pagination ?? {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Audit Logs"
        description="Investigate admin actions, license changes, and support incidents"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="audit-search">Search</Label>
          <Input
            id="audit-search"
            placeholder="Entity ID or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-action">Action</Label>
          <Input
            id="audit-action"
            placeholder="e.g. GENERATE_LICENSE"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-entity">Entity Type</Label>
          <Input
            id="audit-entity"
            placeholder="e.g. License"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-from">Date From</Label>
          <Input
            id="audit-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-to">Date To</Label>
          <Input
            id="audit-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      <TableContainer>
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted">
                  Loading audit logs…
                </TableCell>
              </TableRow>
            ) : (data?.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              (data?.data ?? []).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.createdAt).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>{log.actor?.email ?? "system"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{log.action}</Badge>
                  </TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.entityType === "License" ? (
                      <Link
                        href={`/dashboard/licenses/${log.entityId}`}
                        className="text-teal hover:underline"
                      >
                        {log.entityId.slice(0, 12)}…
                      </Link>
                    ) : (
                      log.entityId
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border px-3 py-1 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1 disabled:opacity-50"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
