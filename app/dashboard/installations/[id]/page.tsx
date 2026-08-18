"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableContainer } from "@/components/dashboard/table-container";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInstallationDetailQuery } from "@/lib/hooks/use-installations";

function healthVariant(health: string) {
  if (health === "HEALTHY") return "success" as const;
  if (health === "RECENTLY_SEEN") return "secondary" as const;
  if (health === "OFFLINE") return "warning" as const;
  return "destructive" as const;
}

export default function InstallationDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useInstallationDetailQuery(params.id);

  if (isLoading || !data) {
    return <p className="text-muted">Loading installation…</p>;
  }

  const installation = data as {
    id: string;
    installationIdentifier: string;
    status: string;
    health: string;
    softwareVersion: string | null;
    schemaVersion: string | null;
    hardwareBinding: string | null;
    activatedAt: string | null;
    lastHeartbeatAt: string | null;
    heartbeatSequence: number;
    client: { id: string; businessName: string; contactEmail: string };
    partner: { name: string } | null;
    licenses: Array<{
      id: string;
      status: string;
      activationStatus: string;
      expiresAt: string;
      module: { code: string | null; name: string };
    }>;
    hardwareBindings: Array<{
      previousHardwareHash: string | null;
      newHardwareHash: string | null;
      reason: string | null;
      createdAt: string;
      actor: { email: string } | null;
    }>;
    events: Array<{
      eventType: string;
      source: string;
      createdAt: string;
      moduleName: string;
    }>;
    audits: Array<{ action: string; createdAt: string; actor: { email: string } | null }>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/dashboard/installations" className="hover:underline">
            Installations
          </Link>
        }
        title={installation.installationIdentifier}
        description={
          <span>
            <Link
              href={`/dashboard/clients/${installation.client.id}`}
              className="text-teal hover:underline"
            >
              {installation.client.businessName}
            </Link>
            {" · "}
            {installation.status}
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Health</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={healthVariant(installation.health)}>
              {installation.health}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Version</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Software: {installation.softwareVersion ?? "—"}</p>
            <p>Schema: {installation.schemaVersion ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Heartbeat</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              Last:{" "}
              {installation.lastHeartbeatAt
                ? new Date(installation.lastHeartbeatAt).toLocaleString("en-IN")
                : "—"}
            </p>
            <p>Sequence: {installation.heartbeatSequence}</p>
            <p>
              Activated:{" "}
              {installation.activatedAt
                ? new Date(installation.activatedAt).toLocaleString("en-IN")
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Partner</CardTitle>
          </CardHeader>
          <CardContent>{installation.partner?.name ?? "Direct"}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Hardware Binding</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {installation.hardwareBinding ?? "Not bound"}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Licenses</h2>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Activation</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installation.licenses.map((license) => (
                <TableRow key={license.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/licenses/${license.id}`}
                      className="text-teal hover:underline"
                    >
                      {license.module.name}
                    </Link>
                  </TableCell>
                  <TableCell>{license.status}</TableCell>
                  <TableCell>{license.activationStatus}</TableCell>
                  <TableCell>
                    {new Date(license.expiresAt).toLocaleDateString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

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
              {installation.hardwareBindings?.length ? (
                installation.hardwareBindings.map((record, index) => (
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
                    No hardware binding history.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">License Events</h2>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installation.events.map((event, index) => (
                <TableRow key={`${event.eventType}-${index}`}>
                  <TableCell>
                    <Badge variant="secondary">{event.eventType}</Badge>
                  </TableCell>
                  <TableCell>{event.moduleName}</TableCell>
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
        <h2 className="text-lg font-semibold">Audit Events</h2>
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
              {installation.audits.map((audit, index) => (
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
