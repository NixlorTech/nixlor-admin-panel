import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/server/api-response";
import { resolveEntityAuditsForUser } from "@/lib/server/audit-access";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";
import { getLicenseEvents } from "@/lib/services/license-events";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await verifyAccess(PERMISSIONS.CLIENTS_READ);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const { id } = await context.params;

  const license = await prisma.license.findUnique({
    where: { id },
    include: {
      client: { include: { alliancePartner: true } },
      installation: true,
      softwareModule: true,
      transactions: {
        include: { alliancePartner: true },
        orderBy: { createdAt: "desc" },
      },
      hardwareBindings: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { actor: { select: { email: true, name: true } } },
      },
    },
  });

  if (!license) {
    return apiError("NOT_FOUND", "License not found", 404);
  }

  const events = await getLicenseEvents(id, 25);

  const audits = await resolveEntityAuditsForUser(access.user, "License", id);

  return NextResponse.json({
    id: license.id,
    status: license.status,
    activationStatus: license.activationStatus,
    validFrom: license.validFrom.toISOString(),
    expiresAt: license.expiresAt.toISOString(),
    activatedAt: license.activatedAt?.toISOString() ?? null,
    lastHeartbeatAt: license.lastHeartbeatAt?.toISOString() ?? null,
    hardwareId: license.hardwareId
      ? `${license.hardwareId.slice(0, 8)}…`
      : null,
    rebindCount: license.rebindCount,
    revocationReason: license.revocationReason,
    revocationNotes: license.revocationNotes,
    client: {
      id: license.client.id,
      businessName: license.client.businessName,
      contactEmail: license.client.contactEmail,
    },
    partner: license.client.alliancePartner
      ? {
          id: license.client.alliancePartner.id,
          name: license.client.alliancePartner.name,
        }
      : null,
    module: {
      id: license.softwareModule.id,
      code: license.softwareModule.code,
      name: license.softwareModule.name,
    },
    installation: license.installation
      ? {
          id: license.installation.id,
          identifier: license.installation.installationIdentifier,
          hostname: license.installation.hostname,
          softwareVersion: license.installation.softwareVersion,
          schemaVersion: license.installation.schemaVersion,
          lastHeartbeatAt:
            license.installation.lastHeartbeatAt?.toISOString() ?? null,
          status: license.installation.status,
        }
      : null,
    transactions: license.transactions.map((t) => ({
      id: t.id,
      transactionType: t.transactionType,
      amountPaid: t.amountPaid,
      commissionRate: t.commissionRate,
      commissionAmount: t.commissionAmount,
      createdAt: t.createdAt.toISOString(),
    })),
    hardwareBindings: license.hardwareBindings,
    events: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      source: e.source,
      createdAt: e.createdAt.toISOString(),
      actor: e.actor,
    })),
    audits,
  });
}
