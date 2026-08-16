import { NextResponse } from "next/server";
import { getDashboardMetrics } from "@/lib/dashboard";
import { PERMISSIONS } from "@/lib/permissions";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await verifyAccess(PERMISSIONS.DASHBOARD_READ);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const metrics = await getDashboardMetrics();
  return NextResponse.json(metrics);
}
