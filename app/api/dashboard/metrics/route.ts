import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDashboardMetrics } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metrics = await getDashboardMetrics();
  return NextResponse.json(metrics);
}
