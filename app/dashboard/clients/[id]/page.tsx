import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClientById,
  getClientTransactions,
  serializeLicense,
} from "@/lib/dashboard";
import { BillingHistoryTable } from "@/components/dashboard/billing-history-table";
import { ClientLicensesTable } from "@/components/dashboard/client-licenses-table";
import { GenerateLicenseTrigger } from "@/components/dashboard/generate-license-trigger";
import { PageHeader } from "@/components/dashboard/page-header";
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
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={
          <>
            <Link href="/dashboard/clients" className="hover:underline">
              Clients
            </Link>
            {" / "}
            {client.businessName}
          </>
        }
        title={client.businessName}
        description={client.contactEmail}
        action={<GenerateLicenseTrigger />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <span className="text-muted">None</span>
            )}
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Region</CardTitle>
          </CardHeader>
          <CardContent>{client.region ?? "—"}</CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold sm:text-xl">Active Licenses</h2>
          <p className="text-sm text-muted">
            Hardware-locked deployments and on-premises heartbeat status
          </p>
        </div>
        <ClientLicensesTable licenses={licenses} />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold sm:text-xl">
            Billing & Renewal History
          </h2>
          <p className="text-sm text-muted">
            Append-only ledger of all license issuances and renewals
          </p>
        </div>
        <BillingHistoryTable transactions={transactions} />
      </div>
    </div>
  );
}
