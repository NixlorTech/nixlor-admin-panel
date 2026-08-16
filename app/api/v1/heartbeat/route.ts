import { LicenseStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getNextPingJitter,
  HEARTBEAT_WRITE_INTERVAL_MS,
} from "@/lib/license-constants";
import { heartbeatJsonResponse } from "@/lib/heartbeat-response";

export const dynamic = "force-dynamic";

type HeartbeatBody = {
  clientId: string;
  module: string;
  hardwareId: string;
};

function shouldWriteHeartbeat(lastHeartbeatAt: Date | null, now: Date) {
  if (!lastHeartbeatAt) {
    return true;
  }

  return now.getTime() - lastHeartbeatAt.getTime() >= HEARTBEAT_WRITE_INTERVAL_MS;
}

export async function POST(request: Request) {
  let body: HeartbeatBody;
  try {
    body = (await request.json()) as HeartbeatBody;
  } catch {
    return heartbeatJsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { clientId, module, hardwareId } = body;

  if (!clientId || !module || !hardwareId?.trim()) {
    return heartbeatJsonResponse(
      { error: "clientId, module, and hardwareId are required" },
      400,
    );
  }

  const normalizedHardwareId = hardwareId.trim();
  const nextPingJitter = getNextPingJitter();

  const license = await prisma.license.findFirst({
    where: {
      clientId,
      softwareModule: {
        name: module.trim(),
      },
    },
    include: {
      softwareModule: true,
    },
  });

  if (!license) {
    return heartbeatJsonResponse({ status: "REVOKED", nextPingJitter }, 403);
  }

  const now = new Date();
  const isExpired = license.expiresAt < now;

  if (license.status === LicenseStatus.REVOKED || isExpired) {
    if (isExpired && license.status !== LicenseStatus.EXPIRED) {
      await prisma.license.update({
        where: { id: license.id },
        data: { status: LicenseStatus.EXPIRED },
      });
    }

    return heartbeatJsonResponse({ status: "REVOKED", nextPingJitter }, 403);
  }

  if (license.hardwareId && license.hardwareId !== normalizedHardwareId) {
    return heartbeatJsonResponse(
      { error: "HARDWARE_MISMATCH", nextPingJitter },
      403,
    );
  }

  const needsHardwareLock = !license.hardwareId;
  const needsHeartbeatWrite = shouldWriteHeartbeat(license.lastHeartbeatAt, now);

  let updatedLicense = license;

  if (needsHardwareLock || needsHeartbeatWrite) {
    updatedLicense = await prisma.license.update({
      where: { id: license.id },
      data: {
        ...(needsHardwareLock ? { hardwareId: normalizedHardwareId } : {}),
        ...(needsHeartbeatWrite ? { lastHeartbeatAt: now } : {}),
      },
      include: {
        softwareModule: true,
      },
    });
  }

  return heartbeatJsonResponse({
    status: "ACTIVE",
    expiresAt: updatedLicense.expiresAt.toISOString(),
    module: updatedLicense.softwareModule.name,
    hardwareLocked: Boolean(updatedLicense.hardwareId),
    nextPingJitter,
  });
}
