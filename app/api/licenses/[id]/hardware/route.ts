import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await verifyAccess(PERMISSIONS.LICENSES_GENERATE);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const { id } = await params;

  const license = await prisma.license.findUnique({ where: { id } });
  if (!license) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }

  const updated = await prisma.license.update({
    where: { id },
    data: { hardwareId: null },
    include: {
      softwareModule: true,
    },
  });

  return NextResponse.json({
    id: updated.id,
    hardwareId: updated.hardwareId,
    moduleName: updated.softwareModule.name,
  });
}
