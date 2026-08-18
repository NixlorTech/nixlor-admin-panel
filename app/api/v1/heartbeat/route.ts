import {
  ActivationStatus,
  InstallationStatus,
  LicenseStatus,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getHeartbeatSequenceMode,
  getNextPingJitter,
  HEARTBEAT_WRITE_INTERVAL_MS,
} from "@/lib/license-constants";
import { heartbeatJsonResponse } from "@/lib/heartbeat-response";
import { hashHardwareId } from "@/lib/server/security";
import { recordLicenseEvent } from "@/lib/services/license-events";
import { touchInstallationHeartbeat } from "@/lib/services/installations";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { heartbeatSchema, parseJsonBody } from "@/lib/validations";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8_192;

function shouldWriteHeartbeat(lastHeartbeatAt: Date | null, now: Date) {
  if (!lastHeartbeatAt) {
    return true;
  }
  return now.getTime() - lastHeartbeatAt.getTime() >= HEARTBEAT_WRITE_INTERVAL_MS;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return heartbeatJsonResponse(
      { error: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json" },
      415,
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return heartbeatJsonResponse(
      { error: "PAYLOAD_TOO_LARGE", message: "Request body too large" },
      413,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return heartbeatJsonResponse(
      { error: "INVALID_JSON", message: "Invalid JSON body" },
      400,
    );
  }

  const parsed = parseJsonBody(heartbeatSchema, json);
  if (!parsed.success) {
    return heartbeatJsonResponse(
      { error: "VALIDATION_ERROR", message: parsed.message },
      400,
    );
  }

  const body = parsed.data;
  const sequenceMode = getHeartbeatSequenceMode();
  const nextPingJitter = getNextPingJitter();

  if (sequenceMode === "SEQUENCE_REQUIRED" && body.sequence === undefined) {
    return heartbeatJsonResponse(
      {
        error: "SEQUENCE_REQUIRED",
        message: "Heartbeat sequence is required",
        sequenceMode,
        nextPingJitter,
      },
      400,
    );
  }
  const now = new Date();
  const normalizedHardwareId = body.hardwareId;
  const hardwareHash = hashHardwareId(normalizedHardwareId);

  const rateKey = `heartbeat:${body.clientId}:${body.installationId}`;
  const rate = await checkRateLimit(rateKey);
  if (!rate.allowed) {
    return heartbeatJsonResponse(
      {
        error: "RATE_LIMITED",
        message: "Too many heartbeat requests",
        retryAfterSeconds: rate.retryAfterSeconds,
        nextPingJitter,
      },
      429,
      { "Retry-After": String(rate.retryAfterSeconds ?? 60) },
    );
  }

  const installation = await prisma.installation.findFirst({
    where: {
      id: body.installationId,
      clientId: body.clientId,
    },
    include: {
      licenses: {
        include: { softwareModule: true },
      },
    },
  });

  if (!installation) {
    return heartbeatJsonResponse(
      { error: "INSTALLATION_NOT_FOUND", message: "Request denied", nextPingJitter },
      403,
    );
  }

  const license = installation.licenses.find(
    (entry) =>
      entry.softwareModule.code === body.module ||
      entry.softwareModule.name === body.module,
  );

  if (!license) {
    return heartbeatJsonResponse(
      { error: "LICENSE_NOT_FOUND", message: "Request denied", nextPingJitter },
      403,
    );
  }

  if (body.sequence !== undefined) {
    const lastSeq = Number(installation.heartbeatSequence);
    if (body.sequence <= lastSeq) {
      return heartbeatJsonResponse(
        {
          error: "STALE_REQUEST",
          message: "Request denied",
          nextPingJitter,
          serverSequence: lastSeq,
        },
        409,
      );
    }
  }

  const isExpired = license.expiresAt < now;

  if (license.status === LicenseStatus.REVOKED || isExpired) {
    if (isExpired && license.status !== LicenseStatus.EXPIRED) {
      await prisma.license.update({
        where: { id: license.id },
        data: { status: LicenseStatus.EXPIRED },
      });
      await recordLicenseEvent({
        licenseId: license.id,
        installationId: installation.id,
        eventType: "EXPIRED",
        source: "heartbeat",
      });
    }

    return heartbeatJsonResponse(
      { status: "REVOKED", message: "Request denied", nextPingJitter },
      403,
    );
  }

  const boundHardware =
    license.hardwareId ?? installation.hardwareBinding ?? null;
  const boundHash = boundHardware
    ? boundHardware.length === 64
      ? boundHardware
      : hashHardwareId(boundHardware)
    : null;

  if (boundHash && boundHash !== hardwareHash) {
    await recordLicenseEvent({
      licenseId: license.id,
      installationId: installation.id,
      eventType: "HARDWARE_MISMATCH",
      source: "heartbeat",
    });

    await prisma.installation.update({
      where: { id: installation.id },
      data: { status: InstallationStatus.MISMATCH },
    });

    return heartbeatJsonResponse(
      { error: "HARDWARE_MISMATCH", message: "Request denied", nextPingJitter },
      403,
    );
  }

  const needsHardwareLock = !boundHash;
  const needsHeartbeatWrite = shouldWriteHeartbeat(license.lastHeartbeatAt, now);
  const isFirstActivation =
    license.activationStatus !== ActivationStatus.ACTIVATED;

  let updatedLicense = license;

  if (needsHardwareLock || needsHeartbeatWrite || isFirstActivation || body.sequence !== undefined) {
    updatedLicense = await prisma.$transaction(async (tx) => {
      const updated = await tx.license.update({
        where: { id: license.id },
        data: {
          ...(needsHardwareLock ? { hardwareId: normalizedHardwareId } : {}),
          ...(needsHeartbeatWrite ? { lastHeartbeatAt: now } : {}),
          ...(isFirstActivation
            ? {
                activationStatus: ActivationStatus.ACTIVATED,
                activatedAt: now,
              }
            : {}),
          installationId: installation.id,
          clientId: body.clientId,
        },
        include: { softwareModule: true },
      });

      await touchInstallationHeartbeat(
        installation.id,
        {
          hardwareId: normalizedHardwareId,
          softwareVersion: body.softwareVersion,
          schemaVersion: body.schemaVersion,
        },
        tx,
      );

      if (body.sequence !== undefined) {
        await tx.installation.update({
          where: { id: installation.id },
          data: { heartbeatSequence: BigInt(body.sequence) },
        });
      }

      if (needsHardwareLock) {
        await recordLicenseEvent(
          {
            licenseId: license.id,
            installationId: installation.id,
            eventType: "HARDWARE_BOUND",
            source: "heartbeat",
            metadata: { hardwareHash },
          },
          tx,
        );
      }

      if (isFirstActivation) {
        await recordLicenseEvent(
          {
            licenseId: license.id,
            installationId: installation.id,
            eventType: "ACTIVATED",
            source: "heartbeat",
          },
          tx,
        );
      } else if (needsHeartbeatWrite) {
        await recordLicenseEvent(
          {
            licenseId: license.id,
            installationId: installation.id,
            eventType: "HEARTBEAT_OK",
            source: "heartbeat",
            metadata: {
              softwareVersion: body.softwareVersion,
              schemaVersion: body.schemaVersion,
            },
          },
          tx,
        );
      }

      return updated;
    });
  }

  return heartbeatJsonResponse({
    status: "ACTIVE",
    expiresAt: updatedLicense.expiresAt.toISOString(),
    module: updatedLicense.softwareModule.code ?? updatedLicense.softwareModule.name,
    installationId: installation.id,
    hardwareLocked: Boolean(updatedLicense.hardwareId ?? installation.hardwareBinding),
    serverTime: now.toISOString(),
    serverSequence: body.sequence ?? Number(installation.heartbeatSequence),
    nextPingJitter,
  });
}
