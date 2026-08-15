import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClientById,
  getClientTransactions,
  serializeLicense,
} from "@/lib/dashboard";
import { BillingHistoryTable } from "@/components/dashboard/billing-history-table";
import { GenerateLicenseTrigger } from "@/components/dashboard/generate-license-trigger";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getClientLicenseStatus,
  getActiveModules,
} from "@/lib/license-status";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientById(id);

  if (!client) {
    notFound();
  }

  const licenses = client.licenses.map(serializeLicense);
  const transactions = getClientTransactions(client);
  const status = getClientLicenseStatus(licenses);
  const activeModules = getActiveModules(licenses);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            <Link href="/dashboard/clients" className="hover:underline">
              Clients
            </Link>
            {" / "}
            {client.businessName}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {client.businessName}
          </h1>
          <p className="text-zinc-500">{client.contactEmail}</p>
        </div>
        <GenerateLicenseTrigger />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">License Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                status === "active"
                  ? "success"
                  : status === "expiring"
                    ? "warning"
                    : "destructive"
              }
            >
              {status === "active"
                ? "Active"
                : status === "expiring"
                  ? "Expiring Soon"
                  : "Revoked"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Modules</CardTitle>
          </CardHeader>
          <CardContent>
            {activeModules.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {activeModules.map((module) => (
                  <Badge key={module} variant="secondary">
                    {module}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-zinc-400">None</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Region</CardTitle>
          </CardHeader>
          <CardContent>{client.region ?? "—"}</CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Billing & Renewal History</h2>
          <p className="text-sm text-zinc-500">
            Append-only ledger of all license issuances and renewals
          </p>
        </div>
        <BillingHistoryTable transactions={transactions} />
      </div>
    </div>
  );
}
