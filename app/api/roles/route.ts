import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  adminRoleInclude,
  serializeAdminRole,
} from "@/lib/admin-users";
import { PERMISSIONS } from "@/lib/permissions";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await verifyAccess(PERMISSIONS.USERS_READ);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const roles = await prisma.adminRole.findMany({
    include: adminRoleInclude,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(roles.map(serializeAdminRole));
}
