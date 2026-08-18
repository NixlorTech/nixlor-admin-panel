"use client";

import Link from "next/link";
import { memo, useCallback, useState } from "react";
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
import { ReasonConfirmDialog } from "@/components/dashboard/reason-confirm-dialog";
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
  const [rebindLicenseId, setRebindLicenseId] = useState<string | null>(null);

  const activeLicenses = licenses.filter(
    (license) =>
      license.status === "ACTIVE" && new Date(license.expiresAt) > new Date(),
  );

  const handleRebind = useCallback((licenseId: string) => {
    setRebindLicenseId(licenseId);
  }, []);

  if (activeLicenses.length === 0) {
    return (
      <p className="text-sm text-muted">No active licenses for this client.</p>
    );
  }

  return (
    <>
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
                <TableCell className="font-medium">
                  <Link
                    href={`/dashboard/licenses/${license.id}`}
                    className="text-teal hover:underline"
                  >
                    {license.moduleName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="success">Active</Badge>
                </TableCell>
                <TableCell>
                  {new Date(license.expiresAt).toLocaleDateString("en-IN")}
                </TableCell>
                <TableCell>
                  {license.hardwareId ? (
                    <code className="rounded bg-cyan/10 px-2 py-1 text-xs">
                      {truncateHardwareId(license.hardwareId)}
                    </code>
                  ) : (
                    <span className="text-muted">Unlocked</span>
                  )}
                </TableCell>
                <TableCell>
                  {license.hardwareId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={resetHardwareMutation.isPending}
                      onClick={() => handleRebind(license.id)}
                    >
                      Reset Hardware
                    </Button>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ReasonConfirmDialog
        open={Boolean(rebindLicenseId)}
        onOpenChange={(open) => {
          if (!open) setRebindLicenseId(null);
        }}
        title="Rebind Hardware"
        description="Reset hardware binding for a server replacement or reinstall."
        reasonLabel="Rebind reason"
        confirmLabel="Rebind Hardware"
        isPending={resetHardwareMutation.isPending}
        onConfirm={async (reason) => {
          if (!rebindLicenseId) return;
          await resetHardwareMutation.mutateAsync({
            licenseId: rebindLicenseId,
            reason,
          });
          setRebindLicenseId(null);
        }}
      />
    </>
  );
}

export const ClientLicensesTable = memo(ClientLicensesTableComponent);
