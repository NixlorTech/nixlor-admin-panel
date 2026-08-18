"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableContainer } from "@/components/dashboard/table-container";
import { ReasonConfirmDialog } from "@/components/dashboard/reason-confirm-dialog";
import { RenewLicenseDialog } from "@/components/dashboard/renew-license-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLicenseDetailQuery } from "@/lib/hooks/use-installations";
import {
  useLicenseStatusMutation,
  useRenewLicenseMutation,
  useResetHardwareMutation,
} from "@/lib/hooks/use-dashboard-mutations";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default function LicenseDetailPage() {
  const params = useParams<{ id: string }>();
  const licenseId = params.id;
  const { data: session } = useSession();
  const { data, isLoading, refetch } = useLicenseDetailQuery(licenseId);
  const resetHardware = useResetHardwareMutation();
  const renewLicense = useRenewLicenseMutation();
  const updateStatus = useLicenseStatusMutation();
  const [renewOpen, setRenewOpen] = useState(false);
  const [rebindOpen, setRebindOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const canRenew = hasPermission(session?.user.permissions, PERMISSIONS.LICENSES_RENEW);
  const canRevoke = hasPermission(session?.user.permissions, PERMISSIONS.LICENSES_REVOKE);
  const canRebind = hasPermission(
    session?.user.permissions,
    PERMISSIONS.LICENSES_REBIND_HARDWARE,
  );

  if (isLoading || !data) {
    return <p className="text-muted">Loading license…</p>;
  }

  const license = data as {
    id: string;
    status: string;
    activationStatus: string;
    validFrom: string;
    expiresAt: string;
    lastHeartbeatAt: string | null;
    hardwareId: string | null;
    rebindCount: number;
    revocationReason: string | null;
    client: { id: string; businessName: string };
    partner: { name: string } | null;
    module: { code: string | null; name: string };
    installation: {
      id: string;
      identifier: string;
      softwareVersion: string | null;
      lastHeartbeatAt: string | null;
      status: string;
    } | null;
    transactions: Array<{
      id: string;
      transactionType: string;
      amountPaid: number;
      commissionRate: number | null;
      commissionAmount: number | null;
      createdAt: string;
    }>;
    events: Array<{ eventType: string; createdAt: string; source: string }>;
    audits: Array<{ action: string; createdAt: string; actor: { email: string } | null }>;
    hardwareBindings: Array<{
      previousHardwareHash: string | null;
      newHardwareHash: string | null;
      reason: string | null;
      createdAt: string;
      actor: { email: string } | null;
    }>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/dashboard/clients/${license.client.id}`} className="hover:underline">
            {license.client.businessName}
          </Link>
        }
        title={`${license.module.name} License`}
        description={`Status: ${license.status} · Activation: ${license.activationStatus}`}
        action={
          <div className="flex flex-wrap gap-2">
            {canRenew && license.status !== "REVOKED" ? (
              <Button variant="outline" onClick={() => setRenewOpen(true)}>
                Renew
              </Button>
            ) : null}
            {canRevoke && license.status === "ACTIVE" ? (
              <Button variant="destructive" onClick={() => setRevokeOpen(true)}>
                Revoke
              </Button>
            ) : null}
            {canRevoke && license.status === "REVOKED" ? (
              <Button variant="outline" onClick={() => setReactivateOpen(true)}>
                Reactivate
              </Button>
            ) : null}
            {canRebind && license.hardwareId ? (
              <Button variant="outline" onClick={() => setRebindOpen(true)}>
                Rebind Hardware
              </Button>
            ) : null}
          </div>
        }
      />

      <RenewLicenseDialog
        open={renewOpen}
        onOpenChange={setRenewOpen}
        isPending={renewLicense.isPending}
        onConfirm={async (input) => {
          await renewLicense.mutateAsync({ licenseId: license.id, ...input });
          await refetch();
        }}
      />

      <ReasonConfirmDialog
        open={rebindOpen}
        onOpenChange={setRebindOpen}
        title="Rebind Hardware"
        description="Reset hardware binding for a server replacement or reinstall. This action is audited."
        reasonLabel="Rebind reason"
        confirmLabel="Rebind Hardware"
        isPending={resetHardware.isPending}
        onConfirm={async (reason) => {
          await resetHardware.mutateAsync({ licenseId: license.id, reason });
          await refetch();
        }}
      />

      <ReasonConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revoke License"
        description="This will immediately deny heartbeat and activation for this license."
        reasonLabel="Revocation reason"
        confirmLabel="Revoke License"
        destructive
        isPending={updateStatus.isPending}
        onConfirm={async () => {
          await updateStatus.mutateAsync({ licenseId: license.id, status: "REVOKED" });
          await refetch();
        }}
      />

      <ReasonConfirmDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        title="Reactivate License"
        description="Restore this license to ACTIVE status."
        reasonLabel="Reactivation reason"
        confirmLabel="Reactivate"
        isPending={updateStatus.isPending}
        onConfirm={async () => {
          await updateStatus.mutateAsync({ licenseId: license.id, status: "ACTIVE" });
          await refetch();
        }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Validity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>From: {new Date(license.validFrom).toLocaleDateString("en-IN")}</p>
            <p>Expires: {new Date(license.expiresAt).toLocaleDateString("en-IN")}</p>
            <p>
              Last heartbeat:{" "}
              {license.lastHeartbeatAt
                ? new Date(license.lastHeartbeatAt).toLocaleString("en-IN")
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Installation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {license.installation ? (
              <>
                <Link
                  href={`/dashboard/installations/${license.installation.id}`}
                  className="text-teal hover:underline"
                >
                  {license.installation.identifier}
                </Link>
                <p className="text-muted">
                  v{license.installation.softwareVersion ?? "unknown"} ·{" "}
                  {license.installation.status}
                </p>
              </>
            ) : (
              "—"
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hardware</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Binding: {license.hardwareId ?? "Not bound"}</p>
            <p>Rebinds: {license.rebindCount}</p>
            {license.revocationReason ? (
              <p className="text-red-600">Revoked: {license.revocationReason}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Hardware Binding History</h2>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Previous</TableHead>
                <TableHead>New</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {license.hardwareBindings?.length ? (
                license.hardwareBindings.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">
                      {record.previousHardwareHash?.slice(0, 12) ?? "—"}…
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {record.newHardwareHash?.slice(0, 12) ?? "cleared"}…
                    </TableCell>
                    <TableCell>{record.reason ?? "—"}</TableCell>
                    <TableCell>{record.actor?.email ?? "system"}</TableCell>
                    <TableCell>
                      {new Date(record.createdAt).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted">
                    No hardware rebind history.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Transactions</h2>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {license.transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{tx.transactionType}</TableCell>
                  <TableCell>₹{tx.amountPaid.toLocaleString("en-IN")}</TableCell>
                  <TableCell>
                    {tx.commissionAmount != null
                      ? `₹${tx.commissionAmount.toLocaleString("en-IN")} (${tx.commissionRate}%)`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {new Date(tx.createdAt).toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Events</h2>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {license.events.map((event, index) => (
                <TableRow key={`${event.eventType}-${index}`}>
                  <TableCell>
                    <Badge variant="secondary">{event.eventType}</Badge>
                  </TableCell>
                  <TableCell>{event.source}</TableCell>
                  <TableCell>
                    {new Date(event.createdAt).toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Audit</h2>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {license.audits.map((audit, index) => (
                <TableRow key={`${audit.action}-${index}`}>
                  <TableCell>{audit.action}</TableCell>
                  <TableCell>{audit.actor?.email ?? "system"}</TableCell>
                  <TableCell>
                    {new Date(audit.createdAt).toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </section>
    </div>
  );
}
