import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/server/api-response";
import { createRequestId } from "@/lib/server/security";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";
import { createAuditLog } from "@/lib/services/audit-log";
import { rebindHardware } from "@/lib/services/hardware-binding";

export const dynamic = "force-dynamic";

type RebindBody = {
  reason: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await verifyAccess(PERMISSIONS.LICENSES_REBIND_HARDWARE);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const { id } = await params;

  let body: RebindBody;
  try {
    body = (await request.json()) as RebindBody;
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  if (!body.reason?.trim()) {
    return apiError("VALIDATION_ERROR", "reason is required for hardware rebind", 400);
  }

  const license = await prisma.license.findUnique({ where: { id } });
  if (!license) {
    return apiError("NOT_FOUND", "License not found", 404);
  }

  const requestId = createRequestId();

  const updated = await prisma.$transaction(async (tx) => {
    const result = await rebindHardware(
      {
        licenseId: id,
        reason: body.reason.trim(),
        actorId: access.user.id,
      },
      tx,
    );

    await createAuditLog(
      {
        action: "REBIND_HARDWARE",
        entityType: "License",
        entityId: id,
        before: {
          hardwareId: license.hardwareId,
          rebindCount: license.rebindCount,
        },
        after: { hardwareId: null, rebindCount: license.rebindCount + 1 },
        metadata: { reason: body.reason.trim() },
        context: { actorId: access.user.id, requestId },
      },
      tx,
    );

    return result;
  });

  return NextResponse.json({
    id: updated.id,
    hardwareId: updated.hardwareId,
    rebindCount: updated.rebindCount,
    moduleCode: updated.softwareModule.code,
    moduleName: updated.softwareModule.name,
    installationId: updated.installationId,
  });
}
