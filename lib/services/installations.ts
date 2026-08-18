import type {
  InstallationStatus,
  Prisma,
} from "@/lib/generated/prisma/client";
import { InstallationStatus as InstallationStatusEnum } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashHardwareId } from "@/lib/server/security";

type CreateInstallationInput = {
  clientId: string;
  installationIdentifier: string;
  environment?: string | null;
  hostname?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function createInstallation(
  input: CreateInstallationInput,
  tx: Prisma.TransactionClient = prisma,
) {
  return tx.installation.create({
    data: {
      clientId: input.clientId,
      installationIdentifier: input.installationIdentifier.trim(),
      environment: input.environment?.trim() || null,
      hostname: input.hostname?.trim() || null,
      metadata: input.metadata,
      status: InstallationStatusEnum.ACTIVE,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    },
  });
}

export function deriveInstallationHealth(
  installation: {
    status: InstallationStatus;
    lastHeartbeatAt: Date | null;
    hardwareBinding: string | null;
  },
  offlineThresholdMs = 48 * 60 * 60 * 1000,
): "HEALTHY" | "RECENTLY_SEEN" | "OFFLINE" | "MISMATCH" | "DISABLED" {
  if (installation.status === InstallationStatusEnum.DISABLED) {
    return "DISABLED";
  }

  if (installation.status === InstallationStatusEnum.MISMATCH) {
    return "MISMATCH";
  }

  if (!installation.lastHeartbeatAt) {
    return "OFFLINE";
  }

  const elapsed = Date.now() - installation.lastHeartbeatAt.getTime();
  if (elapsed > offlineThresholdMs) {
    return "OFFLINE";
  }

  if (elapsed > offlineThresholdMs / 2) {
    return "RECENTLY_SEEN";
  }

  return "HEALTHY";
}

export async function touchInstallationHeartbeat(
  installationId: string,
  data: {
    hardwareId?: string;
    softwareVersion?: string;
    schemaVersion?: string;
  },
  tx: Prisma.TransactionClient = prisma,
) {
  const now = new Date();
  const hardwareBinding = data.hardwareId
    ? hashHardwareId(data.hardwareId)
    : undefined;

  return tx.installation.update({
    where: { id: installationId },
    data: {
      lastHeartbeatAt: now,
      lastSeenAt: now,
      ...(hardwareBinding ? { hardwareBinding } : {}),
      ...(data.softwareVersion ? { softwareVersion: data.softwareVersion } : {}),
      ...(data.schemaVersion ? { schemaVersion: data.schemaVersion } : {}),
      status: InstallationStatusEnum.ACTIVE,
    },
  });
}
