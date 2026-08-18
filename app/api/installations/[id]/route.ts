import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/server/api-response";
import { resolveEntityAuditsForUser } from "@/lib/server/audit-access";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";
import { deriveInstallationHealth } from "@/lib/services/installations";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await verifyAccess(PERMISSIONS.INSTALLATIONS_READ);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const { id } = await context.params;

  const installation = await prisma.installation.findUnique({
    where: { id },
    include: {
      client: { include: { alliancePartner: true } },
      licenses: {
        include: {
          softwareModule: true,
          transactions: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      },
      hardwareBindingLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { actor: { select: { email: true, name: true } } },
      },
    },
  });

  if (!installation) {
    return apiError("NOT_FOUND", "Installation not found", 404);
  }

  const events = await prisma.licenseEvent.findMany({
    where: { installationId: id },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: {
      license: { include: { softwareModule: true } },
      actor: { select: { email: true, name: true } },
    },
  });

  const audits = await resolveEntityAuditsForUser(
    access.user,
    "Installation",
    id,
  );

  return NextResponse.json({
    id: installation.id,
    installationIdentifier: installation.installationIdentifier,
    status: installation.status,
    environment: installation.environment,
    hostname: installation.hostname,
    softwareVersion: installation.softwareVersion,
    schemaVersion: installation.schemaVersion,
    hardwareBinding: installation.hardwareBinding
      ? `${installation.hardwareBinding.slice(0, 8)}…`
      : null,
    activatedAt: installation.activatedAt?.toISOString() ?? null,
    lastHeartbeatAt: installation.lastHeartbeatAt?.toISOString() ?? null,
    heartbeatSequence: Number(installation.heartbeatSequence),
    health: deriveInstallationHealth(installation),
    client: {
      id: installation.client.id,
      businessName: installation.client.businessName,
      contactEmail: installation.client.contactEmail,
    },
    partner: installation.client.alliancePartner
      ? {
          id: installation.client.alliancePartner.id,
          name: installation.client.alliancePartner.name,
        }
      : null,
    licenses: installation.licenses.map((license) => ({
      id: license.id,
      status: license.status,
      activationStatus: license.activationStatus,
      expiresAt: license.expiresAt.toISOString(),
      module: {
        code: license.softwareModule.code,
        name: license.softwareModule.name,
      },
    })),
    hardwareBindings: installation.hardwareBindingLogs,
    events: events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      source: event.source,
      createdAt: event.createdAt.toISOString(),
      moduleName: event.license.softwareModule.name,
      actor: event.actor,
    })),
    audits,
  });
}
