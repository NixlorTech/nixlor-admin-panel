"use client";

import { memo, useCallback } from "react";
import type { LicenseRecord } from "@/lib/domain-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableContainer } from "@/components/dashboard/table-container";
import { useResetHardwareMutation } from "@/lib/hooks/use-dashboard-mutations";

type ClientLicensesTableProps = {
  licenses: LicenseRecord[];
};

function truncateHardwareId(hardwareId: string) {
  if (hardwareId.length <= 16) {
    return hardwareId;
  }

  return `${hardwareId.slice(0, 8)}…${hardwareId.slice(-6)}`;
}

function ClientLicensesTableComponent({ licenses }: ClientLicensesTableProps) {
  const resetHardwareMutation = useResetHardwareMutation();

  const activeLicenses = licenses.filter(
    (license) =>
      license.status === "ACTIVE" && new Date(license.expiresAt) > new Date(),
  );

  const handleReset = useCallback(
    (licenseId: string) => {
      resetHardwareMutation.mutate(licenseId);
    },
    [resetHardwareMutation],
  );

  if (activeLicenses.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No active licenses for this client.</p>
    );
  }

  return (
    <TableContainer>
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead>Module</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Hardware Lock</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeLicenses.map((license) => (
            <TableRow key={license.id}>
              <TableCell className="font-medium">{license.moduleName}</TableCell>
              <TableCell>
                <Badge variant="success">Active</Badge>
              </TableCell>
              <TableCell>
                {new Date(license.expiresAt).toLocaleDateString("en-IN")}
              </TableCell>
              <TableCell>
                {license.hardwareId ? (
                  <code className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-900">
                    {truncateHardwareId(license.hardwareId)}
                  </code>
                ) : (
                  <span className="text-zinc-400">Unlocked</span>
                )}
              </TableCell>
              <TableCell>
                {license.hardwareId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resetHardwareMutation.isPending}
                    onClick={() => handleReset(license.id)}
                  >
                    Reset Hardware
                  </Button>
                ) : (
                  <span className="text-xs text-zinc-400">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export const ClientLicensesTable = memo(ClientLicensesTableComponent);
