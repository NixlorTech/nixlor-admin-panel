import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await verifyAccess(PERMISSIONS.CLIENTS_READ);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      businessName: true,
    },
    orderBy: { businessName: "asc" },
  });

  return NextResponse.json(clients);
}
