import { NextResponse } from "next/server";
import { LicenseStatus, RevocationReason } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/server/api-response";
import { createRequestId } from "@/lib/server/security";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";
import { createAuditLog } from "@/lib/services/audit-log";
import { recordLicenseEvent } from "@/lib/services/license-events";

export const dynamic = "force-dynamic";

type UpdateStatusBody = {
  status: LicenseStatus;
  revocationReason?: RevocationReason;
  revocationNotes?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await verifyAccess(PERMISSIONS.LICENSES_REVOKE);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const { id } = await context.params;
  const requestId = createRequestId();

  let body: UpdateStatusBody;
  try {
    body = (await request.json()) as UpdateStatusBody;
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  if (!Object.values(LicenseStatus).includes(body.status)) {
    return apiError("VALIDATION_ERROR", "Invalid status", 400);
  }

  if (
    body.status === LicenseStatus.REVOKED &&
    body.revocationReason &&
    !Object.values(RevocationReason).includes(body.revocationReason)
  ) {
    return apiError("VALIDATION_ERROR", "Invalid revocation reason", 400);
  }

  const license = await prisma.license.findUnique({ where: { id } });
  if (!license) {
    return apiError("NOT_FOUND", "License not found", 404);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.license.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.status === LicenseStatus.REVOKED
          ? {
              revocationReason: body.revocationReason ?? RevocationReason.ADMIN_ACTION,
              revocationNotes: body.revocationNotes?.trim() || null,
            }
          : {
              revocationReason: null,
              revocationNotes: null,
            }),
      },
    });

    await recordLicenseEvent(
      {
        licenseId: id,
        installationId: license.installationId,
        eventType:
          body.status === LicenseStatus.REVOKED
            ? "REVOKED"
            : body.status === LicenseStatus.ACTIVE
              ? "REACTIVATED"
              : "EXPIRED",
        actorId: access.user.id,
        source: "admin",
        metadata: {
          revocationReason: body.revocationReason,
          revocationNotes: body.revocationNotes,
        },
      },
      tx,
    );

    await createAuditLog(
      {
        action:
          body.status === LicenseStatus.REVOKED
            ? "REVOKE_LICENSE"
            : "REACTIVATE_LICENSE",
        entityType: "License",
        entityId: id,
        before: {
          status: license.status,
          revocationReason: license.revocationReason,
        },
        after: {
          status: result.status,
          revocationReason: result.revocationReason,
        },
        context: { actorId: access.user.id, requestId },
      },
      tx,
    );

    return result;
  });

  return NextResponse.json(updated);
}
