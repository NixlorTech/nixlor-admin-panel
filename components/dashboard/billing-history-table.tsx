"use client";

import type { LicenseTransactionRecord } from "@/lib/domain-types";
import { Badge } from "@/components/ui/badge";
import { TableContainer } from "@/components/dashboard/table-container";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTransactionType(type: LicenseTransactionRecord["transactionType"]) {
  switch (type) {
    case "NEW_ISSUANCE":
      return "New Issuance";
    case "RENEWAL":
      return "Renewal";
    case "UPGRADE":
      return "Upgrade";
    default:
      return type;
  }
}

function transactionBadgeVariant(
  type: LicenseTransactionRecord["transactionType"],
) {
  switch (type) {
    case "NEW_ISSUANCE":
      return "success" as const;
    case "RENEWAL":
      return "secondary" as const;
    case "UPGRADE":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

export function BillingHistoryTable({
  transactions,
}: {
  transactions: LicenseTransactionRecord[];
}) {
  return (
    <TableContainer>
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Module</TableHead>
            <TableHead>Partner</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount Paid</TableHead>
            <TableHead>Catalog Price</TableHead>
            <TableHead>Valid Until</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {new Date(transaction.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="font-medium">
                  {transaction.moduleName}
                </TableCell>
                <TableCell>
                  {transaction.alliancePartnerName ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={transactionBadgeVariant(transaction.transactionType)}>
                    {formatTransactionType(transaction.transactionType)}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(transaction.amountPaid)}</TableCell>
                <TableCell className="text-muted">
                  {formatCurrency(transaction.basePriceAtTime)}
                </TableCell>
                <TableCell>
                  {new Date(transaction.validUntil).toLocaleDateString("en-IN")}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted">
                No billing or renewal history yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
