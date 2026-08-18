import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashHardwareId } from "@/lib/server/security";
import { recordLicenseEvent } from "@/lib/services/license-events";

type RebindHardwareInput = {
  licenseId: string;
  installationId?: string | null;
  reason: string;
  actorId: string;
};

export async function rebindHardware(
  input: RebindHardwareInput,
  tx: Prisma.TransactionClient = prisma,
) {
  const license = await tx.license.findUnique({
    where: { id: input.licenseId },
    include: { installation: true },
  });

  if (!license) {
    throw new Error("LICENSE_NOT_FOUND");
  }

  const previousHardwareHash = license.hardwareId
    ? hashHardwareId(license.hardwareId)
    : license.installation?.hardwareBinding ?? null;

  const updated = await tx.license.update({
    where: { id: license.id },
    data: {
      hardwareId: null,
      rebindCount: { increment: 1 },
    },
    include: { softwareModule: true, installation: true },
  });

  if (license.installationId) {
    await tx.installation.update({
      where: { id: license.installationId },
      data: {
        hardwareBinding: null,
        hardwareBindingVersion: { increment: 1 },
        status: "ACTIVE",
      },
    });
  }

  await tx.hardwareBindingRecord.create({
    data: {
      licenseId: license.id,
      installationId: input.installationId ?? license.installationId,
      previousHardwareHash,
      newHardwareHash: null,
      reason: input.reason.trim(),
      actorId: input.actorId,
    },
  });

  await recordLicenseEvent(
    {
      licenseId: license.id,
      installationId: license.installationId,
      eventType: "HARDWARE_REBOUND",
      actorId: input.actorId,
      source: "admin",
      metadata: { reason: input.reason.trim() },
    },
    tx,
  );

  return updated;
}
