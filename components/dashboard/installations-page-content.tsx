"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { TableContainer } from "@/components/dashboard/table-container";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInstallationsQuery } from "@/lib/hooks/use-installations";
import { useClientOptionsQuery } from "@/lib/hooks/use-clients";
import { useActivePartnersQuery } from "@/lib/hooks/use-partners";
import { useActiveModulesQuery } from "@/lib/hooks/use-modules";
import { usePaginationState } from "@/lib/hooks/use-pagination";

const ALL_FILTER = "__all__";

function healthVariant(health: string) {
  if (health === "HEALTHY") return "success" as const;
  if (health === "RECENTLY_SEEN") return "secondary" as const;
  if (health === "OFFLINE") return "warning" as const;
  return "destructive" as const;
}

export function InstallationsPageContent() {
  const { search, setSearch } = usePaginationState();
  const [clientId, setClientId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [status, setStatus] = useState("");

  const filters = {
    search: search || undefined,
    clientId: clientId || undefined,
    partnerId: partnerId || undefined,
    moduleId: moduleId || undefined,
    status: status || undefined,
  };

  const { data: installations = [], isLoading } = useInstallationsQuery(
    undefined,
    filters,
  );
  const { data: clients = [] } = useClientOptionsQuery(true);
  const { data: partners = [] } = useActivePartnersQuery(true);
  const { data: modules = [] } = useActiveModulesQuery(true);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Installations"
        description="On-premise deployment health, versions, and license bindings"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label>Search</Label>
          <Input
            placeholder="Identifier, hostname, client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Client</Label>
          <Select
            value={clientId || ALL_FILTER}
            onValueChange={(v) => setClientId(v === ALL_FILTER ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Partner</Label>
          <Select
            value={partnerId || ALL_FILTER}
            onValueChange={(v) => setPartnerId(v === ALL_FILTER ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All partners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All partners</SelectItem>
              {partners.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Module</Label>
          <Select
            value={moduleId || ALL_FILTER}
            onValueChange={(v) => setModuleId(v === ALL_FILTER ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All modules</SelectItem>
              {modules.map((mod) => (
                <SelectItem key={mod.id} value={mod.id}>
                  {mod.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status || ALL_FILTER}
            onValueChange={(v) => setStatus(v === ALL_FILTER ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All statuses</SelectItem>
              {["ACTIVE", "OFFLINE", "MISMATCH", "DISABLED"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TableContainer>
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Identifier</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Last Heartbeat</TableHead>
              <TableHead>Licenses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted">
                  Loading installations…
                </TableCell>
              </TableRow>
            ) : installations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted">
                  No installations found.
                </TableCell>
              </TableRow>
            ) : (
              installations.map((installation) => (
                <TableRow key={installation.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/clients/${installation.clientId}`}
                      className="font-medium text-teal hover:underline"
                    >
                      {installation.clientName ?? installation.clientId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/installations/${installation.id}`}
                      className="hover:underline"
                    >
                      {installation.installationIdentifier}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={healthVariant(installation.health)}>
                      {installation.health}
                    </Badge>
                  </TableCell>
                  <TableCell>{installation.softwareVersion ?? "—"}</TableCell>
                  <TableCell>
                    {installation.lastHeartbeatAt
                      ? new Date(installation.lastHeartbeatAt).toLocaleString("en-IN")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {installation.licenses.map((license) => (
                      <Link
                        key={license.id}
                        href={`/dashboard/licenses/${license.id}`}
                        className="mr-2 text-sm text-teal hover:underline"
                      >
                        {license.moduleName}
                      </Link>
                    ))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
