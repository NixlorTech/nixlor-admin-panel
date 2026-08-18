import type { LicenseEventType, Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { JsonValue } from "@/lib/server/security";

type RecordLicenseEventInput = {
  licenseId: string;
  eventType: LicenseEventType;
  installationId?: string | null;
  actorId?: string | null;
  source?: string;
  metadata?: JsonValue;
};

export async function recordLicenseEvent(
  input: RecordLicenseEventInput,
  tx: Prisma.TransactionClient = prisma,
) {
  return tx.licenseEvent.create({
    data: {
      licenseId: input.licenseId,
      installationId: input.installationId ?? null,
      eventType: input.eventType,
      actorId: input.actorId ?? null,
      source: input.source ?? "system",
      metadata: input.metadata,
    },
  });
}

export async function getLicenseEvents(licenseId: string, limit = 50) {
  return prisma.licenseEvent.findMany({
    where: { licenseId },
    include: {
      actor: { select: { id: true, email: true, name: true } },
      installation: {
        select: { id: true, installationIdentifier: true, hostname: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
