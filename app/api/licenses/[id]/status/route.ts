import { NextResponse } from "next/server";
import { LicenseStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";

export const dynamic = "force-dynamic";

type UpdateStatusBody = {
  status: LicenseStatus;
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

  let body: UpdateStatusBody;
  try {
    body = (await request.json()) as UpdateStatusBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Object.values(LicenseStatus).includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const license = await prisma.license.findUnique({ where: { id } });
  if (!license) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }

  const updated = await prisma.license.update({
    where: { id },
    data: { status: body.status },
  });

  return NextResponse.json(updated);
}
